package model

// MonumationNodeScore is the aesthetic mood payload for a single path coordinate.
type MonumationNodeScore struct {
	Lat              float64 `json:"lat"`
	Lng              float64 `json:"lng"`
	HeritageScore    float64 `json:"heritage_score"`
	ScenicScore      float64 `json:"scenic_score"`
	ArtScore         float64 `json:"art_score"`
	PromenadeScore   float64 `json:"promenade_score"`
	DominantMoodTag  string  `json:"dominant_mood_tag"`
}
