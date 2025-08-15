from typing import Any, Dict, List, Optional
from .canonical_schema import CanonicalProperty, CanonicalAddress, CanonicalImage


def _strip_html(text: Optional[str]) -> Optional[str]:
	if text is None:
		return None
	try:
		# extremely simple stripper; avoid external deps
		import re
		return re.sub(r"<[^>]+>", "", text)
	except Exception:
		return text


# Yanolja mapper

def map_yanolja_to_canonical(y_id: str, payload: Any) -> CanonicalProperty:
	# Some Yanolja payloads are wrapped in a list with {result: {data: ...}}
	if isinstance(payload, list):
		for item in payload:
			if isinstance(item, dict) and isinstance(item.get("result"), dict):
				payload = item["result"].get("data", {})
				break
	# Now expect dict with data or already data
	if isinstance(payload, dict) and "data" in payload:
		payload = payload.get("data", {})
	atf = payload.get("atf", {})
	name = atf.get("name")
	# coordinate/address may appear under locationSection
	location_section = payload.get("locationSection", {})
	coord = atf.get("coordinate", {}) or location_section.get("coordinate", {}) or {}
	address_full = atf.get("address") or atf.get("sharedAddress") or location_section.get("address") or location_section.get("sharedAddress")
	latitude = coord.get("latitude")
	longitude = coord.get("longitude")
	# description from atf.locationDescription or overviewSection
	description = atf.get("locationDescription") or None

	# facilities
	facilities: List[str] = []
	facility_section = payload.get("facilitySection", {})
	for body in facility_section.get("body", []) or []:
		for grid in (body.get("gridComponents") or []):
			text = grid.get("text")
			if text:
				facilities.append(str(text).strip())

	# nearby from locationSection body iconComponents texts
	nearby: List[Dict[str, Any]] = []
	for body in location_section.get("body", []) or []:
		for icon_group in (body.get("iconComponents") or []):
			for t in icon_group.get("texts", []) or []:
				if t:
					nearby.append({"name": str(t)})
		for pt in (body.get("plainTextComponents") or []):
			text = pt.get("text")
			if text:
				nearby.append({"name": str(text)})

	# images: take the atf.photo if present
	images: List[CanonicalImage] = []
	atf_photo = atf.get("photo")
	if atf_photo:
		images.append(CanonicalImage(url=atf_photo))

	address = CanonicalAddress(
		full=address_full,
		latitude=latitude,
		longitude=longitude,
	)

	return CanonicalProperty(
		propertyId=y_id,
		name=name,
		description=description,
		address=address,
		nearbyAttractions=nearby,
		images=images,
		facilities=sorted(list(dict.fromkeys(facilities))),
		extra={"source": "Yanolja"},
	)


# otaA mapper

def map_ota_a_to_canonical(y_id: str, payload: Dict[str, Any]) -> CanonicalProperty:
	hotel_info = payload.get("hotelInfo", {})
	name = hotel_info.get("name")
	addr = payload.get("address") or payload.get("hotelDetails", {}).get("address") or payload.get("hotelSummary", {}).get("address")
	# Fallback to structured address
	address_block = payload.get("address") or payload.get("hotelInfo", {}).get("address") or payload.get("hotelDetails", {}).get("address") or {}
	if not isinstance(address_block, dict):
		address_block = payload.get("hotelInfo", {}).get("address", {})
	address_full = None
	city = None
	country = None
	postal = None
	if isinstance(address_block, dict):
		address_full = address_block.get("full") or address_block.get("address")
		city = address_block.get("cityName") or address_block.get("city")
		country = address_block.get("countryName") or address_block.get("country")
		postal = address_block.get("postalCode") or address_block.get("postcode")

	# Description in aboutHotel.hotelDesc.overview (HTML)
	overview_html = payload.get("aboutHotel", {}).get("hotelDesc", {}).get("overview")
	description = _strip_html(overview_html)

	# Nearby attractions often in nearbyPoints or landmarks; search common path
	nearby: List[Dict[str, Any]] = []
	for key in ("nearbyPoi", "nearby", "landmarks", "nearbyLandmarks"):
		items = payload.get(key) or payload.get("poi", {}).get(key) or []
		if isinstance(items, list):
			for it in items:
				name_it = it.get("name") or it.get("landmarkTypeName")
				if not name_it:
					continue
				nb = {
					"name": name_it,
					"distanceKm": it.get("distance") or it.get("distanceKm"),
					"latitude": it.get("latitude"),
					"longitude": it.get("longitude"),
				}
				nearby.append(nb)

	# Images: many image URLs broken; per spec use Yanolja images for image matching, but we can still return some if present
	images: List[CanonicalImage] = []
	gallery = payload.get("images") or payload.get("gallery") or payload.get("hotelImages") or []
	if isinstance(gallery, list):
		for g in gallery[:8]:
			url = g.get("url") or g.get("featureImageUrl") or g.get("original") or g.get("image")
			if url:
				images.append(CanonicalImage(url=url))

	# Facilities: collect names from features/facilities arrays
	facilities: List[str] = []
	def add_fac(list_obj: Any):
		if isinstance(list_obj, list):
			for it in list_obj:
				name_it = it.get("name") if isinstance(it, dict) else None
				if name_it:
					facilities.append(str(name_it).strip())
	# Try several known keys
	for key in ("features", "facilities", "mostTalkedFacilities", "facilityClasses", "featureClasses", "featureGroups"):
		val = payload.get(key)
		if not val:
			val = payload.get("aboutHotel", {}).get(key)
		add_fac(val)
	# special: reviewFacilityMentions contains facilityIds but not mapped; ignore ids

	address = CanonicalAddress(
		full=address_full,
		city=city,
		postalCode=postal,
		country=country,
	)
	return CanonicalProperty(
		propertyId=y_id,
		name=name,
		description=description,
		address=address,
		nearbyAttractions=nearby,
		images=images,
		facilities=sorted(list(dict.fromkeys(facilities))),
		extra={"source": "otaA"},
	)


# otaY mapper

def map_ota_y_to_canonical(y_id: str, payload: Dict[str, Any]) -> CanonicalProperty:
	meta = payload.get("accommodationInfo", {}).get("meta", {})
	name = meta.get("name")
	address_full = meta.get("address")
	loc = meta.get("location", {})
	latitude = loc.get("latitude")
	longitude = loc.get("longitude")

	# Description: manager.comment present
	manager_comment = payload.get("accommodationInfo", {}).get("manager", {}).get("comment")
	description = manager_comment

	# Images
	images: List[CanonicalImage] = []
	for img in meta.get("images", [])[:10]:
		url = img.get("image")
		if url:
			images.append(CanonicalImage(url=url, title=img.get("title")))

	# Facilities under theme.items
	facilities: List[str] = []
	theme = payload.get("accommodationInfo", {}).get("theme", {})
	for it in theme.get("items", []) or []:
		name_it = it.get("name")
		if name_it:
			facilities.append(str(name_it).strip())

	address = CanonicalAddress(
		full=address_full,
		latitude=latitude,
		longitude=longitude,
	)
	return CanonicalProperty(
		propertyId=y_id,
		name=name,
		description=description,
		address=address,
		nearbyAttractions=[],
		images=images,
		facilities=sorted(list(dict.fromkeys(facilities))),
		extra={"source": "otaY"},
	)