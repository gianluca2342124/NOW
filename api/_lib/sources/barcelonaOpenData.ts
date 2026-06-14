import type { RawActivity, ServerSource } from '../types';
import { fetchJson, parseLooseDate, pick, toNumber } from '../http';
import { classify, rankScore, timeRelevance } from '../quality';

/**
 * Barcelona Open Data — "Agenda d'actes i activitats de la ciutat de Barcelona"
 * (Ajuntament CKAN). No API key.
 *
 * Verified dataset/resource (June 2026):
 *   dataset   = agenda-diaria
 *   resource  = 877ccf66-9106-4ae2-be51-95a9f6469e4c (datastore-active CSV)
 *   fields    = name, geo_epgs_4326_lat/lon, start_date, end_date,
 *               institution_name, addresses_neighborhood_name,
 *               addresses_district_name, secondary_filters_name, register_id, …
 *
 * Strategy (resilient to resource-id rotation):
 *   1. `package_show` on the dataset → first datastore-active resource
 *      (falls back to the known default id; overridable via env).
 *   2. Prefer `datastore_search_sql` with a date window around "now"; fall back
 *      to plain `datastore_search` + in-code window filtering.
 */
const CKAN_BASE =
  'https://opendata-ajuntament.barcelona.cat/data/api/3/action';
const DEFAULT_DATASET = 'agenda-diaria';
const DEFAULT_RESOURCE_ID = '877ccf66-9106-4ae2-be51-95a9f6469e4c';
const RECORD_LIMIT = 800;
const WINDOW_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;
/** Cap the feed: quality over quantity. */
const MAX_OUTPUT = 120;

export interface BcnDebug {
  datasetIdsAttempted: string[];
  packageShow: {
    datasetId: string;
    ok: boolean;
    resourceCount: number;
    resources: { id: string; format?: string; datastore_active?: boolean }[];
  } | null;
  selectedResourceId: string | null;
  queryMethod: 'sql' | 'datastore_search' | 'none';
  datastoreOk: boolean;
  rawRecordCount: number;
  afterRegisterDedupe: number;
  sampleRecordKeys: string[];
  dropReasons: Record<string, number>;
  afterParse: number;
  afterNameDedupe: number;
  finalCount: number;
  categoryDistribution: Record<string, number>;
}

interface PackageShow {
  success?: boolean;
  result?: {
    resources?: { id: string; format?: string; datastore_active?: boolean }[];
  };
}
interface DatastoreResult {
  success?: boolean;
  result?: { records?: Record<string, unknown>[] };
}

/** 'YYYY-MM-DDTHH:MM:SS' — matches the dataset's date string shape for lexical compare. */
function fmt(ts: number): string {
  return new Date(ts).toISOString().slice(0, 19);
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

async function discoverResourceId(
  datasetId: string,
  debug: BcnDebug,
): Promise<string | null> {
  const envId = process.env.BCN_OPENDATA_RESOURCE_ID?.trim();
  if (envId) return envId;

  const ps = await fetchJson<PackageShow>(
    `${CKAN_BASE}/package_show?id=${encodeURIComponent(datasetId)}`,
  );
  const resources = ps?.result?.resources;
  if (resources) {
    debug.packageShow = {
      datasetId,
      ok: ps?.success ?? true,
      resourceCount: resources.length,
      resources: resources.map((r) => ({
        id: r.id,
        format: r.format,
        datastore_active: r.datastore_active,
      })),
    };
    const active = resources.find((r) => r.datastore_active);
    if (active) return active.id;
  } else {
    debug.packageShow = {
      datasetId,
      ok: false,
      resourceCount: 0,
      resources: [],
    };
  }
  // Last resort: the known datastore-active resource for agenda-diaria.
  return DEFAULT_RESOURCE_ID;
}

async function queryRecords(
  resourceId: string,
  now: number,
  debug: BcnDebug,
): Promise<Record<string, unknown>[]> {
  const nowStr = fmt(now);
  const farStr = fmt(now + WINDOW_DAYS * DAY);

  // 1) SQL with a date window — best relevance.
  const sql =
    `SELECT * FROM "${resourceId}" ` +
    `WHERE ("end_date" >= '${nowStr}' OR "start_date" >= '${nowStr}') ` +
    `AND "start_date" <= '${farStr}' ` +
    `ORDER BY "start_date" ASC LIMIT ${RECORD_LIMIT}`;
  const sqlRes = await fetchJson<DatastoreResult>(
    `${CKAN_BASE}/datastore_search_sql?sql=${encodeURIComponent(sql)}`,
  );
  if (sqlRes?.result?.records?.length) {
    debug.queryMethod = 'sql';
    debug.datastoreOk = true;
    return sqlRes.result.records;
  }

  // 2) Plain search fallback (filtered to the window in code below).
  const plain = await fetchJson<DatastoreResult>(
    `${CKAN_BASE}/datastore_search?resource_id=${encodeURIComponent(
      resourceId,
    )}&limit=${RECORD_LIMIT}`,
  );
  if (plain?.result?.records) {
    debug.queryMethod = 'datastore_search';
    debug.datastoreOk = true;
    return plain.result.records;
  }

  debug.queryMethod = 'none';
  debug.datastoreOk = false;
  return [];
}

function parseRecord(
  record: Record<string, unknown>,
  resourceId: string,
  index: number,
): { raw: RawActivity } | { drop: string } {
  const title = pick(record, ['name', 'denominacio', 'title']);
  if (!title) return { drop: 'no_title' };

  const startsAt = parseLooseDate(
    pick(record, ['start_date', 'data_inici']),
  );
  if (!startsAt) return { drop: 'no_start_date' };

  const lat = toNumber(
    pick(record, ['geo_epgs_4326_lat', 'latitude', 'latitud', 'lat']),
  );
  const lng = toNumber(
    pick(record, ['geo_epgs_4326_lon', 'longitude', 'longitud', 'lon', 'lng']),
  );
  if (lat === undefined || lng === undefined) return { drop: 'no_coords' };

  const endsAt = parseLooseDate(pick(record, ['end_date', 'data_fi']));
  const id =
    pick(record, ['register_id', '_id', 'id']) ?? `${resourceId}-${index}`;

  return {
    raw: {
      id,
      title,
      venueName: pick(record, ['institution_name', 'addresses_road_name']),
      neighborhood: pick(record, [
        'addresses_neighborhood_name',
        'addresses_district_name',
      ]),
      category: 'other', // provisional — set by classify() in load
      coordinates: { lat, lng },
      startsAt,
      endsAt: endsAt ?? null,
      sourceUrl: pick(record, ['url', 'enllac', 'link']),
      description: pick(record, ['values_description', 'body', 'descripcio']),
      tags: [],
    },
  };
}

function slugKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function inWindow(raw: RawActivity, now: number): boolean {
  const start = Date.parse(raw.startsAt);
  const end = raw.endsAt ? Date.parse(raw.endsAt) : NaN;
  if (Number.isNaN(start)) return false;
  if (start > now + WINDOW_DAYS * DAY) return false;
  // Keep if still running (multi-day) or yet to start.
  return Number.isNaN(end) ? start >= now : end >= now || start >= now;
}

/** Full load + diagnostics, shared by fetch() and the debug endpoint. */
export async function loadBarcelonaOpenData(
  now: number,
): Promise<{ activities: RawActivity[]; debug: BcnDebug }> {
  const configured = (process.env.BCN_OPENDATA_DATASET_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const datasetIds = configured.length > 0 ? configured : [DEFAULT_DATASET];

  const debug: BcnDebug = {
    datasetIdsAttempted: datasetIds,
    packageShow: null,
    selectedResourceId: null,
    queryMethod: 'none',
    datastoreOk: false,
    rawRecordCount: 0,
    afterRegisterDedupe: 0,
    sampleRecordKeys: [],
    dropReasons: {},
    afterParse: 0,
    afterNameDedupe: 0,
    finalCount: 0,
    categoryDistribution: {},
  };

  // 1) Fetch raw records across datasets.
  const records: Record<string, unknown>[] = [];
  for (const datasetId of datasetIds) {
    const resourceId = await discoverResourceId(datasetId, debug);
    debug.selectedResourceId = resourceId;
    if (!resourceId) continue;
    const recs = await queryRecords(resourceId, now, debug);
    if (recs[0] && debug.sampleRecordKeys.length === 0) {
      debug.sampleRecordKeys = Object.keys(recs[0]);
    }
    records.push(...recs);
  }
  debug.rawRecordCount = records.length;

  // 2) Collapse attribute-duplicate rows (same register_id → one event).
  const byRegister = new Map<string, Record<string, unknown>>();
  const noRegister: Record<string, unknown>[] = [];
  for (const rec of records) {
    const rid = pick(rec, ['register_id']);
    if (rid) {
      if (!byRegister.has(rid)) byRegister.set(rid, rec);
    } else {
      noRegister.push(rec);
    }
  }
  const uniqueRecords = [...byRegister.values(), ...noRegister];
  debug.afterRegisterDedupe = uniqueRecords.length;

  // 3) Parse → classify → filter; rank each survivor.
  interface Ranked {
    raw: RawActivity;
    rank: number;
    startMs: number;
    nameKey: string;
  }
  const ranked: Ranked[] = [];
  uniqueRecords.forEach((record, i) => {
    const parsed = parseRecord(record, debug.selectedResourceId ?? 'bcn', i);
    if ('drop' in parsed) {
      bump(debug.dropReasons, parsed.drop);
      return;
    }
    const raw = parsed.raw;
    if (!inWindow(raw, now)) {
      bump(debug.dropReasons, 'out_of_window');
      return;
    }

    const cls = classify(raw.title);
    if (cls.drop) {
      bump(debug.dropReasons, 'low_value');
      return;
    }
    raw.category = cls.category;
    raw.activityLabel = cls.label;
    raw.shortMapLabel = cls.shortLabel;

    const startMs = Date.parse(raw.startsAt);
    const endMs = raw.endsAt ? Date.parse(raw.endsAt) : null;
    const tRel = timeRelevance(startMs, endMs, now);
    raw.importance = clamp01(0.6 * cls.quality + 0.4 * tRel);

    ranked.push({
      raw,
      rank: rankScore(cls.quality, tRel),
      startMs,
      nameKey: `${slugKey(raw.title)}|${slugKey(raw.venueName ?? '')}`,
    });
  });
  debug.afterParse = ranked.length;

  // 4) Collapse recurring sessions (same name+venue) → keep the soonest, then
  //    the highest-ranked.
  const byName = new Map<string, Ranked>();
  for (const item of ranked) {
    const existing = byName.get(item.nameKey);
    if (
      !existing ||
      item.startMs < existing.startMs ||
      (item.startMs === existing.startMs && item.rank > existing.rank)
    ) {
      byName.set(item.nameKey, item);
    }
  }
  const deduped = [...byName.values()];
  debug.afterNameDedupe = deduped.length;

  // 5) Rank, cap, and record category distribution.
  deduped.sort((a, b) => b.rank - a.rank);
  const out = deduped.slice(0, MAX_OUTPUT).map((r) => r.raw);
  for (const a of out) bump(debug.categoryDistribution, a.category);
  debug.finalCount = out.length;

  return { activities: out, debug };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export const barcelonaOpenData: ServerSource = {
  id: 'bcn-opendata',
  sourceName: 'Barcelona Open Data',
  sourceType: 'official',
  verificationBaseline: 'official_source',
  isEnabled: () => true, // no key required
  async fetch(ctx): Promise<RawActivity[]> {
    const { activities } = await loadBarcelonaOpenData(ctx.now);
    return activities;
  },
};
