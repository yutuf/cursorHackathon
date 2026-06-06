package urbanscan

import (
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

func TestNormalizeClassificationMapsCafeToCoffeeShopCompetitor(t *testing.T) {
	result := NormalizeClassification(
		[]string{"minivan", "ambulance", "cafe"},
		[]string{},
		model.VerticalCoffeeShop,
	)

	if result.ObjectType != model.OpportunityCompetitor {
		t.Fatalf("expected competitor, got %s", result.ObjectType)
	}
	if result.NormalizedFrom != string(model.VerticalCoffeeShop) {
		t.Fatalf("expected coffee_shop vertical, got %s", result.NormalizedFrom)
	}
}

func TestNormalizeClassificationMapsConvenienceStoreToGrocery(t *testing.T) {
	result := NormalizeClassification(
		[]string{"convenience store", "street scene"},
		[]string{},
		model.VerticalGrocery,
	)

	if result.ObjectType != model.OpportunityCompetitor {
		t.Fatalf("expected competitor, got %s", result.ObjectType)
	}
}

func TestNormalizeClassificationMapsTobaccoShopToRetailShop(t *testing.T) {
	result := NormalizeClassification(
		[]string{"tobacco shop"},
		[]string{},
		model.VerticalPharmacy,
	)

	if result.ObjectType != model.OpportunityActiveShop {
		t.Fatalf("expected active shop, got %s", result.ObjectType)
	}
	if result.NormalizedFrom != string(model.VerticalRetail) {
		t.Fatalf("expected retail mapping, got %s", result.NormalizedFrom)
	}
}

func TestNormalizeClassificationPhoneNumberIsVacant(t *testing.T) {
	result := NormalizeClassification(
		[]string{"pharmacy", "drugstore"},
		[]string{"KIRALIK", "0532 123 45 67"},
		model.VerticalPharmacy,
	)

	if result.ObjectType != model.OpportunityVacant {
		t.Fatalf("expected vacant, got %s", result.ObjectType)
	}
	if result.NormalizedFrom != "phone_number_pattern" {
		t.Fatalf("expected phone_number_pattern, got %s", result.NormalizedFrom)
	}
}

func TestContainsPhoneNumber(t *testing.T) {
	if !ContainsPhoneNumber([]string{"Acente: 0212 555 12 34"}) {
		t.Fatal("expected Turkish landline to match")
	}
	if ContainsPhoneNumber([]string{"no contact here"}) {
		t.Fatal("expected no phone match")
	}
}

func TestSampleRouteWaypointsEvery20Meters(t *testing.T) {
	coordinates := []LatLng{
		{Lat: 41.0, Lng: 29.0},
		{Lat: 41.001, Lng: 29.0},
	}
	waypoints := SampleRouteWaypoints(coordinates, 10)

	if len(waypoints) < 2 {
		t.Fatalf("expected multiple samples, got %d", len(waypoints))
	}
	if waypoints[1].DistanceM != SampleIntervalMeters {
		t.Fatalf("expected second point at %dm, got %d", SampleIntervalMeters, waypoints[1].DistanceM)
	}
}
