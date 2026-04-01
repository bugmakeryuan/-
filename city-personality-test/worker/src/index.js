const allowedOrigins = new Set([
  'https://www.206288.xyz',
  'https://206288.xyz',
]);

const toHalfWidth = (rawText) => {
  return String(rawText || '')
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/\u3000/g, ' ');
};

const normalizeCode = (rawCode) => {
  return toHalfWidth(rawCode)
    .replace(/^\uFEFF/, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

const buildCorsHeaders = (origin) => {
  const safeOrigin = allowedOrigins.has(origin) ? origin : 'https://www.206288.xyz';
  return {
    'access-control-allow-origin': safeOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  };
};

const jsonResponse = (status, data, origin) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(origin),
    },
  });
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: buildCorsHeaders(origin)});
    }

    const url = new URL(request.url);
    if (url.pathname !== '/validate') {
      return jsonResponse(404, {ok: false}, origin);
    }

    if (request.method !== 'POST') {
      return jsonResponse(405, {ok: false}, origin);
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch (_) {
      return jsonResponse(400, {valid: false}, origin);
    }

    const code = normalizeCode(payload.code);
    if (!code) {
      return jsonResponse(200, {valid: false}, origin);
    }

    const val = await env.AUTH_CODES.get(code);
    if (!val) {
      return jsonResponse(200, {valid: false}, origin);
    }

    let statusData = {status: 'new', firstUsedAt: null};
    try {
      if (val.startsWith('{')) {
        statusData = JSON.parse(val);
      }
    } catch (_) {
      // 兼容直接填 1 的情况
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (statusData.status === 'new') {
      statusData.status = 'active';
      statusData.firstUsedAt = now;
      await env.AUTH_CODES.put(code, JSON.stringify(statusData));
      return jsonResponse(200, {valid: true}, origin);
    }

    if (statusData.status === 'active') {
      if (now - statusData.firstUsedAt <= oneDayMs) {
        return jsonResponse(200, {valid: true}, origin);
      } else {
        return jsonResponse(200, {valid: false, expired: true}, origin);
      }
    }

    return jsonResponse(200, {valid: false}, origin);
  },
};
