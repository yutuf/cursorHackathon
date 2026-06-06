package urbanscan

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

const earthRadiusM = 6_371_000

// SampleIntervalMeters is the corridor sampling density for Street View capture.
const SampleIntervalMeters = 20

// hfEnglishToVertical maps common Hugging Face / ImageNet English labels to
// Bulan's Turkish entrepreneur target verticals.
var hfEnglishToVertical = map[string]model.EntrepreneurVertical{
	"cafe":                model.VerticalCoffeeShop,
	"coffee shop":         model.VerticalCoffeeShop,
	"coffee":              model.VerticalCoffeeShop,
	"espresso":            model.VerticalCoffeeShop,
	"bakery":              model.VerticalCoffeeShop,
	"restaurant":          model.VerticalRestaurant,
	"brasserie":           model.VerticalRestaurant,
	"buffet":              model.VerticalRestaurant,
	"delicatessen":        model.VerticalRestaurant,
	"diner":               model.VerticalRestaurant,
	"tobacco shop":        model.VerticalRetail,
	"bookshop":            model.VerticalRetail,
	"bookstore":           model.VerticalRetail,
	"shoe shop":           model.VerticalRetail,
	"confectionery":       model.VerticalRetail,
	"shop":                model.VerticalRetail,
	"store":               model.VerticalRetail,
	"convenience store":   model.VerticalGrocery,
	"grocery store":       model.VerticalGrocery,
	"supermarket":         model.VerticalGrocery,
	"market":              model.VerticalGrocery,
	"pharmacy":            model.VerticalPharmacy,
	"drugstore":           model.VerticalPharmacy,
	"chemist":             model.VerticalPharmacy,
	"chemist's":           model.VerticalPharmacy,
	"barbershop":          model.VerticalBarber,
	"barber shop":         model.VerticalBarber,
	"hair salon":          model.VerticalBarber,
	"hardware store":      model.VerticalElectrician,
	"electrician":         model.VerticalElectrician,
}

var turkishVerticalKeywords = map[model.EntrepreneurVertical][]string{
	model.VerticalCoffeeShop:  {"coffee", "cafe", "kahve", "espresso", "starbucks", "bakery"},
	model.VerticalElectrician: {"electric", "electrician", "elektrik", "electrical", "wiring"},
	model.VerticalRestaurant:  {"restaurant", "restoran", "diner", "food", "kitchen", "lokanta"},
	model.VerticalRetail:      {"shop", "store", "market", "butik", "magaza", "mağaza", "retail", "tobacco"},
	model.VerticalBarber:      {"barber", "berber", "salon", "kuaför", "kuaför", "hair"},
	model.VerticalPharmacy:    {"pharmacy", "eczane", "drugstore", "medical"},
	model.VerticalGrocery:     {"grocery", "supermarket", "market", "bakkal", "gida", "gıda", "convenience"},
}

var rentKeywords = []string{"kiralik", "kiralık", "for rent", "to let", "rent", "emlak", "lease"}
var saleKeywords = []string{"satilik", "satılık", "for sale", "sale", "sell", "satış", "satis"}

// Turkish phone numbers on storefront signs often indicate vacant units with agent contact.
var phonePattern = regexp.MustCompile(
	`(?:\+90|0)[\s\-.()]*\d{2,3}[\s\-.()]*\d{3}[\s\-.()]*\d{2}[\s\-.()]*\d{2}`,
)

// NormalizeClassification maps HF English labels and OCR text to entrepreneur verticals.
// If a phone number appears in texts, the result is always Vacant Space.
func NormalizeClassification(
	labels []string,
	texts []string,
	targetVertical model.EntrepreneurVertical,
) model.DetectionResult {
	combined := strings.ToLower(strings.Join(append(labels, texts...), " "))

	if ContainsPhoneNumber(texts) || ContainsPhoneNumber(labels) {
		return model.DetectionResult{
			ObjectType:       model.OpportunityVacant,
			BusinessVertical: targetVertical,
			Confidence:       0.88,
			SignText:         extractPhoneHint(texts, labels),
			NormalizedFrom:   "phone_number_pattern",
		}
	}

	if hit := matchKeywords(combined, rentKeywords); hit != "" {
		return model.DetectionResult{
			ObjectType:       model.OpportunityForRent,
			BusinessVertical: targetVertical,
			Confidence:       0.84,
			SignText:         hit,
		}
	}

	if hit := matchKeywords(combined, saleKeywords); hit != "" {
		return model.DetectionResult{
			ObjectType:       model.OpportunityForSale,
			BusinessVertical: targetVertical,
			Confidence:       0.82,
			SignText:         hit,
		}
	}

	for _, label := range labels {
		normalized := normalizeToken(label)
		if vertical, ok := hfEnglishToVertical[normalized]; ok {
			return buildVerticalResult(vertical, targetVertical, label, 0.78)
		}
		for key, vertical := range hfEnglishToVertical {
			if strings.Contains(normalized, key) {
				return buildVerticalResult(vertical, targetVertical, label, 0.72)
			}
		}
	}

	for _, text := range texts {
		normalized := normalizeToken(text)
		for key, vertical := range hfEnglishToVertical {
			if strings.Contains(normalized, key) {
				return buildVerticalResult(vertical, targetVertical, text, 0.8)
			}
		}
		if vertical, ok := matchTurkishVertical(normalized, targetVertical); ok {
			return buildVerticalResult(vertical, targetVertical, text, 0.86)
		}
	}

	if vertical, label, ok := matchTargetKeywords(combined, targetVertical); ok {
		return buildVerticalResult(vertical, targetVertical, label, 0.74)
	}

	if hasGenericShopSignal(combined) {
		return model.DetectionResult{
			ObjectType:       model.OpportunityActiveShop,
			BusinessVertical: targetVertical,
			Confidence:       0.58,
		}
	}

	return model.DetectionResult{
		ObjectType:       model.OpportunityUnclassified,
		BusinessVertical: targetVertical,
		Confidence:       0.35,
	}
}

// ContainsPhoneNumber reports whether any entry looks like a Turkish storefront phone.
func ContainsPhoneNumber(values []string) bool {
	for _, value := range values {
		if phonePattern.MatchString(value) {
			return true
		}
	}
	return false
}

func buildVerticalResult(
	detected model.EntrepreneurVertical,
	target model.EntrepreneurVertical,
	source string,
	confidence float64,
) model.DetectionResult {
	objectType := model.OpportunityActiveShop
	if detected == target {
		objectType = model.OpportunityCompetitor
		confidence = max(confidence, 0.8)
	}

	return model.DetectionResult{
		ObjectType:       objectType,
		BusinessVertical: target,
		Confidence:       confidence,
		MatchedLabel:     source,
		NormalizedFrom:   string(detected),
	}
}

func matchTargetKeywords(
	combined string,
	target model.EntrepreneurVertical,
) (model.EntrepreneurVertical, string, bool) {
	for _, keyword := range turkishVerticalKeywords[target] {
		if strings.Contains(combined, normalizeToken(keyword)) {
			return target, keyword, true
		}
	}
	return "", "", false
}

func matchTurkishVertical(
	text string,
	target model.EntrepreneurVertical,
) (model.EntrepreneurVertical, bool) {
	for vertical, keywords := range turkishVerticalKeywords {
		for _, keyword := range keywords {
			if strings.Contains(text, normalizeToken(keyword)) {
				return vertical, true
			}
		}
	}
	_ = target
	return "", false
}

func matchKeywords(text string, keywords []string) string {
	for _, keyword := range keywords {
		if strings.Contains(text, normalizeToken(keyword)) {
			return keyword
		}
	}
	return ""
}

func hasGenericShopSignal(text string) bool {
	signals := []string{
		"storefront", "facade", "awning", "shop front", "display window",
		"pharmacy", "drugstore", "eczane", "restaurant", "barbershop",
	}
	for _, signal := range signals {
		if strings.Contains(text, signal) {
			return true
		}
	}
	return false
}

func extractPhoneHint(texts, labels []string) string {
	for _, value := range append(texts, labels...) {
		if phonePattern.MatchString(value) {
			return phonePattern.FindString(value)
		}
	}
	return "phone_detected"
}

func normalizeToken(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "_", " ")
	var b strings.Builder
	for _, r := range value {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
