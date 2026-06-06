package urbanscan

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

const directionsAPIBase = "https://maps.googleapis.com/maps/api/directions/json"

type directionsResponse struct {
	Status       string `json:"status"`
	ErrorMessage string `json:"error_message"`
	Routes       []struct {
		OverviewPolyline struct {
			Points string `json:"points"`
		} `json:"overview_polyline"`
		Legs []struct {
			Distance struct {
				Value int `json:"value"`
			} `json:"distance"`
			Duration struct {
				Value int `json:"value"`
			} `json:"duration"`
		} `json:"legs"`
	} `json:"routes"`
}

// DrivingRoute is a decoded Google Directions path.
type DrivingRoute struct {
	Coordinates []LatLng `json:"coordinates"`
	DistanceM   int      `json:"distanceM"`
	DurationS   int      `json:"durationS"`
}

// AreaBounds is a map rectangle for area scans.
type AreaBounds struct {
	North float64 `json:"north"`
	South float64 `json:"south"`
	East  float64 `json:"east"`
	West  float64 `json:"west"`
}

// DecodePolyline decodes Google's encoded polyline format.
func DecodePolyline(encoded string) []LatLng {
	coordinates := make([]LatLng, 0)
	index := 0
	lat := 0
	lng := 0

	for index < len(encoded) {
		var result int
		var shift int
		var b int

		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		deltaLat := result >> 1
		if result&1 != 0 {
			deltaLat = ^deltaLat
		}
		lat += deltaLat

		result = 0
		shift = 0
		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		deltaLng := result >> 1
		if result&1 != 0 {
			deltaLng = ^deltaLng
		}
		lng += deltaLng

		coordinates = append(coordinates, LatLng{
			Lat: float64(lat) / 1e5,
			Lng: float64(lng) / 1e5,
		})
	}

	return coordinates
}

func googleMapsAPIKey() string {
	if key := os.Getenv("GOOGLE_STREET_VIEW_API_KEY"); key != "" {
		return key
	}
	return os.Getenv("GOOGLE_MAPS_API_KEY")
}

// FetchGoogleDirections returns a driving route between two points.
func FetchGoogleDirections(origin, destination LatLng) (DrivingRoute, error) {
	key := googleMapsAPIKey()
	if key == "" {
		return DrivingRoute{}, fmt.Errorf("google maps api key is not configured")
	}

	endpoint, err := url.Parse(directionsAPIBase)
	if err != nil {
		return DrivingRoute{}, err
	}

	query := endpoint.Query()
	query.Set("origin", fmt.Sprintf("%f,%f", origin.Lat, origin.Lng))
	query.Set("destination", fmt.Sprintf("%f,%f", destination.Lat, destination.Lng))
	query.Set("mode", "driving")
	query.Set("key", key)
	endpoint.RawQuery = query.Encode()

	response, err := http.Get(endpoint.String())
	if err != nil {
		return DrivingRoute{}, err
	}
	defer response.Body.Close()

	var body directionsResponse
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return DrivingRoute{}, err
	}
	if body.Status != "OK" || len(body.Routes) == 0 {
		message := body.ErrorMessage
		if message == "" {
			message = body.Status
		}
		return DrivingRoute{}, fmt.Errorf("directions status: %s", message)
	}

	route := body.Routes[0]
	coordinates := DecodePolyline(route.OverviewPolyline.Points)
	distanceM := 0
	durationS := 0
	if len(route.Legs) > 0 {
		distanceM = route.Legs[0].Distance.Value
		durationS = route.Legs[0].Duration.Value
	}

	return DrivingRoute{
		Coordinates: coordinates,
		DistanceM:   distanceM,
		DurationS:   durationS,
	}, nil
}

func appendUniqueCoordinates(target []LatLng, segment []LatLng) []LatLng {
	for _, point := range segment {
		if len(target) == 0 {
			target = append(target, point)
			continue
		}
		last := target[len(target)-1]
		if abs(last.Lat-point.Lat) > 1e-6 || abs(last.Lng-point.Lng) > 1e-6 {
			target = append(target, point)
		}
	}
	return target
}

func abs(value float64) float64 {
	if value < 0 {
		return -value
	}
	return value
}

// FetchAreaRoadNetwork covers a rectangle with boustrophedon driving legs.
func FetchAreaRoadNetwork(bounds AreaBounds) (DrivingRoute, error) {
	widthM, heightM := measureBounds(bounds)
	rowCount := int(maxFloat(2, minFloat(5, maxFloat(widthM, heightM)/120)))

	merged := make([]LatLng, 0)
	totalDistance := 0
	totalDuration := 0

	for row := 0; row < rowCount; row++ {
		ratio := 0.5
		if rowCount > 1 {
			ratio = float64(row) / float64(rowCount-1)
		}
		lat := bounds.South + (bounds.North-bounds.South)*ratio
		left := LatLng{Lat: lat, Lng: bounds.West}
		right := LatLng{Lat: lat, Lng: bounds.East}

		origin := left
		destination := right
		if row%2 == 1 {
			origin = right
			destination = left
		}

		leg, err := FetchGoogleDirections(origin, destination)
		if err != nil {
			continue
		}

		segment := leg.Coordinates
		if row%2 == 1 {
			for i, j := 0, len(segment)-1; i < j; i, j = i+1, j-1 {
				segment[i], segment[j] = segment[j], segment[i]
			}
		}

		merged = appendUniqueCoordinates(merged, segment)
		totalDistance += leg.DistanceM
		totalDuration += leg.DurationS
	}

	if len(merged) < 2 {
		return DrivingRoute{}, fmt.Errorf("google directions could not resolve roads inside this area")
	}

	return DrivingRoute{
		Coordinates: merged,
		DistanceM:   totalDistance,
		DurationS:   totalDuration,
	}, nil
}

func measureBounds(bounds AreaBounds) (widthM, heightM float64) {
	centerLat := (bounds.North + bounds.South) / 2
	widthM = haversineDistance(
		LatLng{Lat: centerLat, Lng: bounds.West},
		LatLng{Lat: centerLat, Lng: bounds.East},
	)
	heightM = haversineDistance(
		LatLng{Lat: bounds.South, Lng: centerLat},
		LatLng{Lat: bounds.North, Lng: centerLat},
	)
	return widthM, heightM
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
