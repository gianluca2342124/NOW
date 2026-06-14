/** Fetch JSON with a timeout. Returns null on any failure (fault-tolerant). */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { accept: 'application/json', ...init.headers },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Tolerant field picker for messy open-data records. */
export function pick(
  record: Record<string, unknown>,
  candidates: string[],
): string | undefined {
  for (const key of candidates) {
    const v = record[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v);
    }
  }
  return undefined;
}

export function toNumber(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse common open-data date shapes into ISO, or undefined.
 * Handles ISO, "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DD", "DD/MM/YYYY[ HH:MM]".
 */
export function parseLooseDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const raw = v.trim();

  const native = Date.parse(raw);
  if (!Number.isNaN(native)) return new Date(native).toISOString();

  // "YYYY-MM-DD HH:MM:SS" → ISO
  const sqlish = raw.replace(' ', 'T');
  const sql = Date.parse(sqlish);
  if (!Number.isNaN(sql)) return new Date(sql).toISOString();

  // "DD/MM/YYYY" or "DD/MM/YYYY HH:MM"
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = '0', mi = '0'] = m;
    const dt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
    );
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  return undefined;
}
