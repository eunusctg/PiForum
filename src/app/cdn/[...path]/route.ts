import {
  errorResponse,
} from '@/lib/api-helpers';

/**
 * GET /cdn/<purpose>/<userId>/<filename>
 * --------------------------------------
 * Streams a file from the R2 "UPLOADS" binding on Cloudflare Workers.
 * On local dev, this route is not used (files are served from /uploads/ statically).
 *
 * Path structure: /cdn/post/<userId>/<timestamp>-<rand>.png
 */

function isWorkersRuntime(): boolean {
  return (
    typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair ===
      'function' ||
    typeof (globalThis as { MINIFLARE?: unknown }).MINIFLARE !== 'undefined'
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return errorResponse('Not found', 404);
  }
  const key = pathSegments.join('/');

  if (!isWorkersRuntime()) {
    return errorResponse('Not found', 404);
  }

  try {
    const [{ getCloudflareContext }] = await Promise.all([
      import('@opennextjs/cloudflare'),
    ]);
    const ctx = (await getCloudflareContext({ async: true })) as {
      env: { UPLOADS?: R2Bucket };
    };
    const bucket = ctx?.env?.UPLOADS;
    if (!bucket) {
      return errorResponse('Storage not configured', 500);
    }

    const object = await bucket.get(key);
    if (!object) {
      return errorResponse('Not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);

    const mime = object.httpMetadata?.contentType || 'application/octet-stream';
    headers.set('Content-Type', mime);
    if (!mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/')) {
      headers.set(
        'Content-Disposition',
        `attachment; filename="${key.split('/').pop()}"`,
      );
    }

    return new Response(object.body, { headers, status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch file';
    return errorResponse(msg, 500);
  }
}
