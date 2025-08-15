## Property Hub (Yanolja Assignment)

A monorepo that consolidates property data from multiple OTAs into a canonical profile, computes similarity vs Yanolja, and presents a rich UI with comparison visuals.

### Monorepo Layout
- `apps/api`: TypeScript Express API (normalization, comparison, endpoints)
- `apps/web`: Vite + React UI (consolidated view, raw JSON, creative visuals)
- `packages/shared`: Shared types, similarity utilities, normalizers
- `data/Propery_Hub_JSON`: Place unzipped datasets here (or override with DATA_ROOT)

### Prerequisites
- Node.js 18+ (tested with 22.x)

### Dataset
- Unzip `Propery_Hub_JSON.zip` into one of:
  - `<project>/data/Propery_Hub_JSON` (recommended)
  - Or set `DATA_ROOT` to the absolute path (see below)

### Environment
- DATA_ROOT (optional): absolute path to the folder containing OTA JSON directories
  - Linux/macOS: `export DATA_ROOT="/abs/path/to/data/Propery_Hub_JSON"`
  - Windows (PowerShell): `$env:DATA_ROOT="D:\\path\\to\\data\\Propery_Hub_JSON"`

### Install & Run (dev)
- Install per workspace:
  - Shared: `npm --workspace packages/shared install && npm --workspace packages/shared run build`
  - API: `npm --workspace apps/api install`
  - Web: `npm --workspace apps/web install`
- Run:
  - API: `npm --workspace apps/api run dev` (or `npm --workspace apps/api run build && node apps/api/dist/index.js`)
  - Web: `npm --workspace apps/web run dev` then open `http://localhost:5173`
- Root one-liners:
  - API only: `npm --workspace packages/shared run build && npm --workspace apps/api run build && node apps/api/dist/index.js`
  - Web only: `npm --workspace apps/web run dev`

### API
Base URL (dev)
- API: `http://localhost:3001`
- Web dev server (proxies /api): `http://localhost:5173`

Endpoints
- `GET /api/properties`
  - Returns: `[ { id: string } ]`
- `GET /api/properties/:id`
  - Returns: `{ id, canonical, comparisons, sourcesAvailability }`
  - comparisons include `vsA` and `vsY`, each with match percentages for Name, Address, Images, Facilities, and Overall
- `GET /api/properties/:id/raw`
  - Returns raw OTA payloads `{ yanolja, a, y }`

Example
```bash
curl http://localhost:3001/api/properties/3000605
```

### Canonical Schema (TypeScript)
```12:63:packages/shared/src/types.ts
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
	starRating?: number;
	checkInTime?: string;
	checkOutTime?: string;
	propertyType?: string;
	parkingAvailable?: boolean;
	languages: string[];
	policies: Record<string, string[]>; // e.g. { "취소 및 환불 규정": ["...", ...] }
	onSiteDining: string[]; // e.g. ["레스토랑", "카페", "Bar"]
	roomTypes: RoomTypeSummary[];
	breakfastAvailable?: boolean;
	breakfastDetails: string[];
	petPolicy: string[];
	nearbyTransport: string[];
}
```

### Matching & Similarity
- Base reference: Yanolja
- Fields compared: Name, Address, Images, Facilities
- Overall score = 35% Name + 35% Address + 20% Facilities + 10% Images
- Algorithms:
  - Name/Address: Levenshtein-based string similarity (normalized)
  - Facilities: Jaccard over normalized sets
  - Images: Compare titles (or fall back to Yanolja images on both sides per instructions)

Image Note
- otaA/otaY image URLs may be broken; we use Yanolja images as fallback and compare by titles on both sides, only after Name/Address/Facilities.

### UI
- Consolidated Property View: name, address, description, images, facilities, enhanced fields (star rating, check-in/out, on-site dining, languages, breakfast, pet policy, room types, nearby transport)
- Match Visualization: donut charts (overall) + radar chart (per-field) + confidence badges
- Raw Data View: OTA-specific raw JSON (Yanolja, otaA, otaY)

### Architecture & Decisions
- Monorepo to keep API, Web, and Shared logic aligned
- Shared package contains types, normalizers, and similarity utils for consistency
- Normalizers are best-effort and handle sparse/variant schemas
- Images are matched using titles and fallbacks (Yanolja-first) as per the NOTE
- API returns both canonical profile and comparisons; UI renders both consolidated and raw data

### Assumptions
- Datasets are small, loaded on demand from filesystem (no DB)
- otaA schema is verbose; normalizer uses resilient heuristic paths
- Language/dining/transport inferred from facilities/sections where feasible

### Challenges Addressed
- Schema differences across OTAs: tolerant normalizers and fallback logic
- Incomplete data: null-safe extraction + sensible defaults
- Matching design: combined string/set similarity with weights
- Presentation: added visual cues (donut/radar/confidence) to aid understanding

### Disclaimer
All OTA names used here are for simulation. All data is fictional and for evaluation only; any resemblance is coincidental.
