package urbanscan

import (
	"math"

	"github.com/masterfabric-go/masterfabric/internal/domain/urbanscan/model"
)

// LatLng is a geographic coordinate.
type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// SampleRouteWaypoints returns coordinates every SampleIntervalMeters along a polyline.
func SampleRouteWaypoints(coordinates []LatLng, maxPoints int) []model.RouteWaypoint {
	if len(coordinates) == 0 {
		return nil
	}
	if maxPoints <= 0 {
		maxPoints = 50
	}

	if len(coordinates) == 1 {
		return []model.RouteWaypoint{{
			Lat: coordinates[0].Lat, Lng: coordinates[0].Lng, DistanceM: 0,
		}}
	}

	interval := SampleIntervalMeters
	waypoints := []model.RouteWaypoint{{
		Lat:       coordinates[0].Lat,
		Lng:       coordinates[0].Lng,
		DistanceM: 0,
		Heading:   bearing(coordinates[0], coordinates[1]),
	}}

	traversed := 0.0
	nextSample := float64(interval)

	for index := 0; index < len(coordinates)-1; index++ {
		start := coordinates[index]
		end := coordinates[index+1]
		segmentLength := haversineDistance(start, end)
		if segmentLength == 0 {
			continue
		}

		for nextSample <= traversed+segmentLength {
			if len(waypoints) >= maxPoints {
				return waypoints
			}

			offset := nextSample - traversed
			ratio := offset / segmentLength
			point := interpolate(start, end, ratio)

			lookAhead := end
			if ratio > 0.85 && index < len(coordinates)-2 {
				lookAhead = coordinates[index+2]
			}

			waypoints = append(waypoints, model.RouteWaypoint{
				Lat:       point.Lat,
				Lng:       point.Lng,
				DistanceM: int(math.Round(nextSample)),
				Heading:   bearing(point, lookAhead),
			})
			nextSample += float64(interval)
		}

		traversed += segmentLength
	}

	return waypoints
}

func haversineDistance(a, b LatLng) float64 {
	lat1 := a.Lat * math.Pi / 180
	lat2 := b.Lat * math.Pi / 180
	deltaLat := (b.Lat - a.Lat) * math.Pi / 180
	deltaLng := (b.Lng - a.Lng) * math.Pi / 180

	sinLat := math.Sin(deltaLat / 2)
	sinLng := math.Sin(deltaLng / 2)
	h := sinLat*sinLat + math.Cos(lat1)*math.Cos(lat2)*sinLng*sinLng
	return 2 * earthRadiusM * math.Asin(math.Min(1, math.Sqrt(h)))
}

func bearing(from, to LatLng) float64 {
	lat1 := from.Lat * math.Pi / 180
	lat2 := to.Lat * math.Pi / 180
	deltaLng := (to.Lng - from.Lng) * math.Pi / 180

	y := math.Sin(deltaLng) * math.Cos(lat2)
	x := math.Cos(lat1)*math.Sin(lat2) - math.Sin(lat1)*math.Cos(lat2)*math.Cos(deltaLng)
	deg := math.Atan2(y, x) * 180 / math.Pi
	if deg < 0 {
		deg += 360
	}
	return deg
}

func interpolate(start, end LatLng, ratio float64) LatLng {
	return LatLng{
		Lat: start.Lat + (end.Lat-start.Lat)*ratio,
		Lng: start.Lng + (end.Lng-start.Lng)*ratio,
	}
}
