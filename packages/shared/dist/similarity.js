"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagesSimilarityPercentByTitles = exports.setSimilarityPercent = exports.stringSimilarityPercent = exports.levenshteinDistance = void 0;
function normalizeWhitespace(input) {
    return (input ?? '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function levenshteinDistance(aInput, bInput) {
    const a = normalizeWhitespace(aInput);
    const b = normalizeWhitespace(bInput);
    const aLen = a.length;
    const bLen = b.length;
    if (aLen === 0)
        return bLen;
    if (bLen === 0)
        return aLen;
    const dp = Array.from({ length: bLen + 1 }, (_, i) => i);
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
exports.levenshteinDistance = levenshteinDistance;
function stringSimilarityPercent(a, b) {
    const aNorm = normalizeWhitespace(a);
    const bNorm = normalizeWhitespace(b);
    if (!aNorm && !bNorm)
        return 100;
    if (!aNorm || !bNorm)
        return 0;
    const maxLen = Math.max(aNorm.length, bNorm.length);
    if (maxLen === 0)
        return 100;
    const distance = levenshteinDistance(aNorm, bNorm);
    return Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
}
exports.stringSimilarityPercent = stringSimilarityPercent;
function setSimilarityPercent(aList, bList) {
    const aSet = new Set(aList.map((s) => normalizeWhitespace(s)));
    const bSet = new Set(bList.map((s) => normalizeWhitespace(s)));
    const union = new Set([...aSet, ...bSet]);
    let intersectionCount = 0;
    for (const item of aSet) {
        if (bSet.has(item))
            intersectionCount++;
    }
    if (union.size === 0)
        return 100;
    return Math.round((intersectionCount / union.size) * 100);
}
exports.setSimilarityPercent = setSimilarityPercent;
function imagesSimilarityPercentByTitles(aTitles, bTitles) {
    const a = aTitles.filter(Boolean).map((t) => normalizeWhitespace(t));
    const b = bTitles.filter(Boolean).map((t) => normalizeWhitespace(t));
    if (a.length === 0 && b.length === 0)
        return 100;
    if (a.length === 0 || b.length === 0)
        return 0;
    return setSimilarityPercent(a, b);
}
exports.imagesSimilarityPercentByTitles = imagesSimilarityPercentByTitles;
