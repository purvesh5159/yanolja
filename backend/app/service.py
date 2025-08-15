from typing import Dict, Any
from .dataset import load_all_for_property
from .mappers import map_yanolja_to_canonical, map_ota_a_to_canonical, map_ota_y_to_canonical
from .scoring import compute_scores


def consolidate_property(y_id: str) -> Dict[str, Any]:
	loaded = load_all_for_property(y_id)
	if not loaded:
		return {
			"error": f"Property {y_id} not found or incomplete OTA files"
		}
	y_payload, a_payload, y2_payload, paths = loaded
	# Map to canonical structures
	canon_y = map_yanolja_to_canonical(y_id, y_payload).to_dict()
	canon_a = map_ota_a_to_canonical(y_id, a_payload).to_dict()
	canon_y2 = map_ota_y_to_canonical(y_id, y2_payload).to_dict()

	# As per note: Image matching last using Yanolja images on both sides
	# For clarity we keep images as-is; scoring function already handles images preference

	score_vs_a = compute_scores(canon_y, canon_a)
	score_vs_y2 = compute_scores(canon_y, canon_y2)

	# Canonical merged view: Prefer Yanolja for core fields, but enrich with extra where missing
	canonical_merged = canon_y.copy()
	if not canonical_merged.get("description"):
		canonical_merged["description"] = canon_a.get("description") or canon_y2.get("description")
	# Merge facilities
	fac_set = set(canonical_merged.get("facilities", []) or [])
	for f in (canon_a.get("facilities", []) or []) + (canon_y2.get("facilities", []) or []):
		if f:
			fac_set.add(f)
	canonical_merged["facilities"] = sorted(fac_set)
	# Merge images: keep Yanolja first, then add others up to 20
	images = canonical_merged.get("images", []) or []
	def _img_url_list(imgs):
		return [im.get("url") for im in imgs if isinstance(im, dict)]
	existing_urls = set(_img_url_list(images))
	for source_imgs in [canon_a.get("images", []) or [], canon_y2.get("images", []) or []]:
		for im in source_imgs:
			url = im.get("url") if isinstance(im, dict) else None
			if url and url not in existing_urls and len(images) < 20:
				images.append(im)
				existing_urls.add(url)
	canonical_merged["images"] = images

	return {
		"propertyId": y_id,
		"canonical": canonical_merged,
		"sources": {
			"yanolja": canon_y,
			"otaA": canon_a,
			"otaY": canon_y2,
		},
		"comparison": {
			"yanolja_vs_otaA": score_vs_a,
			"yanolja_vs_otaY": score_vs_y2,
		},
	}