package urbanscan

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

const placesNearbyBase = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

type nearbyPlace struct {
	PlaceID        string   `json:"placeId"`
	Name           string   `json:"name"`
	Types          []string `json:"types"`
	Vicinity       string   `json:"vicinity,omitempty"`
	BusinessStatus string   `json:"businessStatus,omitempty"`
}

type placesNearbyResponse struct {
	Status       string `json:"status"`
	ErrorMessage string `json:"error_message"`
	Results      []struct {
		PlaceID        string   `json:"place_id"`
		Name           string   `json:"name"`
		Types          []string `json:"types"`
		Vicinity       string   `json:"vicinity"`
		BusinessStatus string   `json:"business_status"`
	} `json:"results"`
}

type placeCategoryConfig struct {
	Types    []string
	Keywords []string
}

var categoryPlacesQuery = map[model.EntrepreneurVertical]placeCategoryConfig{
	model.VerticalPharmacy: {
		Types:    []string{"pharmacy"},
		Keywords: []string{"eczane", "pharmacy"},
	},
	model.VerticalGrocery: {
		Types:    []string{"supermarket", "grocery_or_supermarket", "convenience_store"},
		Keywords: []string{"migros", "bim", "a101", "carrefour", "market", "supermarket"},
	},
	model.VerticalCoffeeShop: {
		Types:    []string{"cafe", "bakery"},
		Keywords: []string{"coffee", "kahve", "starbucks", "espresso", "cafe"},
	},
	model.VerticalRestaurant: {
		Types:    []string{"restaurant", "meal_takeaway", "food"},
		Keywords: []string{"restaurant", "restoran", "lokanta", "kebab"},
	},
	model.VerticalBarber: {
		Types:    []string{"hair_care", "beauty_salon"},
		Keywords: []string{"berber", "kuaför", "barber", "salon"},
	},
	model.VerticalRetail: {
		Types:    []string{"store", "shopping_mall", "clothing_store", "department_store"},
		Keywords: []string{"mağaza", "magaza", "butik", "shop"},
	},
	model.VerticalElectrician: {
		Types:    []string{"electrician", "hardware_store", "home_goods_store"},
		Keywords: []string{"elektrik", "electric", "hardware"},
	},
}

// FetchNearbyPlaces queries Google Places Nearby Search at a coordinate.
func FetchNearbyPlaces(lat, lng float64, radiusM int) ([]nearbyPlace, error) {
	key := googleMapsAPIKey()
	if key == "" {
		return nil, fmt.Errorf("google maps api key is not configured")
	}

	endpoint, err := url.Parse(placesNearbyBase)
	if err != nil {
		return nil, err
	}

	query := endpoint.Query()
	query.Set("location", fmt.Sprintf("%f,%f", lat, lng))
	query.Set("radius", fmt.Sprintf("%d", radiusM))
	query.Set("key", key)
	endpoint.RawQuery = query.Encode()

	response, err := http.Get(endpoint.String())
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	var body placesNearbyResponse
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return nil, err
	}
	if body.Status != "OK" || len(body.Results) == 0 {
		return nil, nil
	}

	places := make([]nearbyPlace, 0, len(body.Results))
	for _, result := range body.Results {
		places = append(places, nearbyPlace{
			PlaceID:        result.PlaceID,
			Name:           result.Name,
			Types:          result.Types,
			Vicinity:       result.Vicinity,
			BusinessStatus: result.BusinessStatus,
		})
	}
	return places, nil
}

func matchPlaceToCategory(place nearbyPlace) (model.EntrepreneurVertical, bool) {
	name := strings.ToLower(place.Name)
	for vertical, config := range categoryPlacesQuery {
		for _, placeType := range config.Types {
			for _, t := range place.Types {
				if t == placeType {
					return vertical, true
				}
			}
		}
		for _, keyword := range config.Keywords {
			if strings.Contains(name, keyword) {
				return vertical, true
			}
		}
	}
	return "", false
}

func findBestPlaceForCategory(places []nearbyPlace, target model.EntrepreneurVertical) *nearbyPlace {
	config, ok := categoryPlacesQuery[target]
	if !ok {
		return nil
	}

	var best *nearbyPlace
	bestScore := 0

	for i := range places {
		place := places[i]
		score := 0
		name := strings.ToLower(place.Name)

		for _, placeType := range config.Types {
			for _, t := range place.Types {
				if t == placeType {
					score += 3
				}
			}
		}
		for _, keyword := range config.Keywords {
			if strings.Contains(name, keyword) {
				score += 4
			}
		}
		if place.BusinessStatus == "OPERATIONAL" {
			score++
		}

		if score > bestScore {
			bestScore = score
			best = &place
		}
	}

	if bestScore == 0 {
		return nil
	}
	return best
}

var unreliableAILabels = []string{
	"tobacco", "convenience store", "shop", "store", "market", "restaurant", "bakery", "barbershop",
}

func aiLooksUnreliable(detection model.DetectionResult) bool {
	if detection.ObjectType == model.OpportunityActiveShop ||
		detection.ObjectType == model.OpportunityUnclassified {
		return true
	}
	combined := strings.ToLower(detection.MatchedLabel + " " + detection.SignText)
	for _, label := range unreliableAILabels {
		if strings.Contains(combined, label) {
			return true
		}
	}
	return false
}

// ApplyPlacesVerification cross-checks HF output with Google Places data.
func ApplyPlacesVerification(
	detection model.DetectionResult,
	lat, lng float64,
	targetVertical model.EntrepreneurVertical,
) model.DetectionResult {
	places, err := FetchNearbyPlaces(lat, lng, 40)
	if err != nil || len(places) == 0 {
		return detection
	}

	place := findBestPlaceForCategory(places, targetVertical)
	if place == nil {
		place = &places[0]
	}

	resolvedVertical, hasCategory := matchPlaceToCategory(*place)
	unreliable := aiLooksUnreliable(detection)

	if hasCategory {
		isCompetitor := resolvedVertical == targetVertical
		if unreliable || isCompetitor || resolvedVertical != targetVertical {
			objectType := model.OpportunityActiveShop
			if isCompetitor {
				objectType = model.OpportunityCompetitor
			}
			detection.ObjectType = objectType
			detection.BusinessVertical = resolvedVertical
			detection.Confidence = 0.96
			detection.SignText = place.Name
			detection.PlacesName = place.Name
			detection.PlacesTypes = place.Types
			detection.PlacesVerified = true
			detection.NormalizedFrom = "google_places"
			return detection
		}
	}

	if unreliable && place.Name != "" {
		detection.SignText = place.Name
		detection.PlacesName = place.Name
		detection.PlacesTypes = place.Types
		detection.PlacesVerified = true
		detection.Confidence = max(detection.Confidence, 0.75)
	}

	return detection
}
