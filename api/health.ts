export const config = { runtime: 'edge' };

/**
 * GET /api/health — trivial liveness probe. Useful to confirm that API routes
 * are served by the serverless runtime (JSON) and not intercepted by the SPA /
 * service worker.
 */
export default function handler(_req: Request): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
