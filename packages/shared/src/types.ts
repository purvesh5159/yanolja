export type OtaId = 'Yanolja' | 'A' | 'Y';

export interface GeoCoordinate {
	latitude?: number;
	longitude?: number;
}

export interface ImageItem {
	url: string;
	title?: string;
}

export interface CanonicalPropertyProfile {
	id: string;
	primaryId: string; // same as id for now
	sourceIds: Partial<Record<OtaId, string>>;
	name?: string;
	address?: string;
	description?: string;
	nearbyAttractions: string[];
	images: ImageItem[];
	facilities: string[];
	coordinates?: GeoCoordinate;
	phone?: string;
	rating?: number;
	reviewCount?: number;
	// Enhanced fields
	starRatingText?: string;
	checkInTime?: string;
	checkOutTime?: string;
	propertyType?: string;
	parkingAvailable?: boolean;
	languages: string[];
	policies: Record<string, string[]>; // e.g. { "취소 및 환불 규정": ["...", ...] }
	onSiteDining: string[]; // e.g. ["레스토랑", "카페", "Bar"]
}

export interface FieldMatchBreakdown {
	name: number;
	address: number;
	images: number;
	facilities: number;
	overall: number;
}

export interface ComparisonResult {
	base: OtaId; // 'Yanolja'
	target: OtaId; // 'A' | 'Y'
	scores: FieldMatchBreakdown;
}

export interface ConsolidatedResponse {
	id: string;
	canonical: CanonicalPropertyProfile;
	comparisons: Partial<Record<'vsA' | 'vsY', ComparisonResult>>;
	sourcesAvailability: Partial<Record<OtaId, boolean>>;
}