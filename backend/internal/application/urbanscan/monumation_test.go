package urbanscan

import (
	"testing"
)

func TestScoreMonumationNodeHeritageDominant(t *testing.T) {
	node := ScoreMonumationNode(41.0, 29.0, []string{
		"palace", "monument", "stone wall",
	}, nil)

	if node.HeritageScore < 40 {
		t.Fatalf("expected heritage >= 40, got %.0f", node.HeritageScore)
	}
	if node.DominantMoodTag != "Monumation Heritage Route" {
		t.Fatalf("unexpected mood tag: %s", node.DominantMoodTag)
	}
}

func TestScoreMonumationNodeLowAppeal(t *testing.T) {
	node := ScoreMonumationNode(41.0, 29.0, []string{"car", "truck", "minivan"}, nil)

	if node.DominantMoodTag != "Low Appeal Urban Zone" {
		t.Fatalf("expected low appeal, got %s", node.DominantMoodTag)
	}
}

func TestScoreMonumationNodePollutionPenalty(t *testing.T) {
	node := ScoreMonumationNode(41.0, 29.0, []string{
		"tree", "park", "billboard", "chainlink fence",
	}, nil)

	if node.ScenicScore > 15 {
		t.Fatalf("pollution should reduce scenic score, got %.0f", node.ScenicScore)
	}
}

func TestScoreMonumationNodeBounded(t *testing.T) {
	node := ScoreMonumationNode(41.0, 29.0, []string{
		"palace", "monastery", "church", "mosque", "monument",
		"obelisk", "tree", "forest", "park", "mural", "skyscraper",
	}, nil)

	if node.HeritageScore > 100 || node.ScenicScore > 100 || node.ArtScore > 100 {
		t.Fatalf("scores must be bounded 0-100: h=%.0f s=%.0f a=%.0f",
			node.HeritageScore, node.ScenicScore, node.ArtScore)
	}
}

func TestApplyKVKVMaskPlaceholder(t *testing.T) {
	masked, applied := ApplyKVKVMask("data:image/jpeg;base64,abc")
	if !applied || masked == "" {
		t.Fatal("expected KVKK mask placeholder to apply")
	}
}
