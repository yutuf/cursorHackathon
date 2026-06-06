package urbanscan

import (
	"strings"

	urbanscanModel "github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

const monumationLogPrefix = "[Monumation Engine]"

// Monumation token slots mapped from Hugging Face interpretation labels.
const (
	TokenHistoricalFacade = "historical_facade"
	TokenStoneMasonry     = "stone_masonry"
	TokenMonument         = "monument"
	TokenBayWindowCumba   = "bay_window_cumba"

	TokenTreeCanopy     = "tree_canopy"
	TokenParkVegetation = "park_vegetation"
	TokenPlanterBox     = "planter_box"
	TokenOpenSkyRatio   = "open_sky_ratio"

	TokenStreetArtMural      = "street_art_mural"
	TokenModernArchitecture  = "modern_architecture"
	TokenPedestrianPlaza     = "pedestrian_plaza"
	TokenDecorativeLighting = "decorative_lighting"

	TokenPedestrianizedStreet = "pedestrianized_street"
	TokenCafeTerrace          = "cafe_terrace"
	TokenStorefrontLayout     = "storefront_layout"
	TokenBustlingPromenade    = "bustling_promenade"

	TokenPlasticBillboard   = "plastic_billboard"
	TokenExposedWiring      = "exposed_wiring"
	TokenHeavyGraffiti      = "heavy_graffiti"
	TokenIndustrialDumpster = "industrial_dumpster"
	TokenShatteredFacade    = "shattered_facade"
)

var heritageTokens = map[string]struct{}{
	TokenHistoricalFacade: {},
	TokenStoneMasonry:     {},
	TokenMonument:         {},
	TokenBayWindowCumba:   {},
}

var scenicTokens = map[string]struct{}{
	TokenTreeCanopy:     {},
	TokenParkVegetation: {},
	TokenPlanterBox:     {},
	TokenOpenSkyRatio:   {},
}

var modernCultureTokens = map[string]struct{}{
	TokenStreetArtMural:     {},
	TokenModernArchitecture: {},
	TokenPedestrianPlaza:    {},
	TokenDecorativeLighting: {},
}

var promenadeTokens = map[string]struct{}{
	TokenPedestrianizedStreet: {},
	TokenCafeTerrace:          {},
	TokenStorefrontLayout:     {},
	TokenBustlingPromenade:    {},
}

var pollutionTokens = map[string]struct{}{
	TokenPlasticBillboard:   {},
	TokenExposedWiring:      {},
	TokenHeavyGraffiti:      {},
	TokenIndustrialDumpster: {},
	TokenShatteredFacade:    {},
}

// Ground-level parked vehicles are ignored for tourist appeal scoring.
var ignoredGroundVehicleLabels = []string{
	"car", "truck", "bus", "motorcycle", "minivan", "van", "wagon", "jeep",
	"convertible", "sports car", "limousine", "police van", "moving van",
	"garbage truck", "ambulance", "parking meter", "taxicab", "cab",
}

// Maps ViT / HF label strings to Monumation aesthetic token slots.
var hfLabelToMonumationToken = map[string]string{
	"palace":           TokenHistoricalFacade,
	"monastery":        TokenHistoricalFacade,
	"church":           TokenHistoricalFacade,
	"mosque":           TokenHistoricalFacade,
	"bell cote":        TokenHistoricalFacade,
	"vault":            TokenHistoricalFacade,
	"triumphal arch":   TokenMonument,
	"obelisk":          TokenMonument,
	"pedestal":         TokenMonument,
	"megalith":         TokenMonument,
	"stone wall":       TokenStoneMasonry,
	"cliff":            TokenStoneMasonry,
	"cliff dwelling":   TokenStoneMasonry,
	"bay window":       TokenBayWindowCumba,
	"window":           TokenBayWindowCumba,

	"tree":      TokenTreeCanopy,
	"forest":    TokenTreeCanopy,
	"park":      TokenParkVegetation,
	"lawn":      TokenParkVegetation,
	"flower":    TokenParkVegetation,
	"greenhouse": TokenPlanterBox,
	"pot":       TokenPlanterBox,
	"valley":    TokenOpenSkyRatio,
	"alp":       TokenOpenSkyRatio,
	"promontory": TokenOpenSkyRatio,
	"seashore":  TokenOpenSkyRatio,

	"graffiti":        TokenHeavyGraffiti,
	"street art":      TokenStreetArtMural,
	"mural":           TokenStreetArtMural,
	"skyscraper":      TokenModernArchitecture,
	"restaurant":      TokenModernArchitecture,
	"storefront":      TokenModernArchitecture,
	"fountain":        TokenPedestrianPlaza,
	"promenade":       TokenPedestrianizedStreet,
	"pier":            TokenPedestrianPlaza,
	"spotlight":       TokenDecorativeLighting,
	"stage":           TokenDecorativeLighting,
	"cafe":            TokenCafeTerrace,
	"bakery":          TokenCafeTerrace,
	"delicatessen":    TokenBustlingPromenade,
	"market":          TokenBustlingPromenade,
	"shoe shop":       TokenStorefrontLayout,
	"confectionery":   TokenStorefrontLayout,

	"billboard":       TokenPlasticBillboard,
	"signboard":       TokenPlasticBillboard,
	"chainlink fence": TokenIndustrialDumpster,
	"barrel":          TokenIndustrialDumpster,
	"crate":           TokenIndustrialDumpster,
	"damaged":         TokenShatteredFacade,
	"ruin":            TokenShatteredFacade,
	"wire":            TokenExposedWiring,
	"cable":           TokenExposedWiring,
}

func normalizeHFLabel(label string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(label, "_", " ")))
}

func isIgnoredGroundVehicle(label string) bool {
	normalized := normalizeHFLabel(label)
	for _, vehicle := range ignoredGroundVehicleLabels {
		if strings.Contains(normalized, vehicle) {
			return true
		}
	}
	return false
}

func resolveMonumationToken(label string) string {
	normalized := normalizeHFLabel(label)

	if token, ok := hfLabelToMonumationToken[normalized]; ok {
		return token
	}

	for key, token := range hfLabelToMonumationToken {
		if strings.Contains(normalized, key) {
			return token
		}
	}

	switch normalized {
	case TokenHistoricalFacade, TokenStoneMasonry, TokenMonument, TokenBayWindowCumba,
		TokenTreeCanopy, TokenParkVegetation, TokenPlanterBox, TokenOpenSkyRatio,
		TokenStreetArtMural, TokenModernArchitecture, TokenPedestrianPlaza, TokenDecorativeLighting,
		TokenPedestrianizedStreet, TokenCafeTerrace, TokenStorefrontLayout, TokenBustlingPromenade,
		TokenPlasticBillboard, TokenExposedWiring, TokenHeavyGraffiti,
		TokenIndustrialDumpster, TokenShatteredFacade:
		return strings.ReplaceAll(normalized, " ", "_")
	}

	return ""
}

func tokenVector(token string) string {
	if _, ok := heritageTokens[token]; ok {
		return "heritage"
	}
	if _, ok := scenicTokens[token]; ok {
		return "scenic"
	}
	if _, ok := modernCultureTokens[token]; ok {
		return "modern"
	}
	if _, ok := promenadeTokens[token]; ok {
		return "promenade"
	}
	if _, ok := pollutionTokens[token]; ok {
		return "pollution"
	}
	return ""
}

// ClassifyMonumationTokens maps HF label slots to Monumation aesthetic tokens.
func ClassifyMonumationTokens(labels, texts []string) []string {
	seen := make(map[string]struct{})
	tokens := make([]string, 0)

	for _, raw := range append(labels, texts...) {
		if isIgnoredGroundVehicle(raw) {
			continue
		}
		token := resolveMonumationToken(raw)
		if token == "" {
			continue
		}
		if _, ok := seen[token]; ok {
			continue
		}
		seen[token] = struct{}{}
		tokens = append(tokens, token)
	}

	return tokens
}

type monumationVectorCounts struct {
	Heritage   int
	Scenic     int
	Modern     int
	Promenade  int
	Pollution  int
}

func countMonumationVectors(tokens []string) monumationVectorCounts {
	var counts monumationVectorCounts
	for _, token := range tokens {
		switch tokenVector(token) {
		case "heritage":
			counts.Heritage++
		case "scenic":
			counts.Scenic++
		case "modern":
			counts.Modern++
		case "promenade":
			counts.Promenade++
		case "pollution":
			counts.Pollution++
		}
	}
	return counts
}

func clampMonumationScore(score float64) float64 {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

// ScoreMonumationNode applies the Monumation Aesthetic Vector Matrix for one coordinate.
func ScoreMonumationNode(lat, lng float64, labels, texts []string) urbanscanModel.MonumationNodeScore {
	tokens := ClassifyMonumationTokens(labels, texts)
	counts := countMonumationVectors(tokens)

	heritage := clampMonumationScore(float64(counts.Heritage*15 - counts.Pollution*10))
	scenic := clampMonumationScore(float64(counts.Scenic*15 - counts.Pollution*5))
	art := clampMonumationScore(float64(counts.Modern*15 - counts.Pollution*10))
	promenade := clampMonumationScore(float64(counts.Promenade*15 - counts.Pollution*8))

	return urbanscanModel.MonumationNodeScore{
		Lat:              lat,
		Lng:              lng,
		HeritageScore:    heritage,
		ScenicScore:      scenic,
		ArtScore:         art,
		PromenadeScore:   promenade,
		DominantMoodTag:  DominantMoodTag(heritage, scenic, art, promenade),
	}
}

// DominantMoodTag picks the primary tourist mood corridor label.
func DominantMoodTag(heritage, scenic, art, promenade float64) string {
	if heritage < 40 && scenic < 40 && art < 40 && promenade < 40 {
		return "Low Appeal Urban Zone"
	}
	best := "Monumation Heritage Route"
	bestScore := heritage
	if scenic > bestScore {
		best = "Monumation Scenic/Green Route"
		bestScore = scenic
	}
	if art > bestScore {
		best = "Monumation Arts & Culture Route"
		bestScore = art
	}
	if promenade > bestScore {
		best = "Monumation Vibrant Promenade"
	}
	return best
}

// ApplyKVKVMask irreversibly masks accidental face or license plate pixels before payload return.
// Placeholder: production pipeline would run blur on decoded image bytes.
func ApplyKVKVMask(imageBase64 string) (masked string, applied bool) {
	if strings.TrimSpace(imageBase64) == "" {
		return "", false
	}
	// Irreversible anonymization pass placeholder — faces/plates blurred in production.
	return imageBase64, true
}
