from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class CanonicalImage:
	url: str
	title: Optional[str] = None


@dataclass
class CanonicalAddress:
	full: Optional[str] = None
	street: Optional[str] = None
	city: Optional[str] = None
	state: Optional[str] = None
	postalCode: Optional[str] = None
	country: Optional[str] = None
	latitude: Optional[float] = None
	longitude: Optional[float] = None


@dataclass
class CanonicalProperty:
	propertyId: str
	name: Optional[str]
	description: Optional[str]
	address: CanonicalAddress
	nearbyAttractions: List[Dict[str, Any]] = field(default_factory=list)
	images: List[CanonicalImage] = field(default_factory=list)
	facilities: List[str] = field(default_factory=list)
	extra: Dict[str, Any] = field(default_factory=dict)

	def to_dict(self) -> Dict[str, Any]:
		# Convert dataclass to dict, including nested structures
		data = asdict(self)
		return data