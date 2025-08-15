import { CanonicalPropertyProfile, ImageItem, RoomTypeSummary } from './types';

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

	// Enhanced fields
	const starRatingText = safeString(atf.hotelStar);
	const starRating = starRatingText ? extractFirstNumber(starRatingText.replace(/[^0-9]/g, '')) : undefined;
	let checkInTime: string | undefined;
	let checkOutTime: string | undefined;
	let languages: string[] = [];
	let onSiteDining: string[] = [];
	let policies: Record<string, string[]> = {};
	let roomTypes: RoomTypeSummary[] = [];
	let breakfastAvailable: boolean | undefined;
	let breakfastDetails: string[] = [];
	let petPolicy: string[] = [];
	let nearbyTransport: string[] = [];

	const detailsSections = sanitizeArray(data?.detailSection?.body);
	for (const sec of detailsSections) {
		const title = (sec && (sec as any).title) || undefined;
		const contents = sanitizeArray((sec && (sec as any).plainTextComponents) || []).map((p: any) => p?.text).filter(Boolean);
		if (title && contents.length) {
			policies[title] = contents as string[];
		}
	}
	languages = facilities.filter((f) => /한국어|영어|일본어|중국어/i.test(f));
	onSiteDining = facilities.filter((f) => /(레스토랑|카페|Bar|바)/i.test(f));
	breakfastAvailable = facilities.some((f) => /조식/i.test(f));

	// Yanolja may have room types in sections; try simple heuristic
	const roomTypeSection = sanitizeArray(data?.roomSection?.rooms);
	for (const r of roomTypeSection) {
		roomTypes.push({ id: r?.id, name: r?.name, images: sanitizeArray(r?.images).map((i: any) => ({ url: i?.url || i?.image, title: i?.title })) });
	}

	// Nearby transport from location body
	nearbyTransport = sanitizeArray(locationSection?.body)
		.map((b: any) => sanitizeArray(b?.plainTextComponents).map((p: any) => p?.text))
		.flat()
		.filter((t: any) => typeof t === 'string' && /역|교통|셔틀|분|km|m/.test(t));

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
		starRatingText,
		starRating,
		checkInTime,
		checkOutTime,
		propertyType: undefined,
		parkingAvailable: facilities.some((f) => /주차/i.test(f)),
		languages,
		policies,
		onSiteDining,
		roomTypes,
		breakfastAvailable,
		breakfastDetails,
		petPolicy,
		nearbyTransport,
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
	let checkInTime: string | undefined;
	let checkOutTime: string | undefined;
	let policies: Record<string, string[]> = {};
	let breakfastDetails: string[] = [];
	let petPolicy: string[] = [];
	for (const d of details) {
		if (d?.title && typeof d.title === 'string' && Array.isArray(d.contents)) {
			const contents = d.contents.filter((s: any) => typeof s === 'string');
			if (d.title.includes('기본정보')) {
				for (const c of contents) {
					const m = /체크인\s*:\s*([^|]+)\|\s*체크아웃\s*:\s*([^|]+)/.exec(c);
					if (m) {
						checkInTime = m[1].trim();
						checkOutTime = m[2].trim();
					}
					c.split(/[•·,、]/).forEach((token: string) => {
						const t = token.trim();
						if (t) facilities.push(t);
					});
				}
			} else if (d.title.includes('취소') || d.title.includes('확인사항') || d.title.includes('애견') || d.title.includes('인원')) {
				policies[d.title] = contents as string[];
				if (d.title.includes('애견')) petPolicy = contents as string[];
			} else if (d.title.includes('조식')) {
				breakfastDetails = contents as string[];
			} else if (d.title.includes('부대시설')) {
				for (const c of contents) {
					c.split(/[,、]/).forEach((token: string) => {
						const t = token.trim();
						if (t) facilities.push(t);
					});
				}
			}
		}
	}

	// Room types
	const roomTypes: RoomTypeSummary[] = [];
	const rooms = Array.isArray(raw?.props?.pageProps?.rooms) ? raw.props.pageProps.rooms : [];
	for (const r of rooms) {
		const imgs = sanitizeArray(r?.images).concat(sanitizeArray(r?.newImages)).map((i: any) => ({ url: i?.image || i?.url, title: undefined })).filter((x: any) => x.url);
		roomTypes.push({ id: r?.id, name: r?.name, images: imgs });
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
		starRatingText: meta?.grade,
		starRating: undefined,
		checkInTime,
		checkOutTime,
		propertyType: String(meta?.category ?? ''),
		parkingAvailable: facilities.some((f) => /주차/i.test(f)),
		languages: facilities.filter((f) => /한국어|영어|일본어|중국어/i.test(f)),
		policies,
		onSiteDining: facilities.filter((f) => /(레스토랑|카페|Bar|바)/i.test(f)),
		roomTypes,
		breakfastAvailable: breakfastDetails.length > 0,
		breakfastDetails,
		petPolicy,
		nearbyTransport: Array.isArray(raw?.props?.pageProps?.traffic?.contents) ? raw.props.pageProps.traffic.contents : [],
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

	name = hotel?.displayName || hotel?.name || undefined;
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

	// Room types not standardized in otaA dump; leave empty or infer if present
	const roomTypes: RoomTypeSummary[] = [];

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
		starRatingText: undefined,
		starRating: undefined,
		checkInTime: undefined,
		checkOutTime: undefined,
		propertyType: undefined,
		parkingAvailable: facilities.some((f) => /parking|주차/i.test(f)),
		languages: facilities.filter((f) => /korean|english|japanese|chinese|한국어|영어|일본어|중국어/i.test(f)),
		policies: {},
		onSiteDining: facilities.filter((f) => /(restaurant|cafe|bar|레스토랑|카페|Bar|바)/i.test(f)),
		roomTypes,
		breakfastAvailable: undefined,
		breakfastDetails: [],
		petPolicy: [],
		nearbyTransport: [],
	};
}