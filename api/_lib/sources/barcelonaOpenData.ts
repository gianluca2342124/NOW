import type { RawActivity, ServerSource } from '../types';
import { mapTextToCategory } from '../categories';
import { fetchJson, parseLooseDate, pick, toNumber } from '../http';

/**
 * Barcelona Open Data — Ajuntament de Barcelona CKAN portal. No API key.
 *
 * Strategy (resilient to CKAN resource-id rotation):
 *   1. For each configured dataset id, `package_show` → pick the first
 *      datastore-active resource.
 *   2. `datastore_search` that resource for up to N records.
 *   3. `BCN_OPENDATA_RESOURCE_ID` env forces a specific resource (skips step 1).
 *
 * Field names vary across datasets, so parsing is deliberately tolerant.
 */
const CKAN_BASE =
  'https://opendata-ajuntament.barcelona.cat/data/api/3/action';

const DEFAULT_DATASETS = ['culturailleure-agendacultural'];
const RECORD_LIMIT = 200;

interface CkanResource {
  id: string;
  datastore_active?: boolean;
}
interface PackageShow {
  success: boolean;
  result?: { resources?: CkanResource[] };
}
interface DatastoreSearch {
  success: boolean;
  result?: { records?: Record<string, unknown>[] };
}

async function resolveResourceId(datasetId: string): Promise<string | null> {
  const data = await fetchJson<PackageShow>(
    `${CKAN_BASE}/package_show?id=${encodeURIComponent(datasetId)}`,
  );
  const resources = data?.result?.resources ?? [];
  const active = resources.find((r) => r.datastore_active);
  return active?.id ?? resources[0]?.id ?? null;
}

function recordToRaw(
  record: Record<string, unknown>,
  resourceId: string,
  index: number,
): RawActivity | null {
  const title = pick(record, [
    'name',
    'denominacio',
    'title',
    'activitat',
    'activity_name',
  ]);
  if (!title) return null;

  const startsAt = parseLooseDate(
    pick(record, [
      'start_date',
      'data_inici',
      'dataInici',
      'data_inici_act',
      'date_start',
      'startdate',
    ]),
  );
  if (!startsAt) return null;

  const lat = toNumber(
    pick(record, ['geo_epgs_4326_lat', 'latitude', 'latitud', 'lat']),
  );
  const lng = toNumber(
    pick(record, ['geo_epgs_4326_lon', 'longitude', 'longitud', 'lon', 'lng']),
  );
  if (lat === undefined || lng === undefined) return null;

  const endsAt = parseLooseDate(
    pick(record, ['end_date', 'data_fi', 'date_end', 'enddate']),
  );

  const categoryText = pick(record, [
    'tags_categories',
    'category',
    'tipus',
    'tematica',
    'classification',
  ]);

  const id =
    pick(record, ['register_id', 'id', 'codi', 'event_id']) ??
    `${resourceId}-${index}`;

  return {
    id,
    title,
    venueName: pick(record, [
      'institution_name',
      'institucio_nom',
      'equipament',
      'addresses_road_name',
      'venue',
    ]),
    neighborhood: pick(record, [
      'addresses_neighborhood_name',
      'barri',
      'addresses_district_name',
      'district',
    ]),
    category: mapTextToCategory(categoryText ?? title),
    coordinates: { lat, lng },
    startsAt,
    endsAt: endsAt ?? null,
    sourceUrl: pick(record, ['url', 'enllac', 'link', 'web']),
    description: pick(record, ['body', 'descripcio', 'description', 'summary']),
    tags: categoryText ? [categoryText] : [],
  };
}

export const barcelonaOpenData: ServerSource = {
  id: 'bcn-opendata',
  sourceName: 'Barcelona Open Data',
  sourceType: 'official',
  verificationBaseline: 'official_source',
  isEnabled: () => true, // no key required
  async fetch(): Promise<RawActivity[]> {
    const datasetIds = (process.env.BCN_OPENDATA_DATASET_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const datasets = datasetIds.length > 0 ? datasetIds : DEFAULT_DATASETS;
    const forcedResource = process.env.BCN_OPENDATA_RESOURCE_ID?.trim();

    const out: RawActivity[] = [];
    for (const datasetId of datasets) {
      const resourceId = forcedResource || (await resolveResourceId(datasetId));
      if (!resourceId) continue;

      const data = await fetchJson<DatastoreSearch>(
        `${CKAN_BASE}/datastore_search?resource_id=${encodeURIComponent(
          resourceId,
        )}&limit=${RECORD_LIMIT}`,
      );
      const records = data?.result?.records ?? [];
      records.forEach((record, i) => {
        const raw = recordToRaw(record, resourceId, i);
        if (raw) out.push(raw);
      });
    }
    return out;
  },
};
