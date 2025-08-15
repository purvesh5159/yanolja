## Property Hub – Interview Guide (Beginner Friendly)

This document explains the codebase and design choices so you can confidently discuss architecture, problem-solving, and trade-offs in an interview.

---

### 1) What this app does (Executive Summary)
- Consolidates property data from 3 OTAs (Yanolja, otaA, otaY) into a single Canonical JSON model
- Compares Yanolja vs otaA and Yanolja vs otaY to compute match percentages for Name, Address, Images, Facilities, and an Overall score
- Exposes an API for fetching canonical data plus raw OTA data by Property ID
- Provides a React UI showing a consolidated view, match visuals (donut + radar), and raw JSON per OTA

---

### 2) Architecture Overview
Monorepo (npm workspaces) to keep API, Web, and Shared logic in sync.

```
property-hub-monorepo/
├─ apps/
│  ├─ api/          # Express + TypeScript API
│  └─ web/          # Vite + React UI
└─ packages/
   └─ shared/       # Types, normalizers, similarity utils (TypeScript)
```

- Shared package avoids duplication and guarantees API/UI use the same schema and similarity logic
- Filesystem is the “data source” (no DB) making it simple for a take-home

---

### 3) Tech Stack (and why)
- TypeScript: Type safety, cleaner contracts between API/UI
- Node.js + Express: Fast to implement simple JSON APIs
- React + Vite: Frictionless dev server, modern UI tooling
- Recharts: Simple charting for visuals (donut and radar)
- npm workspaces: Monorepo for shared code across packages

Alternatives (why not used):
- NestJS could provide stronger structure; Express is lighter/faster to implement
- Next.js could unify API + UI; monorepo was clearer separation for this exercise

---

### 4) Canonical Data Model (What and Why)
The Canonical JSON has the required fields plus “enhanced” fields to enrich the profile.

Key required fields: Name, Address, Description, Nearby Attractions, Images, Facilities

Enhanced fields (examples): starRating, checkIn/checkOut, propertyType, parkingAvailable, languages, policies, onSiteDining, roomTypes, breakfast info, petPolicy, nearbyTransport

Schema (excerpt):
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
	policies: Record<string, string[]>;
	onSiteDining: string[];
	roomTypes: RoomTypeSummary[];
	breakfastAvailable?: boolean;
	breakfastDetails: string[];
	petPolicy: string[];
	nearbyTransport: string[];
}
```
Why enhanced fields? They improve the property profile and make comparison more meaningful for real users.

---

### 5) Data Normalization – How schemas are unified
Goal: Each OTA has different JSON shapes; we transform into the Canonical model.

Where: `packages/shared/src/normalizers.ts`
- `normalizeYanolja(raw)` – Yanolja is the “base” reference
- `normalizeOtaY(raw, yanoljaFallbackImages)` – otaY
- `normalizeOtaA(raw, yanoljaFallbackImages)` – otaA (large, verbose payloads)

Core techniques:
- Defensive parsing (check arrays/fields exist)
- Best-effort path probing (different possible locations for fields)
- Fallbacks: If otaA/otaY images are broken/missing, reuse Yanolja’s images for comparison titles (as per instructions)
- Keyword heuristics for facilities/language/dining/policies

Trade-offs:
- Given this is a take-home with unknown schema variance, normalization uses tolerant heuristics over rigid validation
- For production, you’d add schema validators (e.g., Zod) and per-OTA mapping configs with tests

---

### 6) Similarity and Matching Design
What we compare:
- Name (string similarity)
- Address (string similarity)
- Images (image titles, using Yanolja images on both sides if OTA image links are broken)
- Facilities (set similarity)

Where: `packages/shared/src/similarity.ts`
- String similarity: Levenshtein-distance-based (normalized to 0–100%)
- Set similarity (Jaccard): |A ∩ B| / |A ∪ B| converted to 0–100%
- Images: Compare titles array via set similarity (fallback to Yanolja titles as required)

Overall score (weights):
- Name 35% + Address 35% + Facilities 20% + Images 10%

Why these weights?
- Name and Address define identity; facilities/images are helpful but secondary

Potential Improvements:
- Token-level comparison (ignore stop-words, handle synonyms)
- Geo distance check for addresses (if coordinates available)
- Address normalization library
- Image hashing (phash) rather than titles (heavier for take-home)

---

### 7) Service Layer (API)
App: `apps/api`

Endpoints
- `GET /api/properties` – list property IDs
- `GET /api/properties/:id` – canonical JSON + comparison scores
- `GET /api/properties/:id/raw` – raw OTA JSON payloads
- `GET /api/health` – health check with resolved data root and property count

Data root resolution (Windows/macOS/Linux):
- Env var `DATA_ROOT` takes priority
- Falls back to commonly used relative paths

Caching
- Simple in-memory cache per property to avoid repeated parsing

Error Handling
- 404 if property set not found
- 500 if Yanolja base is missing

---

### 8) UI/UX & Presentation
App: `apps/web` (Vite + React)

Views
- Consolidated view: shows canonical data + enhanced fields
- Match visuals: donut charts (overall score) + radar chart (Name/Address/Images/Facilities)
- Confidence badges (High/Medium/Low) per OTA overall match
- Raw data view: Yanolja, otaA, otaY JSON for transparency

Design Choices
- Minimal, readable cards and chips (no heavy CSS frameworks to keep focus on logic)
- Visual cues for quick insight; raw data for auditability

Potential Enhancements
- Side-by-side diff (highlighting which field differs)
- Facilities overlap (Only Yanolja / Only OTA / Both)
- Filter/search across properties

---

### 9) Setup & Running
Prerequisite: Node 18+

Data
- Unzip the dataset into `<project>/data/Propery_Hub_JSON` (recommended)
- Or set `DATA_ROOT` to the absolute path

Run API
```
npm --workspace packages/shared run build
npm --workspace apps/api run build
node apps/api/dist/index.js
```

Run Web (Dev)
```
npm --workspace apps/web install
npm --workspace apps/web run dev
# open http://localhost:5173
```
The dev server proxies `/api` to the API on port 3001.

---

### 10) Testing Strategy (what to add next)
- Unit tests for normalizers (fixture-based)
- Unit tests for similarity (edge cases: empty strings, identical, partial)
- Contract tests for API endpoints (status codes, payload shapes)
- Snapshot tests for UI components with stubbed data

---

### 11) Performance & Scaling
- Current dataset is tiny; filesystem reads are fine
- For larger datasets:
  - Pre-index and cache in memory or store in a DB
  - Batch normalization offline; serve prebuilt canonical profiles
  - Add pagination and filtering to `/api/properties`

---

### 12) Security & Robustness
- CORS enabled for dev; restrict origins in production
- Avoids arbitrary file access (scans a known directory)
- Future: input sanitization for `:id` route, rate limiting

---

### 13) Trade-offs & Alternatives
- Heuristics over exact mapping due to unknown schema variance
- Kept code readable, pragmatic for a 48–72h take-home
- Monorepo for shared logic; could be separate repos in a larger org

---

### 14) Common Interview Q&A
1) Why TypeScript?
- Prevents many classes of runtime bugs, documents contracts between layers, improves IDE support

2) Why Express (not Nest/Next)?
- Lightweight and fast to implement; enough for a couple of JSON endpoints

3) How did you handle schema differences?
- Tolerant normalizers probing multiple paths, with fallbacks to Yanolja images and heuristic extraction of facilities/sections

4) How do you compute similarity?
- Levenshtein-based normalized string similarity for name/address; Jaccard for sets (facilities); image titles compare; weighted overall

5) What about broken OTA images?
- Per requirements, use Yanolja images for both sides when OTA images are broken/missing; compare titles only after other fields

6) How would you improve matching?
- Tokenization, synonym dictionaries, fuzzy address normalization, geospatial checks, image hashing, ML-based entity matching

7) How would this scale?
- Precompute canonical profiles, add persistence, caching, pagination, and background jobs for new data ingestion

8) How did you ensure UX clarity?
- Combined visuals (donut/radar), confidence badges, chips, and raw JSON for transparency

9) What’s your error handling strategy?
- 404 vs 500 on API; UI shows loading/fallback states; health endpoint to debug environment paths

10) What was the biggest challenge?
- Designing flexible normalizers for heterogeneous schemas while keeping code readable and resilient in a short time

---

### 15) Submission Notes
- Include this document and the main README
- Provide run steps, environment notes, and assumptions
- If needed, record a short screen capture walkthrough of the flow

Good luck on your interview! You’ve got this. 💪