package model

// EntrepreneurVertical is the Turkish entrepreneur target business type.
type EntrepreneurVertical string

const (
	VerticalCoffeeShop  EntrepreneurVertical = "coffee_shop"
	VerticalElectrician EntrepreneurVertical = "electrician"
	VerticalRestaurant  EntrepreneurVertical = "restaurant"
	VerticalRetail      EntrepreneurVertical = "retail"
	VerticalBarber      EntrepreneurVertical = "barber"
	VerticalPharmacy    EntrepreneurVertical = "pharmacy"
	VerticalGrocery     EntrepreneurVertical = "grocery"
)

// OpportunityType is the storefront opportunity classification.
type OpportunityType string

const (
	OpportunityVacant      OpportunityType = "vacant"
	OpportunityForRent     OpportunityType = "for_rent"
	OpportunityForSale     OpportunityType = "for_sale"
	OpportunityCompetitor  OpportunityType = "competitor"
	OpportunityActiveShop  OpportunityType = "shop"
	OpportunityUnclassified OpportunityType = "unknown"
)

// DetectionResult is the normalized output for a single sample point.
type DetectionResult struct {
	ObjectType       OpportunityType      `json:"objectType"`
	BusinessVertical EntrepreneurVertical `json:"businessVertical"`
	Confidence       float64              `json:"confidence"`
	MatchedLabel     string               `json:"matchedLabel,omitempty"`
	SignText         string               `json:"signText,omitempty"`
	NormalizedFrom   string               `json:"normalizedFrom,omitempty"`
	PlacesName       string               `json:"placesName,omitempty"`
	PlacesTypes      []string             `json:"placesTypes,omitempty"`
	PlacesVerified   bool                 `json:"placesVerified,omitempty"`
}

// RouteWaypoint is a sampled coordinate along a corridor.
type RouteWaypoint struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	DistanceM int     `json:"distanceM"`
	Heading   float64 `json:"heading,omitempty"`
}
