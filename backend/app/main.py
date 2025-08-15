from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .service import consolidate_property
from .dataset import list_available_properties

app = FastAPI(title="Property Hub API", version="1.0.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/health")
async def health():
	return {"status": "ok"}


@app.get("/properties")
async def properties():
	return {"properties": list_available_properties()}


@app.get("/properties/{yanolja_id}")
async def get_property(yanolja_id: str):
	data = consolidate_property(yanolja_id)
	if "error" in data:
		raise HTTPException(status_code=404, detail=data["error"])
	return data