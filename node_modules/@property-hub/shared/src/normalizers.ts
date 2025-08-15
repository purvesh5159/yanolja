import { CanonicalPropertyProfile, ImageItem } from './types';

function sanitizeArray(value: any): any[] {
	return Array.isArray(value) ? value : [];
}

function safeString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function extractFirstNumber(value: unknown): number | undefined {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const n = Number(value);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

export function normalizeYanolja(raw: any): CanonicalPropertyProfile {
	const item = Array.isArray(raw) ? raw[0] : raw;
	const data = item?.result?.data ?? {};
	const atf = data.atf ?? {};
	const locationSection = data.locationSection ?? {};
	const facilitySection = data.facilitySection ?? {};

	const images: ImageItem[] = [];
	// Best-effort: use photo and any gallery images if present
	if (typeof atf.photo === 'string') {
		images.push({ url: atf.photo, title: '대표 이미지' });
	}
	if (Array.isArray(data?.gallerySection?.images)) {
		for (const g of data.gallerySection.images) {
			if (g?.url) images.push({ url: g.url, title: g?.title });
		}
	}

	const facilities: string[] = [];
	const bodies = sanitizeArray(facilitySection.body);
	for (const body of bodies) {
		const grids = sanitizeArray((body && (body as any).gridComponents) || []);
		for (const grid of grids) {
			const text = (grid && (grid as any).text) as any;
			if (text) facilities.push(String(text));
		}
	}

	const coord = locationSection.coordinate ?? {};
	const review = data.review ?? {};

	return {
		id: String(atf.propertyId ?? ''),
		primaryId: String(atf.propertyId ?? ''),
		sourceIds: { Yanolja: atf.propertyId ? String(atf.propertyId) : undefined },
		name: safeString(atf.name),
		address: safeString(locationSection.address),
		description: safeString(data?.gptReviewSummary?.highReviewSummary?.content) ?? safeString(atf.subtitle),
		nearbyAttractions: sanitizeArray(locationSection?.body)
			.map((b: any) => sanitizeArray(b?.plainTextComponents).map((p: any) => p?.text))
			.flat()
			.filter(Boolean),
		images,
		facilities,
		coordinates: {
			latitude: extractFirstNumber(coord?.latitude),
			longitude: extractFirstNumber(coord?.longitude),
		},
		rating: extractFirstNumber(review?.score),
		reviewCount: extractFirstNumber(review?.reviewCount),
		phone: undefined,
	};
}

export function normalizeOtaY(raw: any, yanoljaFallbackImages?: ImageItem[]): CanonicalPropertyProfile {
	const info = raw?.props?.pageProps?.accommodationInfo ?? {};
	const meta = info.meta ?? {};
	const images: ImageItem[] = [];
	if (Array.isArray(meta.images)) {
		for (const img of meta.images) {
			if (img?.image) images.push({ url: img.image, title: img?.title });
		}
	}
	if (images.length === 0 && Array.isArray(info.newImages)) {
		for (const img of info.newImages) {
			if (img?.image) images.push({ url: img.image, title: img?.title });
		}
	}
	if (images.length === 0 && yanoljaFallbackImages) {
		images.push(...yanoljaFallbackImages);
	}

	const facilities: string[] = [];
	const details = Array.isArray(raw?.props?.pageProps?.details) ? raw.props.pageProps.details : [];
	for (const d of details) {
		if (d?.title && typeof d.title === 'string' && Array.isArray(d.contents)) {
			if (d.title.includes('기본정보') || d.title.includes('부대시설')) {
				for (const c of d.contents) {
					if (typeof c === 'string') {
						c.split(/[•·,、]/).forEach((token) => {
							const t = token.trim();
							if (t) facilities.push(t);
						});
					}
				}
			}
		}
	}

	return {
		id: String(meta.id ?? info.id ?? ''),
		primaryId: String(meta.id ?? info.id ?? ''),
		sourceIds: { Y: meta.id ? String(meta.id) : undefined },
		name: meta.name,
		address: info.address,
		description: raw?.props?.pageProps?.manager?.comment,
		nearbyAttractions: Array.isArray(raw?.props?.pageProps?.traffic?.contents)
			? raw.props.pageProps.traffic.contents.filter((s: any) => typeof s === 'string')
			: [],
		images,
		facilities,
		coordinates: {
			latitude: typeof info?.location?.latitude === 'number' ? info.location.latitude : undefined,
			longitude: typeof info?.location?.longitude === 'number' ? info.location.longitude : undefined,
		},
		phone: info?.tel,
		rating: typeof meta?.review?.rate === 'number' ? meta.review.rate : undefined,
		reviewCount: typeof meta?.review?.count === 'number' ? meta.review.count : undefined,
	};
}

export function normalizeOtaA(raw: any, yanoljaFallbackImages?: ImageItem[]): CanonicalPropertyProfile {
	// otaA files are very large and verbose. Try to pick common paths.
	const hotel = raw?.hotel ?? raw?.data?.hotel ?? raw?.props?.pageProps?.hotel ?? raw;
	let name: string | undefined;
	let address: string | undefined;
	let images: ImageItem[] = [];
	let latitude: number | undefined;
	let longitude: number | undefined;
	let description: string | undefined;
	let phone: string | undefined;

	// Attempt common fields
	name = hotel?.displayName || hotel?.name || raw?.translations?.hotelHeader?.otaAText ? undefined : undefined;
	address = hotel?.address?.full || hotel?.address || raw?.propertyInfo?.address?.fullAddress;
	if (Array.isArray(hotel?.images)) {
		for (const img of hotel.images) {
			if (img?.url) images.push({ url: img.url, title: img?.caption || img?.title });
		}
	}
	if (Array.isArray(hotel?.gallery)) {
		for (const g of hotel.gallery) {
			if (g?.url) images.push({ url: g.url, title: g?.title });
		}
	}
	if (images.length === 0 && yanoljaFallbackImages) {
		images.push(...yanoljaFallbackImages);
	}

	latitude = hotel?.location?.latitude ?? hotel?.geo?.lat ?? raw?.map?.latitude;
	longitude = hotel?.location?.longitude ?? hotel?.geo?.lng ?? raw?.map?.longitude;
	description = hotel?.summary || hotel?.description || raw?.hotelDescription;
	phone = hotel?.contact?.phone || hotel?.phone;

	// Facilities: collect from multiple possible arrays
	const facilities: string[] = [];
	const amenityArrays: any[] = [];
	if (Array.isArray(hotel?.facilities)) amenityArrays.push(hotel.facilities);
	if (Array.isArray(hotel?.amenities)) amenityArrays.push(hotel.amenities);
	if (Array.isArray(raw?.amenities)) amenityArrays.push(raw.amenities);
	for (const arr of amenityArrays) {
		for (const a of arr) {
			if (typeof a === 'string') facilities.push(a);
			else if (a?.name) facilities.push(String(a.name));
			else if (a?.title) facilities.push(String(a.title));
		}
	}

	return {
		id: String(hotel?.id ?? hotel?.hotelId ?? ''),
		primaryId: String(hotel?.id ?? hotel?.hotelId ?? ''),
		sourceIds: { A: hotel?.id ? String(hotel.id) : undefined },
		name,
		address,
		description,
		nearbyAttractions: [],
		images,
		facilities,
		coordinates: { latitude, longitude },
		phone,
		rating: undefined,
		reviewCount: undefined,
	};
}