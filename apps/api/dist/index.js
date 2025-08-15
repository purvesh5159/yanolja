"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dist_1 = require("../../../packages/shared/dist");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
function resolveDataRoot() {
    const candidates = [
        process.env.DATA_ROOT,
        path_1.default.resolve(process.cwd(), 'data/Propery_Hub_JSON'),
        path_1.default.resolve(__dirname, '../../../data/Propery_Hub_JSON'),
        path_1.default.resolve('/workspace/data/Propery_Hub_JSON'),
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isDirectory())
                return p;
        }
        catch (_e) {
            // ignore
        }
    }
    return candidates[0] ?? path_1.default.resolve(process.cwd(), 'data/Propery_Hub_JSON');
}
const DATA_ROOT = resolveDataRoot();
function listPropertyDatasets() {
    if (!fs_1.default.existsSync(DATA_ROOT)) {
        return [];
    }
    const result = [];
    const propertyDirs = fs_1.default
        .readdirSync(DATA_ROOT)
        .filter((name) => fs_1.default.statSync(path_1.default.join(DATA_ROOT, name)).isDirectory());
    for (const dir of propertyDirs) {
        const baseDir = path_1.default.join(DATA_ROOT, dir);
        const parts = dir.split('_');
        const probableId = parts[parts.length - 1];
        const p = { id: probableId, baseDir };
        const yanoljaDir = path_1.default.join(baseDir, 'Yanolja');
        const aDir = path_1.default.join(baseDir, 'A');
        const yDir = path_1.default.join(baseDir, 'Y');
        if (fs_1.default.existsSync(yanoljaDir)) {
            const files = fs_1.default.readdirSync(yanoljaDir).filter((f) => f.endsWith('.json'));
            if (files[0])
                p.yanolja = path_1.default.join(yanoljaDir, files[0]);
        }
        if (fs_1.default.existsSync(aDir)) {
            const files = fs_1.default.readdirSync(aDir).filter((f) => f.endsWith('.json'));
            if (files[0])
                p.otaA = path_1.default.join(aDir, files[0]);
        }
        if (fs_1.default.existsSync(yDir)) {
            const files = fs_1.default.readdirSync(yDir).filter((f) => f.endsWith('.json'));
            if (files[0])
                p.otaY = path_1.default.join(yDir, files[0]);
        }
        result.push(p);
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
}
function readJson(filePath) {
    const text = fs_1.default.readFileSync(filePath, 'utf-8');
    try {
        return JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Failed to parse JSON: ${filePath}: ${e.message}`);
    }
}
const cache = new Map();
function buildCanonical(paths) {
    const cached = cache.get(paths.id);
    if (cached)
        return cached;
    const yanoljaRaw = paths.yanolja ? readJson(paths.yanolja) : undefined;
    const yj = yanoljaRaw ? (0, dist_1.normalizeYanolja)(yanoljaRaw) : undefined;
    const fallbackImages = yj?.images;
    const aRaw = paths.otaA ? readJson(paths.otaA) : undefined;
    const yRaw = paths.otaY ? readJson(paths.otaY) : undefined;
    const a = aRaw ? (0, dist_1.normalizeOtaA)(aRaw, fallbackImages) : undefined;
    const y = yRaw ? (0, dist_1.normalizeOtaY)(yRaw, fallbackImages) : undefined;
    const obj = { yanolja: yj, a, y };
    cache.set(paths.id, obj);
    return obj;
}
function computeScores(base, other) {
    const name = (0, dist_1.stringSimilarityPercent)(base.name ?? '', other.name ?? '');
    const address = (0, dist_1.stringSimilarityPercent)(base.address ?? '', other.address ?? '');
    const images = (0, dist_1.imagesSimilarityPercentByTitles)((base.images || []).map((i) => i.title), (other.images || []).map((i) => i.title));
    const facilities = (0, dist_1.setSimilarityPercent)(base.facilities || [], other.facilities || []);
    const overall = Math.round((name * 0.35 + address * 0.35 + facilities * 0.2 + images * 0.1));
    return { name, address, images, facilities, overall };
}
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dataRoot: DATA_ROOT, properties: listPropertyDatasets().length });
});
app.get('/api/properties', (_req, res) => {
    const list = listPropertyDatasets().map((p) => ({ id: p.id }));
    res.json(list);
});
app.get('/api/properties/:id/raw', (req, res) => {
    const id = req.params.id;
    const set = listPropertyDatasets().find((p) => p.id === id);
    if (!set)
        return res.status(404).json({ error: 'Not found' });
    const yanolja = set.yanolja ? readJson(set.yanolja) : null;
    const a = set.otaA ? readJson(set.otaA) : null;
    const y = set.otaY ? readJson(set.otaY) : null;
    res.json({ yanolja, a, y });
});
app.get('/api/properties/:id', (req, res) => {
    const id = req.params.id;
    const set = listPropertyDatasets().find((p) => p.id === id);
    if (!set)
        return res.status(404).json({ error: 'Not found' });
    const { yanolja, a, y } = buildCanonical(set);
    if (!yanolja)
        return res.status(500).json({ error: 'Missing Yanolja base' });
    const canonical = {
        ...yanolja,
        id,
        primaryId: id,
        sourceIds: {
            Yanolja: yanolja.sourceIds.Yanolja,
            A: a?.sourceIds.A,
            Y: y?.sourceIds.Y,
        },
    };
    const comparisons = {};
    if (a)
        comparisons.vsA = { base: 'Yanolja', target: 'A', scores: computeScores(yanolja, a) };
    if (y)
        comparisons.vsY = { base: 'Yanolja', target: 'Y', scores: computeScores(yanolja, y) };
    const response = {
        id,
        canonical,
        comparisons,
        sourcesAvailability: { Yanolja: Boolean(yanolja), A: Boolean(a), Y: Boolean(y) },
        normalized: {
            Yanolja: yanolja,
            A: a,
            Y: y,
        },
    };
    res.json(response);
});
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    console.log(`Data root: ${DATA_ROOT}`);
});
