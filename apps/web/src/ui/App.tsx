import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';

type FieldMatchBreakdown = {
	name: number;
	address: number;
	images: number;
	facilities: number;
	overall: number;
};

type Comparison = {
	base: 'Yanolja';
	target: 'A' | 'Y';
	scores: FieldMatchBreakdown;
};

type ImageItem = { url: string; title?: string };

type RoomTypeSummary = { id?: string | number; name?: string; images: ImageItem[] };

type Canonical = {
	id: string;
	primaryId: string;
	sourceIds: { Yanolja?: string; A?: string; Y?: string };
	name?: string;
	address?: string;
	description?: string;
	nearbyAttractions: string[];
	images: ImageItem[];
	facilities: string[];
	coordinates?: { latitude?: number; longitude?: number };
	phone?: string;
	rating?: number;
	reviewCount?: number;
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
};

type ConsolidatedResponse = {
	id: string;
	canonical: Canonical;
	comparisons: { vsA?: Comparison; vsY?: Comparison };
	sourcesAvailability: { Yanolja?: boolean; A?: boolean; Y?: boolean };
};

const apiBase = '/api';

function ProgressBar({ value }: { value: number }) {
	const v = Math.max(0, Math.min(100, value));
	return (
		<div style={{ background: '#eee', borderRadius: 6, overflow: 'hidden', height: 10 }}>
			<div style={{ width: `${v}%`, height: '100%', background: v > 80 ? '#21ba45' : v > 60 ? '#fbbd08' : '#db2828' }} />
		</div>
	);
}

function ScoreCard({ title, value }: { title: string; value?: number }) {
	return (
		<div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
			<div style={{ fontSize: 12, color: '#666' }}>{title}</div>
			<div style={{ fontSize: 18, fontWeight: 700 }}>{value ?? '-'}%</div>
			{typeof value === 'number' && <ProgressBar value={value} />}
		</div>
	);
}

export function App() {
	const [ids, setIds] = useState<string[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [data, setData] = useState<ConsolidatedResponse | null>(null);
	const [raw, setRaw] = useState<any | null>(null);
	const [tab, setTab] = useState<'consolidated' | 'raw'>('consolidated');

	useEffect(() => {
		fetch(`${apiBase}/properties`)
			.then(async (r) => {
				if (!r.ok) throw new Error(`Failed to load properties: ${r.status}`);
				let data: any = null;
				try {
					data = await r.json();
				} catch (_) {
					data = null;
				}
				const arr = Array.isArray(data) ? data : (data && (data.data || data.items)) || [];
				const mapped = Array.isArray(arr)
					? arr.map((x: any) => (typeof x === 'string' ? x : x?.id)).filter(Boolean)
					: [];
				setIds(mapped as string[]);
			})
			.catch((err) => {
				console.error(err);
				setIds([]);
			});
	}, []);

	useEffect(() => {
		if (!selectedId) return;
		setData(null);
		setRaw(null);
		fetch(`${apiBase}/properties/${selectedId}`)
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed to load property ${selectedId}`))))
			.then(setData)
			.catch((e) => {
				console.error(e);
				setData(null);
			});
		fetch(`${apiBase}/properties/${selectedId}/raw`)
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed to load raw ${selectedId}`))))
			.then(setRaw)
			.catch((e) => {
				console.error(e);
				setRaw(null);
			});
	}, [selectedId]);

	useEffect(() => {
		if (ids.length && !selectedId) setSelectedId(ids[0]);
	}, [ids, selectedId]);

	const scores = useMemo(() => {
		const sA = data?.comparisons?.vsA?.scores;
		const sY = data?.comparisons?.vsY?.scores;
		return { sA, sY };
	}, [data]);

	const radarData = useMemo(() => {
		if (!scores.sA && !scores.sY) return [] as any[];
		const rows = [
			{ metric: 'Name', A: scores.sA?.name ?? 0, Y: scores.sY?.name ?? 0 },
			{ metric: 'Address', A: scores.sA?.address ?? 0, Y: scores.sY?.address ?? 0 },
			{ metric: 'Images', A: scores.sA?.images ?? 0, Y: scores.sY?.images ?? 0 },
			{ metric: 'Facilities', A: scores.sA?.facilities ?? 0, Y: scores.sY?.facilities ?? 0 },
		];
		return rows;
	}, [scores]);

	const donutColors = { A: '#1f77b4', Y: '#ff7f0e', track: '#e9ecef' } as const;

	function ConfidenceBadge({ label, value }: { label: string; value?: number }) {
		const v = typeof value === 'number' ? value : -1;
		const grade = v >= 80 ? 'High' : v >= 60 ? 'Medium' : v >= 0 ? 'Low' : '—';
		const bg = v < 0 ? '#f5f5f5' : v >= 80 ? '#d1fae5' : v >= 60 ? '#fef3c7' : '#fee2e2';
		const color = v < 0 ? '#666' : v >= 80 ? '#065f46' : v >= 60 ? '#92400e' : '#991b1b';
		return (
			<span style={{ background: bg, color, border: '1px solid #eee', padding: '4px 8px', borderRadius: 999, fontSize: 12 }}>
				{label}: {grade}
			</span>
		);
	}

	function Donut({ value, color, label }: { value?: number; color: string; label: string }) {
		const v = Math.max(0, Math.min(100, value ?? 0));
		const data = [
			{ name: 'match', value: v },
			{ name: 'rest', value: 100 - v },
		];
		return (
			<div style={{ width: 170, height: 170 }}>
				<ResponsiveContainer>
					<PieChart>
						<Pie data={data} innerRadius={55} outerRadius={80} paddingAngle={1} dataKey="value" startAngle={90} endAngle={-270}>
							{data.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={index === 0 ? color : donutColors.track} />
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>
				<div style={{ position: 'relative', top: '-115px', textAlign: 'center', fontWeight: 700 }}>{value ?? '-'}%</div>
				<div style={{ position: 'relative', top: '-110px', textAlign: 'center', fontSize: 12, color: '#666' }}>{label}</div>
			</div>
		);
	}

	return (
		<div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100vh', fontFamily: 'Inter, system-ui, Arial' }}>
			<div style={{ borderRight: '1px solid #eee', padding: 12 }}>
				<div style={{ fontWeight: 800, marginBottom: 12 }}>Property Hub</div>
				{ids.map((id) => (
					<div
						key={id}
						onClick={() => setSelectedId(id)}
						style={{
							padding: '8px 10px',
							borderRadius: 6,
							cursor: 'pointer',
							background: selectedId === id ? '#f0f7ff' : 'transparent',
							marginBottom: 6,
						}}
					>
						{id}
					</div>
				))}
			</div>
			<div style={{ padding: 16, overflow: 'auto' }}>
				<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
					<button onClick={() => setTab('consolidated')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: tab === 'consolidated' ? '#e6f7ff' : 'white' }}>Consolidated</button>
					<button onClick={() => setTab('raw')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: tab === 'raw' ? '#e6f7ff' : 'white' }}>Raw</button>
				</div>
				{tab === 'consolidated' && (
					<div>
						{!data ? (
							<div>Loading...</div>
						) : (
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
								<div>
									<div style={{ fontSize: 24, fontWeight: 800 }}>{data.canonical.name || '이름 없음'}</div>
									<div style={{ color: '#666', marginBottom: 8 }}>{data.canonical.address}</div>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
										{(data.canonical.starRatingText || data.canonical.starRating) && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>
												Star: {data.canonical.starRatingText}{data.canonical.starRating ? ` (${data.canonical.starRating})` : ''}
											</span>
										)}
										{data.canonical.checkInTime && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>Check-in: {data.canonical.checkInTime}</span>
										)}
										{data.canonical.checkOutTime && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>Check-out: {data.canonical.checkOutTime}</span>
										)}
										{data.canonical.propertyType && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>Type: {data.canonical.propertyType}</span>
										)}
										{typeof data.canonical.parkingAvailable === 'boolean' && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>Parking: {data.canonical.parkingAvailable ? 'Yes' : 'No'}</span>
										)}
										{data.canonical.phone && (
											<span style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>Phone: {data.canonical.phone}</span>
										)}
									</div>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
										{(data.canonical.languages || []).map((lang, i) => (
											<span key={i} style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#f6f6ff' }}>{lang}</span>
										))}
										{(data.canonical.onSiteDining || []).map((dine, i) => (
											<span key={`d-${i}`} style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#f6fff6' }}>{dine}</span>
										))}
									</div>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 16px' }}>
										{data.canonical.images.slice(0, 6).map((img, idx) => (
											<img key={idx} src={img.url} alt={img.title} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
										))}
									</div>
									<div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{data.canonical.description}</div>
									<div style={{ marginTop: 16 }}>
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Nearby</div>
										<ul>
											{data.canonical.nearbyAttractions.map((n, i) => (
												<li key={i}>{n}</li>
											))}
										</ul>
									</div>
									{(data.canonical.nearbyTransport && data.canonical.nearbyTransport.length > 0) && (
										<div style={{ marginTop: 12 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Transport</div>
											<ul>
												{data.canonical.nearbyTransport.map((n, i) => (
													<li key={i}>{n}</li>
												))}
											</ul>
										</div>
									)}
									<div style={{ marginTop: 16 }}>
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Facilities</div>
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
											{data.canonical.facilities.map((f, i) => (
												<span key={i} style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>{f}</span>
											))}
										</div>
									</div>
									{(data.canonical.breakfastAvailable || (data.canonical.breakfastDetails && data.canonical.breakfastDetails.length > 0)) && (
										<div style={{ marginTop: 16 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Breakfast</div>
											<div style={{ marginBottom: 6 }}>{data.canonical.breakfastAvailable ? 'Available' : '—'}</div>
											<ul>
												{(data.canonical.breakfastDetails || []).map((b, i) => (
													<li key={i}>{b}</li>
												))}
											</ul>
										</div>
									)}
									{(data.canonical.petPolicy && data.canonical.petPolicy.length > 0) && (
										<div style={{ marginTop: 16 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Pet Policy</div>
											<ul>
												{data.canonical.petPolicy.map((p, i) => (
													<li key={i}>{p}</li>
												))}
											</ul>
										</div>
									)}
									{(data.canonical.roomTypes && data.canonical.roomTypes.length > 0) && (
										<div style={{ marginTop: 16 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Room Types</div>
											<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
												{data.canonical.roomTypes.map((rt, idx) => (
													<div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
														<div style={{ fontWeight: 600, marginBottom: 6 }}>{rt.name || `Room ${idx + 1}`}</div>
														<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
															{(rt.images || []).slice(0, 3).map((img, i2) => (
																<img key={i2} src={img.url} alt={img.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
															))}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
									{data.canonical.policies && Object.keys(data.canonical.policies).length > 0 && (
										<div style={{ marginTop: 16 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Policies</div>
											{Object.entries(data.canonical.policies).slice(0, 3).map(([k, vals], i) => (
												<div key={i} style={{ marginBottom: 8 }}>
													<div style={{ fontWeight: 600 }}>{k}</div>
													<ul>
														{(vals || []).slice(0, 5).map((v, j) => (
															<li key={j}>{v}</li>
														))}
													</ul>
												</div>
											))}
										</div>
									)}
								</div>
								<div>
									<div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
										Match Scores vs Yanolja
										<ConfidenceBadge label="otaA" value={scores.sA?.overall} />
										<ConfidenceBadge label="otaY" value={scores.sY?.overall} />
									</div>
									<div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
										<Donut value={scores.sA?.overall} color={donutColors.A} label="otaA Overall" />
										<Donut value={scores.sY?.overall} color={donutColors.Y} label="otaY Overall" />
									</div>
									<div style={{ height: 260, border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
										<ResponsiveContainer>
											<RadarChart data={radarData} outerRadius={90}>
												<PolarGrid />
												<PolarAngleAxis dataKey="metric" />
												<Radar name="otaA" dataKey="A" stroke={donutColors.A} fill={donutColors.A} fillOpacity={0.25} />
												<Radar name="otaY" dataKey="Y" stroke={donutColors.Y} fill={donutColors.Y} fillOpacity={0.25} />
												<Legend />
											</RadarChart>
										</ResponsiveContainer>
									</div>
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
										<div>
											<div style={{ fontWeight: 600, marginBottom: 6 }}>otaA</div>
											<ScoreCard title="Name" value={scores.sA?.name} />
											<ScoreCard title="Address" value={scores.sA?.address} />
											<ScoreCard title="Images" value={scores.sA?.images} />
											<ScoreCard title="Facilities" value={scores.sA?.facilities} />
										</div>
										<div>
											<div style={{ fontWeight: 600, marginBottom: 6 }}>otaY</div>
											<ScoreCard title="Name" value={scores.sY?.name} />
											<ScoreCard title="Address" value={scores.sY?.address} />
											<ScoreCard title="Images" value={scores.sY?.images} />
											<ScoreCard title="Facilities" value={scores.sY?.facilities} />
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
				{tab === 'raw' && (
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
						<div>
							<div style={{ fontWeight: 700, marginBottom: 6 }}>Yanolja</div>
							<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto', background: '#fafafa', padding: 10, borderRadius: 6 }}>
								{JSON.stringify(raw?.yanolja, null, 2)}
							</pre>
						</div>
						<div>
							<div style={{ fontWeight: 700, marginBottom: 6 }}>otaA</div>
							<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto', background: '#fafafa', padding: 10, borderRadius: 6 }}>
								{JSON.stringify(raw?.a, null, 2)}
							</pre>
						</div>
						<div>
							<div style={{ fontWeight: 700, marginBottom: 6 }}>otaY</div>
							<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto', background: '#fafafa', padding: 10, borderRadius: 6 }}>
								{JSON.stringify(raw?.y, null, 2)}
							</pre>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}