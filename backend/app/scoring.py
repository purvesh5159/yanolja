from typing import Dict, Any, List, Tuple
from difflib import SequenceMatcher


def _normalize_text(s: Any) -> str:
	if s is None:
		return ""
	s = str(s).strip().lower()
	return s


def string_similarity(a: Any, b: Any) -> float:
	return SequenceMatcher(None, _normalize_text(a), _normalize_text(b)).ratio()


def list_string_overlap(a_list: List[str], b_list: List[str]) -> float:
	if not a_list and not b_list:
		return 1.0
	if not a_list or not b_list:
		return 0.0
	set_a = { _normalize_text(x) for x in a_list if x }
	set_b = { _normalize_text(x) for x in b_list if x }
	if not set_a and not set_b:
		return 1.0
	if not set_a or not set_b:
		return 0.0
	intersection = len(set_a & set_b)
	union = len(set_a | set_b)
	return intersection / union if union else 0.0


def address_similarity(addr_a: Dict[str, Any], addr_b: Dict[str, Any]) -> float:
	# Prefer full address string comparison with slight weight for coordinates if present
	score_parts: List[float] = []
	full_a = addr_a.get("full") or ""
	full_b = addr_b.get("full") or ""
	if full_a or full_b:
		score_parts.append(string_similarity(full_a, full_b))
	# Coordinates
	lat_a, lng_a = addr_a.get("latitude"), addr_a.get("longitude")
	lat_b, lng_b = addr_b.get("latitude"), addr_b.get("longitude")
	if all(v is not None for v in (lat_a, lng_a, lat_b, lng_b)):
		# if within ~100m -> full score boost, else 0
		from math import radians, sin, cos, asin, sqrt
		def haversine(lat1, lon1, lat2, lon2):
			R = 6371000.0
			dlat = radians(lat2 - lat1)
			dlon = radians(lon2 - lon1)
			alat1 = radians(lat1)
			alat2 = radians(lat2)
			a = sin(dlat/2)**2 + cos(alat1)*cos(alat2)*sin(dlon/2)**2
			c = 2 * asin(sqrt(a))
			return R * c
		d = haversine(lat_a, lng_a, lat_b, lng_b)
		coord_score = 1.0 if d <= 100 else 0.0
		score_parts.append(coord_score)
	return sum(score_parts) / len(score_parts) if score_parts else 0.0


def image_similarity(y_images: List[Dict[str, Any]], other_images: List[Dict[str, Any]]) -> float:
	# Per note, use Yanolja images on both sides in case of broken links.
	if not y_images:
		return 0.0
	# If any, count as matched since we project Yanolja images to both
	return 1.0 if other_images is not None else 0.0


def compute_scores(y_base: Dict[str, Any], other: Dict[str, Any]) -> Dict[str, float]:
	name_score = string_similarity(y_base.get("name"), other.get("name"))
	address_score = address_similarity(y_base.get("address", {}), other.get("address", {}))
	facilities_score = list_string_overlap(y_base.get("facilities", []), other.get("facilities", []))
	# "Images" are considered matched if there are images in Yanolja; projection as per requirement
	images_score = image_similarity(y_base.get("images", []), other.get("images", []))
	# Overall: weighted average
	weights = {
		"name": 0.25,
		"address": 0.35,
		"facilities": 0.25,
		"images": 0.15,
	}
	overall = (
		name_score * weights["name"]
		+ address_score * weights["address"]
		+ facilities_score * weights["facilities"]
		+ images_score * weights["images"]
	)
	return {
		"name": round(name_score * 100, 2),
		"address": round(address_score * 100, 2),
		"facilities": round(facilities_score * 100, 2),
		"images": round(images_score * 100, 2),
		"overall": round(overall * 100, 2),
	}