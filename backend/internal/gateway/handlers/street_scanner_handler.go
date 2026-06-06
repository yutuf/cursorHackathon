package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/urbanscan"
	"github.com/masterfabric-go/masterfabric/internal/domain/apimanagement/model"
	urbanscanModel "github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

const (
	streetScannerService = "street-scanner"
	monumationEngine     = "monumation"
	defaultMaxPoints     = 40
)

// StreetScannerHandler processes Monumation aesthetic corridor scans on the Go backend.
type StreetScannerHandler struct{}

// NewStreetScannerHandler creates a street scanner backend handler.
func NewStreetScannerHandler() *StreetScannerHandler {
	return &StreetScannerHandler{}
}

// ServiceName is the backend_service identifier for gateway registration.
func (h *StreetScannerHandler) ServiceName() string {
	return streetScannerService
}

// Handle routes scan, sample, route, and normalize actions.
func (h *StreetScannerHandler) Handle(ctx context.Context, endpoint *model.Endpoint, req *http.Request) (*http.Response, error) {
	switch endpoint.BackendAction {
	case "sample":
		return h.handleSample(ctx, req)
	case "route":
		return h.handleRoute(ctx, req)
	case "normalize":
		return h.handleNormalize(ctx, req)
	case "scan":
		return h.handleScan(ctx, req)
	default:
		return h.handleScan(ctx, req)
	}
}

type sampleRequest struct {
	Coordinates []urbanscan.LatLng `json:"coordinates"`
	MaxPoints   int                `json:"maxPoints"`
}

type sampleResponse struct {
	SampleIntervalM int                            `json:"sampleIntervalM"`
	Waypoints       []urbanscanModel.RouteWaypoint `json:"waypoints"`
}

type routeRequest struct {
	Bounds    urbanscan.AreaBounds `json:"bounds"`
	Start     *urbanscan.LatLng    `json:"start"`
	End       *urbanscan.LatLng    `json:"end"`
	MaxPoints int                  `json:"maxPoints"`
}

type routeResponse struct {
	GeometrySource  string                         `json:"geometrySource"`
	Coordinates     []urbanscan.LatLng             `json:"coordinates"`
	DistanceM       int                            `json:"distanceM"`
	DurationS       int                            `json:"durationS"`
	SampleIntervalM int                            `json:"sampleIntervalM"`
	Waypoints       []urbanscanModel.RouteWaypoint `json:"waypoints"`
}

func (h *StreetScannerHandler) handleRoute(_ context.Context, req *http.Request) (*http.Response, error) {
	var body routeRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	maxPoints := body.MaxPoints
	if maxPoints <= 0 {
		maxPoints = defaultMaxPoints
	}

	var drivingRoute urbanscan.DrivingRoute
	var err error

	if body.Start != nil && body.End != nil {
		drivingRoute, err = urbanscan.FetchGoogleDirections(*body.Start, *body.End)
	} else {
		drivingRoute, err = urbanscan.FetchAreaRoadNetwork(body.Bounds)
	}
	if err != nil {
		return jsonResponse(http.StatusBadGateway, map[string]string{"error": err.Error()})
	}

	waypoints := urbanscan.SampleRouteWaypoints(drivingRoute.Coordinates, maxPoints)
	return jsonResponse(http.StatusOK, routeResponse{
		GeometrySource:  "google_directions",
		Coordinates:     drivingRoute.Coordinates,
		DistanceM:       drivingRoute.DistanceM,
		DurationS:       drivingRoute.DurationS,
		SampleIntervalM: urbanscan.SampleIntervalMeters,
		Waypoints:       waypoints,
	})
}

func (h *StreetScannerHandler) handleSample(_ context.Context, req *http.Request) (*http.Response, error) {
	var body sampleRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if len(body.Coordinates) < 2 {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "coordinates must contain at least two points"})
	}

	maxPoints := body.MaxPoints
	if maxPoints <= 0 {
		maxPoints = defaultMaxPoints
	}

	waypoints := urbanscan.SampleRouteWaypoints(body.Coordinates, maxPoints)
	return jsonResponse(http.StatusOK, sampleResponse{
		SampleIntervalM: urbanscan.SampleIntervalMeters,
		Waypoints:       waypoints,
	})
}

type normalizeRequest struct {
	Labels           []string                            `json:"labels"`
	Texts            []string                            `json:"texts"`
	BusinessVertical urbanscanModel.EntrepreneurVertical `json:"businessVertical"`
}

func (h *StreetScannerHandler) handleNormalize(_ context.Context, req *http.Request) (*http.Response, error) {
	var body normalizeRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	tokens := urbanscan.ClassifyMonumationTokens(body.Labels, body.Texts)
	node := urbanscan.ScoreMonumationNode(0, 0, body.Labels, body.Texts)

	return jsonResponse(http.StatusOK, map[string]interface{}{
		"engine":           monumationEngine,
		"tokens":           tokens,
		"heritage_score":    node.HeritageScore,
		"scenic_score":      node.ScenicScore,
		"art_score":         node.ArtScore,
		"promenade_score":   node.PromenadeScore,
		"dominant_mood_tag": node.DominantMoodTag,
	})
}

type scanDetectionInput struct {
	Index       int      `json:"index"`
	Labels      []string `json:"labels"`
	Texts       []string `json:"texts"`
	ImageBase64 string   `json:"imageBase64,omitempty"`
}

type scanRequest struct {
	Coordinates      []urbanscan.LatLng                  `json:"coordinates"`
	BusinessVertical urbanscanModel.EntrepreneurVertical `json:"businessVertical"`
	MaxPoints        int                                 `json:"maxPoints"`
	Detections       []scanDetectionInput                `json:"detections"`
}

type monumationNodeOutput struct {
	Index           int     `json:"index"`
	DistanceM       int     `json:"distanceM"`
	Lat             float64 `json:"lat"`
	Lng             float64 `json:"lng"`
	HeritageScore    float64 `json:"heritage_score"`
	ScenicScore      float64 `json:"scenic_score"`
	ArtScore         float64 `json:"art_score"`
	PromenadeScore   float64 `json:"promenade_score"`
	DominantMoodTag  string  `json:"dominant_mood_tag"`
	KVKKMasked      bool    `json:"kvkk_masked"`
}

type scanResponse struct {
	Engine          string                 `json:"engine"`
	SampleIntervalM int                    `json:"sampleIntervalM"`
	WaypointCount   int                    `json:"waypointCount"`
	KVKKMaskedCount int                    `json:"kvkk_masked_count"`
	Results         []monumationNodeOutput `json:"results"`
}

func (h *StreetScannerHandler) handleScan(_ context.Context, req *http.Request) (*http.Response, error) {
	var body scanRequest
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}
	if len(body.Coordinates) < 2 {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "coordinates must contain at least two points"})
	}

	maxPoints := body.MaxPoints
	if maxPoints <= 0 {
		maxPoints = defaultMaxPoints
	}

	waypoints := urbanscan.SampleRouteWaypoints(body.Coordinates, maxPoints)
	detectionByIndex := make(map[int]scanDetectionInput, len(body.Detections))
	for _, item := range body.Detections {
		detectionByIndex[item.Index] = item
	}

	log.Printf("[Monumation Engine] scan started: %d waypoints, %d HF detections",
		len(waypoints), len(body.Detections))

	results := make([]monumationNodeOutput, 0, len(waypoints))
	kvkkMaskedCount := 0

	for index, waypoint := range waypoints {
		input := detectionByIndex[index]

		if input.ImageBase64 != "" {
			if _, applied := urbanscan.ApplyKVKVMask(input.ImageBase64); applied {
				kvkkMaskedCount++
			}
		}

		node := urbanscan.ScoreMonumationNode(
			waypoint.Lat,
			waypoint.Lng,
			input.Labels,
			input.Texts,
		)

		log.Printf("[Monumation Engine] node %d lat=%.5f lng=%.5f mood=%s heritage=%.0f scenic=%.0f art=%.0f promenade=%.0f",
			index, node.Lat, node.Lng, node.DominantMoodTag,
			node.HeritageScore, node.ScenicScore, node.ArtScore, node.PromenadeScore)

		results = append(results, monumationNodeOutput{
			Index:            index,
			DistanceM:        waypoint.DistanceM,
			Lat:              node.Lat,
			Lng:              node.Lng,
			HeritageScore:    node.HeritageScore,
			ScenicScore:      node.ScenicScore,
			ArtScore:         node.ArtScore,
			PromenadeScore:   node.PromenadeScore,
			DominantMoodTag:  node.DominantMoodTag,
			KVKKMasked:      input.ImageBase64 != "",
		})
	}

	log.Printf("[Monumation Engine] scan complete: %d nodes scored, %d images KVKK-masked",
		len(results), kvkkMaskedCount)

	return jsonResponse(http.StatusOK, scanResponse{
		Engine:          monumationEngine,
		SampleIntervalM: urbanscan.SampleIntervalMeters,
		WaypointCount:   len(waypoints),
		KVKKMaskedCount: kvkkMaskedCount,
		Results:         results,
	})
}

func jsonResponse(status int, payload interface{}) (*http.Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal response: %w", err)
	}

	resp := &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewReader(body)),
	}
	resp.Header.Set("Content-Type", "application/json")
	return resp, nil
}

// ParseBusinessVertical normalizes a string vertical id from API requests.
func ParseBusinessVertical(raw string) (urbanscanModel.EntrepreneurVertical, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "coffee_shop", "coffee-shop":
		return urbanscanModel.VerticalCoffeeShop, nil
	case "electrician":
		return urbanscanModel.VerticalElectrician, nil
	case "restaurant":
		return urbanscanModel.VerticalRestaurant, nil
	case "retail":
		return urbanscanModel.VerticalRetail, nil
	case "barber":
		return urbanscanModel.VerticalBarber, nil
	case "pharmacy":
		return urbanscanModel.VerticalPharmacy, nil
	case "grocery":
		return urbanscanModel.VerticalGrocery, nil
	default:
		return "", fmt.Errorf("unknown business vertical: %s", raw)
	}
}
