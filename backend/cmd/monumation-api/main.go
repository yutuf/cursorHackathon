// Standalone Monumation scoring API for hackathon demos (no Postgres/Kafka required).
// Run: go run ./cmd/monumation-api
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/urbanscan"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("MONUMATION_PORT")
	}
	if port == "" {
		port = "8000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/monumation/normalize", handleNormalize)
	mux.HandleFunc("/monumation/scan", handleScan)

	log.Printf("[Monumation Engine] API listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, withCORS(mux)))
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"engine": "monumation",
		"stack":  "masterfabric-go",
	})
}

type normalizeBody struct {
	Labels []string `json:"labels"`
	Texts  []string `json:"texts"`
}

func handleNormalize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST only"})
		return
	}

	var body normalizeBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	tokens := urbanscan.ClassifyMonumationTokens(body.Labels, body.Texts)
	node := urbanscan.ScoreMonumationNode(0, 0, body.Labels, body.Texts)

	log.Printf("[Monumation Engine] normalize tokens=%d mood=%s heritage=%.0f",
		len(tokens), node.DominantMoodTag, node.HeritageScore)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"engine":            "monumation",
		"stack":             "masterfabric-go",
		"tokens":            tokens,
		"heritage_score":    node.HeritageScore,
		"scenic_score":      node.ScenicScore,
		"art_score":         node.ArtScore,
		"promenade_score":   node.PromenadeScore,
		"dominant_mood_tag": node.DominantMoodTag,
	})
}

type scanDetection struct {
	Index       int      `json:"index"`
	Labels      []string `json:"labels"`
	Texts       []string `json:"texts"`
	ImageBase64 string   `json:"imageBase64,omitempty"`
}

type scanBody struct {
	Coordinates []urbanscan.LatLng `json:"coordinates"`
	MaxPoints   int                `json:"maxPoints"`
	Detections  []scanDetection    `json:"detections"`
}

type scanNodeOut struct {
	Index           int     `json:"index"`
	DistanceM       int     `json:"distanceM"`
	Lat             float64 `json:"lat"`
	Lng             float64 `json:"lng"`
	HeritageScore   float64 `json:"heritage_score"`
	ScenicScore     float64 `json:"scenic_score"`
	ArtScore        float64 `json:"art_score"`
	PromenadeScore  float64 `json:"promenade_score"`
	DominantMoodTag string  `json:"dominant_mood_tag"`
	KVKKMasked      bool    `json:"kvkk_masked"`
}

func handleScan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST only"})
		return
	}

	var body scanBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if len(body.Coordinates) < 2 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "need at least 2 coordinates"})
		return
	}

	maxPoints := body.MaxPoints
	if maxPoints <= 0 {
		maxPoints = 12
	}

	waypoints := urbanscan.SampleRouteWaypoints(body.Coordinates, maxPoints)
	byIndex := make(map[int]scanDetection, len(body.Detections))
	for _, d := range body.Detections {
		byIndex[d.Index] = d
	}

	log.Printf("[Monumation Engine] scan started waypoints=%d detections=%d",
		len(waypoints), len(body.Detections))

	results := make([]scanNodeOut, 0, len(waypoints))
	kvkkCount := 0

	for index, wp := range waypoints {
		input := byIndex[index]
		kvkk := false
		if strings.TrimSpace(input.ImageBase64) != "" {
			if _, applied := urbanscan.ApplyKVKVMask(input.ImageBase64); applied {
				kvkk = true
				kvkkCount++
			}
		}

		node := urbanscan.ScoreMonumationNode(wp.Lat, wp.Lng, input.Labels, input.Texts)
		results = append(results, scanNodeOut{
			Index:           index,
			DistanceM:       wp.DistanceM,
			Lat:             node.Lat,
			Lng:             node.Lng,
			HeritageScore:   node.HeritageScore,
			ScenicScore:     node.ScenicScore,
			ArtScore:        node.ArtScore,
			PromenadeScore:  node.PromenadeScore,
			DominantMoodTag: node.DominantMoodTag,
			KVKKMasked:      kvkk,
		})
	}

	log.Printf("[Monumation Engine] scan complete nodes=%d kvkk=%d", len(results), kvkkCount)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"engine":            "monumation",
		"stack":             "masterfabric-go",
		"sampleIntervalM":   urbanscan.SampleIntervalMeters,
		"waypointCount":     len(waypoints),
		"kvkk_masked_count": kvkkCount,
		"results":           results,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
