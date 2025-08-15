function normalizeWhitespace(input: string | undefined | null): string {
	return (input ?? '')
		.normalize('NFKC')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

export function levenshteinDistance(aInput: string, bInput: string): number {
	const a = normalizeWhitespace(aInput);
	const b = normalizeWhitespace(bInput);
	const aLen = a.length;
	const bLen = b.length;
	if (aLen === 0) return bLen;
	if (bLen === 0) return aLen;
	const dp: number[] = Array.from({ length: bLen + 1 }, (_, i) => i);
	for (let i = 1; i <= aLen; i++) {
		let prev = i - 1;
		dp[0] = i;
		for (let j = 1; j <= bLen; j++) {
			const temp = dp[j];
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
			prev = temp;
		}
	}
	return dp[bLen];
}

export function stringSimilarityPercent(a: string | undefined | null, b: string | undefined | null): number {
	const aNorm = normalizeWhitespace(a);
	const bNorm = normalizeWhitespace(b);
	if (!aNorm && !bNorm) return 100;
	if (!aNorm || !bNorm) return 0;
	const maxLen = Math.max(aNorm.length, bNorm.length);
	if (maxLen === 0) return 100;
	const distance = levenshteinDistance(aNorm, bNorm);
	return Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
}

export function setSimilarityPercent(aList: string[], bList: string[]): number {
	const aSet = new Set(aList.map((s) => normalizeWhitespace(s)));
	const bSet = new Set(bList.map((s) => normalizeWhitespace(s)));
	const union = new Set<string>([...aSet, ...bSet]);
	let intersectionCount = 0;
	for (const item of aSet) {
		if (bSet.has(item)) intersectionCount++;
	}
	if (union.size === 0) return 100;
	return Math.round((intersectionCount / union.size) * 100);
}

export function imagesSimilarityPercentByTitles(aTitles: (string | undefined)[], bTitles: (string | undefined)[]): number {
	const a = aTitles.filter(Boolean).map((t) => normalizeWhitespace(t as string));
	const b = bTitles.filter(Boolean).map((t) => normalizeWhitespace(t as string));
	if (a.length === 0 && b.length === 0) return 100;
	if (a.length === 0 || b.length === 0) return 0;
	return setSimilarityPercent(a, b);
}