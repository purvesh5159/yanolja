import json
import os
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Any, List


WORKSPACE_ROOT = "/workspace"


@dataclass
class OtaFilePaths:
	property_dir: str
	yanolja_path: str
	ota_a_path: str
	ota_y_path: str


def find_property_directory_by_yanolja_id(y_id: str) -> Optional[str]:
	"""Finds a directory in the workspace that ends with _{y_id}."""
	for entry in os.listdir(WORKSPACE_ROOT):
		full_path = os.path.join(WORKSPACE_ROOT, entry)
		if not os.path.isdir(full_path):
			continue
		if entry.endswith(f"_{y_id}"):
			return full_path
	return None


def find_latest_file_in(dir_path: str) -> Optional[str]:
	"""Return the JSON file path in dir_path; if multiple, pick the lexicographically last one."""
	if not os.path.isdir(dir_path):
		return None
	json_files: List[str] = [
		os.path.join(dir_path, f)
		for f in os.listdir(dir_path)
		if f.lower().endswith(".json")
	]
	if not json_files:
		return None
	json_files.sort()
	return json_files[-1]


def resolve_ota_files(y_id: str) -> Optional[OtaFilePaths]:
	property_dir = find_property_directory_by_yanolja_id(y_id)
	if not property_dir:
		return None
	yanolja_dir = os.path.join(property_dir, "Yanolja")
	ota_a_dir = os.path.join(property_dir, "A")
	ota_y_dir = os.path.join(property_dir, "Y")
	yanolja_path = find_latest_file_in(yanolja_dir)
	ota_a_path = find_latest_file_in(ota_a_dir)
	ota_y_path = find_latest_file_in(ota_y_dir)
	if not (yanolja_path and ota_a_path and ota_y_path):
		return None
	return OtaFilePaths(
		property_dir=property_dir,
		yanolja_path=yanolja_path,
		ota_a_path=ota_a_path,
		ota_y_path=ota_y_path,
	)


def load_json(path: str) -> Any:
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)


def load_all_for_property(y_id: str) -> Optional[Tuple[Any, Any, Any, OtaFilePaths]]:
	paths = resolve_ota_files(y_id)
	if not paths:
		return None
	return (
		load_json(paths.yanolja_path),
		load_json(paths.ota_a_path),
		load_json(paths.ota_y_path),
		paths,
	)


def list_available_properties() -> List[str]:
	result: List[str] = []
	for entry in os.listdir(WORKSPACE_ROOT):
		full_path = os.path.join(WORKSPACE_ROOT, entry)
		if not os.path.isdir(full_path):
			continue
		parts = entry.split("_")
		if len(parts) >= 2 and parts[-1].isdigit():
			# Verify it looks like a property directory with OTA subfolders
			if all(os.path.isdir(os.path.join(full_path, sub)) for sub in ("Yanolja", "A", "Y")):
				result.append(parts[-1])
	return sorted(result)