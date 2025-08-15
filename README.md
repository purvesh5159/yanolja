# Property Hub

Backend: FastAPI
Frontend: Static HTML

## Setup

1. Create venv and install deps:

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Run API:

```
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Open UI:

- Use a simple static server or open `frontend/index.html` in your browser. If running locally, the UI tries to call `http://localhost:8000`.

## API

- GET `/health` → `{status: ok}`
- GET `/properties` → `{properties: ["3000605", "3000715", ...]}`
- GET `/properties/{yanolja_id}` →
  - `canonical`: merged canonical JSON (Yanolja-first with enrichments)
  - `sources`: individual canonical per OTA (Yanolja, otaA, otaY)
  - `comparison`: match percentages per field and overall for Yanolja vs otaA and Yanolja vs otaY

## Canonical JSON Schema

```
{
  propertyId: string,
  name: string,
  description: string | null,
  address: {
    full?: string,
    street?: string,
    city?: string,
    state?: string,
    postalCode?: string,
    country?: string,
    latitude?: number,
    longitude?: number
  },
  nearbyAttractions: Array<{ name: string, distanceKm?: number, latitude?: number, longitude?: number }>,
  images: Array<{ url: string, title?: string }>,
  facilities: string[],
  extra: object
}
```

## Matching / Scoring

- Name: fuzzy string similarity
- Address: fuzzy on full address + coordinate proximity (<=100m → match)
- Facilities: Jaccard overlap across normalized names
- Images: per instruction, treated as matched by reusing Yanolja images on both sides
- Overall: weighted average (name 25%, address 35%, facilities 25%, images 15%)

## Notes / Assumptions

- Yanolja is the source of truth; canonical merged view enriches missing description/facilities/images from others.
- otaA and otaY schemas differ widely; mappers use robust fallbacks and ignore unavailable sections.
- Image URLs from otaA/otaY may be broken; image matching lenient per requirement.
- Frontend is a minimal SPA to visualize consolidated profile, raw sources, and match scores.
