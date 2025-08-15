import React, { useEffect, useMemo, useState } from 'react';

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

type Canonical = {
	id: string;
	primaryId: string;
	sourceIds: { Yanolja?: string; A?: string; Y?: string };
	name?: string;
	address?: string;
	description?: string;
	nearbyAttractions: string[];
	images: { url: string; title?: string }[];
	facilities: string[];
	coordinates?: { latitude?: number; longitude?: number };
	phone?: string;
	rating?: number;
	reviewCount?: number;
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
									<div style={{ marginTop: 16 }}>
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Facilities</div>
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
											{data.canonical.facilities.map((f, i) => (
												<span key={i} style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 999, background: '#fafafa' }}>{f}</span>
											))}
										</div>
									</div>
								</div>
								<div>
									<div style={{ fontWeight: 700, marginBottom: 8 }}>Match Scores vs Yanolja</div>
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
										<div>
											<div style={{ fontWeight: 600, marginBottom: 6 }}>otaA</div>
											<ScoreCard title="Overall" value={scores.sA?.overall} />
											<ScoreCard title="Name" value={scores.sA?.name} />
											<ScoreCard title="Address" value={scores.sA?.address} />
											<ScoreCard title="Images" value={scores.sA?.images} />
											<ScoreCard title="Facilities" value={scores.sA?.facilities} />
										</div>
										<div>
											<div style={{ fontWeight: 600, marginBottom: 6 }}>otaY</div>
											<ScoreCard title="Overall" value={scores.sY?.overall} />
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