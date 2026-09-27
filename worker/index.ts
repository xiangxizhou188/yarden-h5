const ACCESS_COOKIE = '__Host-yarden_access';
const REFRESH_COOKIE = '__Host-yarden_refresh';

type BackendEnvelope<T> = { success?: boolean; ok?: boolean; data?: T; message?: string };
type AuthSession = { accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number; user: unknown };
type SharePreview = { title: string; description: string; imageUrl?: string | null };

function json(data: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has('Cache-Control')) responseHeaders.set('Cache-Control', 'private, no-store');
  return Response.json(data, { status, headers: responseHeaders });
}

function cookies(request: Request) {
  const result: Record<string, string> = {};
  for (const rawPart of (request.headers.get('Cookie') || '').split(';')) {
    const part = rawPart.trim();
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    result[decodeURIComponent(part.slice(0, separator))] = decodeURIComponent(part.slice(separator + 1));
  }
  return result;
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, maxAge)}; HttpOnly; Secure; SameSite=Lax`;
}

function safeText(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function requestOriginIsAllowed(request: Request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

async function backend<T>(env: Env, path: string, init: RequestInit = {}, accessToken?: string) {
  const url = `${env.API_BASE_URL.replace(/\/+$/, '')}${path}`;
  const backendFetcher = 'BACKEND' in env && env.BACKEND ? env.BACKEND : globalThis;
  const response = await backendFetcher.fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
  });
  const payload = await response.json().catch(() => null) as BackendEnvelope<T> | null;
  return { response, payload };
}

function rewriteSharedMedia(value: unknown, kind: 'issue' | 'inspection', token: string, seen = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value;
  seen.add(value as object);
  if (Array.isArray(value)) return value.map(item => rewriteSharedMedia(item, kind, token, seen));
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) result[key] = rewriteSharedMedia(child, kind, token, seen);
  if (typeof source.id === 'string' && (String(source.url || '').startsWith('/media/') || String(source.thumbnailUrl || '').startsWith('/media/'))) {
    const path = `/share-media/${kind}/${encodeURIComponent(token)}/${encodeURIComponent(source.id)}/content`;
    result.url = path;
    result.thumbnailUrl = path;
  }
  return result;
}

async function proxyPublicMedia(env: Env, backendPath: string) {
  const backendFetcher = 'BACKEND' in env && env.BACKEND ? env.BACKEND : globalThis;
  const response = await backendFetcher.fetch(`${env.API_BASE_URL.replace(/\/+$/, '')}${backendPath}`, { headers: { Accept: 'image/*' } });
  const headers = new Headers();
  for (const name of ['Content-Type', 'Content-Length', 'ETag', 'Content-Security-Policy']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, headers });
}

async function proxyAuthenticated(request: Request, env: Env, backendPath: string, method = 'GET', bodyOverride?: string) {
  const stored = cookies(request);
  let accessToken = stored[ACCESS_COOKIE];
  if (!accessToken) return json({ success: false, message: '请先登录后继续' }, 401);
  const body = method === 'GET' ? undefined : bodyOverride ?? await request.text();
  const init = { method, body: body || undefined, headers: request.headers.get('Idempotency-Key') ? { 'Idempotency-Key': request.headers.get('Idempotency-Key')! } : undefined };
  let result = await backend(env, backendPath, init, accessToken);
  let renewedSession: AuthSession | undefined;
  if (result.response.status === 401 && stored[REFRESH_COOKIE]) {
    const refreshed = await backend<AuthSession>(env, '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: stored[REFRESH_COOKIE] }) });
    if (refreshed.response.ok && refreshed.payload?.success && refreshed.payload.data) {
      renewedSession = refreshed.payload.data;
      accessToken = renewedSession.accessToken;
      result = await backend(env, backendPath, init, accessToken);
    }
  }
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  if (renewedSession) {
    headers.append('Set-Cookie', cookie(ACCESS_COOKIE, renewedSession.accessToken, renewedSession.expiresIn));
    headers.append('Set-Cookie', cookie(REFRESH_COOKIE, renewedSession.refreshToken, renewedSession.refreshExpiresIn));
  }
  return json(result.payload ?? { success: false, message: '业务服务暂时不可用' }, result.response.status, headers);
}

async function proxyMedia(request: Request, env: Env, backendPath: string) {
  const stored = cookies(request);
  let accessToken = stored[ACCESS_COOKIE];
  if (!accessToken) return json({ success: false, message: '请先登录后继续' }, 401);
  const method = request.method.toUpperCase();
  const body = method === 'PUT' ? await request.arrayBuffer() : undefined;
  const selectedHeaders = new Headers();
  selectedHeaders.set('X-Facility-Name', env.FACILITY_NAME);
  for (const name of ['Content-Type', 'X-Entity-Id', 'X-Facility-Name', 'X-File-Name', 'X-File-Size', 'X-Media-Scope']) {
    const value = request.headers.get(name);
    if (value) selectedHeaders.set(name, value);
  }
  const run = (token: string) => {
    const backendFetcher = 'BACKEND' in env && env.BACKEND ? env.BACKEND : globalThis;
    return backendFetcher.fetch(`${env.API_BASE_URL.replace(/\/+$/, '')}${backendPath}`, {
      method,
      body: body ? body.slice(0) : undefined,
      headers: { ...Object.fromEntries(selectedHeaders.entries()), Authorization: `Bearer ${token}` },
    });
  };
  let response = await run(accessToken);
  let renewedSession: AuthSession | undefined;
  if (response.status === 401 && stored[REFRESH_COOKIE]) {
    const refreshed = await backend<AuthSession>(env, '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: stored[REFRESH_COOKIE] }) });
    if (refreshed.response.ok && refreshed.payload?.success && refreshed.payload.data) {
      renewedSession = refreshed.payload.data;
      accessToken = renewedSession.accessToken;
      response = await run(accessToken);
    }
  }
  const headers = new Headers();
  for (const name of ['Content-Type', 'Content-Length', 'ETag']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (renewedSession) {
    headers.append('Set-Cookie', cookie(ACCESS_COOKIE, renewedSession.accessToken, renewedSession.expiresIn));
    headers.append('Set-Cookie', cookie(REFRESH_COOKIE, renewedSession.refreshToken, renewedSession.refreshExpiresIn));
  }
  return new Response(response.body, { status: response.status, headers });
}

async function login(request: Request, env: Env) {
  const input = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!input?.username?.trim() || !input.password) return json({ success: false, message: '请输入账号和密码' }, 400);
  const { response, payload } = await backend<AuthSession>(env, '/auth/login', { method: 'POST', body: JSON.stringify({ username: input.username.trim(), password: input.password, facilityName: env.FACILITY_NAME, deviceName: 'Yarden H5' }) });
  if (!response.ok || !payload?.success || !payload.data) return json(payload ?? { success: false, message: '登录服务暂时不可用' }, response.status);
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', cookie(ACCESS_COOKIE, payload.data.accessToken, payload.data.expiresIn));
  headers.append('Set-Cookie', cookie(REFRESH_COOKIE, payload.data.refreshToken, payload.data.refreshExpiresIn));
  return new Response(JSON.stringify({ success: true, data: payload.data.user }), { status: 200, headers });
}

async function logout(request: Request, env: Env) {
  const stored = cookies(request);
  if (stored[ACCESS_COOKIE] && stored[REFRESH_COOKIE]) await backend(env, '/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: stored[REFRESH_COOKIE] }) }, stored[ACCESS_COOKIE]);
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', cookie(ACCESS_COOKIE, '', 0));
  headers.append('Set-Cookie', cookie(REFRESH_COOKIE, '', 0));
  return new Response(JSON.stringify({ success: true, data: { loggedOut: true } }), { headers });
}

async function sharePage(request: Request, env: Env, token: string, patrol = false) {
  const { payload } = await backend<SharePreview>(env, `/${patrol ? 'inspection-shares' : 'issue-shares'}/${encodeURIComponent(token)}/preview`);
  const preview = payload?.success && payload.data ? payload.data : { title: patrol ? 'Yarden 巡房报告' : 'Yarden 异常协作', description: patrol ? '查看巡房检查记录与现场照片' : '团队异常详情与处理记录', imageUrl: null };
  const assetResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  const html = await assetResponse.text();
  const canonical = new URL(`/${patrol ? 'p' : 's'}/${encodeURIComponent(token)}`, request.url).toString();
  const image = preview.imageUrl || new URL('/share-logo.png', request.url).toString();
  const metas = `<meta property="og:type" content="website"><meta property="og:title" content="${safeText(preview.title)}"><meta property="og:description" content="${safeText(preview.description)}"><meta property="og:image" content="${safeText(image)}"><meta property="og:url" content="${safeText(canonical)}"><meta name="twitter:card" content="summary_large_image">`;
  const output = html.replace(/<title>.*?<\/title>/, `<title>${safeText(preview.title)}</title>${metas}`);
  return new Response(output, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': patrol ? 'private, no-store' : 'public, max-age=60, s-maxage=300', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}

async function nurseryPage(request: Request, env: Env, token: string) {
  const { payload } = await backend<SharePreview>(env, `/nursery-move-in-plan/shares/${encodeURIComponent(token)}/preview`);
  const preview = payload?.success && payload.data ? payload.data : { title: '御花园 · 苗场供苗计划', description: '查看最新进树日期与供苗数量', imageUrl: null };
  const assetResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  const html = await assetResponse.text();
  const canonical = new URL(`/nursery/${encodeURIComponent(token)}`, request.url).toString();
  const image = preview.imageUrl || new URL('/share-logo.png', request.url).toString();
  const metas = `<meta property="og:type" content="website"><meta property="og:title" content="${safeText(preview.title)}"><meta property="og:description" content="${safeText(preview.description)}"><meta property="og:image" content="${safeText(image)}"><meta property="og:url" content="${safeText(canonical)}"><meta name="twitter:card" content="summary_large_image">`;
  return new Response(html.replace(/<title>.*?<\/title>/, `<title>${safeText(preview.title)}</title>${metas}`), { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=60, s-maxage=300', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    try {
      if (method !== 'GET' && !requestOriginIsAllowed(request)) return json({ success: false, message: '请求来源无效' }, 403);
      if (url.pathname === '/api/auth/login' && method === 'POST') return await login(request, env);
      if (url.pathname === '/api/auth/logout' && method === 'POST') return await logout(request, env);
      if (url.pathname === '/api/session' && method === 'GET') return await proxyAuthenticated(request, env, '/auth/me');
      const nurseryApi = url.pathname.match(/^\/api\/nursery-shares\/([^/]+)$/);
      if (nurseryApi && method === 'GET') {
        const result = await backend(env, `/nursery-move-in-plan/shares/${encodeURIComponent(nurseryApi[1])}`);
        return json(result.payload ?? { success: false, message: '计划服务暂时不可用' }, result.response.status, { 'Cache-Control': 'no-store' });
      }
      const nurseryPageMatch = url.pathname.match(/^\/nursery\/([^/]+)\/?$/);
      if (nurseryPageMatch && method === 'GET') return await nurseryPage(request, env, nurseryPageMatch[1]);
      const patrolApi = url.pathname.match(/^\/api\/(inspection-shares|inspections)\/([^/]+)$/);
      if (patrolApi && method === 'GET') {
        if (patrolApi[1] === 'inspections') return await proxyAuthenticated(request, env, `/inspections/${encodeURIComponent(patrolApi[2])}`);
        const result = await backend(env, `/inspection-shares/${encodeURIComponent(patrolApi[2])}`);
        const payload = result.payload ? rewriteSharedMedia(result.payload, 'inspection', patrolApi[2]) : { success: false, message: '分享服务暂时不可用' };
        return json(payload, result.response.status, { 'Cache-Control': 'private, no-store' });
      }
      const patrolPage = url.pathname.match(/^\/p\/([^/]+)\/?$/);
      if (patrolPage && method === 'GET') return await sharePage(request, env, patrolPage[1], true);
      if (method === 'GET' && /^\/inspections\/[^/]+\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      if (url.pathname === '/api/media' && method === 'PUT') return await proxyMedia(request, env, '/media');
      const mediaContent = url.pathname.match(/^\/api\/media\/([^/]+)\/content$/);
      if (mediaContent && method === 'GET') return await proxyMedia(request, env, `/media/${encodeURIComponent(mediaContent[1])}/content`);
      const publicMedia = url.pathname.match(/^\/api\/share-media\/(issue|inspection)\/([^/]+)\/([^/]+)\/content$/);
      if (publicMedia && method === 'GET') return await proxyPublicMedia(env, `/${publicMedia[1]}-shares/${encodeURIComponent(publicMedia[2])}/media/${encodeURIComponent(publicMedia[3])}/content`);
      const mediaAsset = url.pathname.match(/^\/api\/media\/([^/]+)$/);
      if (mediaAsset && method === 'DELETE') return await proxyMedia(request, env, `/media/${encodeURIComponent(mediaAsset[1])}`);
      const sharedApi = url.pathname.match(/^\/api\/shares\/([^/]+)$/);
      if (sharedApi && method === 'GET') {
        const result = await backend(env, `/issue-shares/${encodeURIComponent(sharedApi[1])}`);
        const payload = result.payload ? rewriteSharedMedia(result.payload, 'issue', sharedApi[1]) : { success: false, message: '分享服务暂时不可用' };
        return json(payload, result.response.status, { 'Cache-Control': 'private, no-store' });
      }
      const issueApi = url.pathname.match(/^\/api\/issues\/([^/]+)(?:\/(acknowledge|resolve|share))?$/);
      if (issueApi) {
        const id = encodeURIComponent(issueApi[1]); const action = issueApi[2];
        if (!action && method === 'GET') return await proxyAuthenticated(request, env, `/issues/${id}`);
        if (action === 'acknowledge' && method === 'POST') return await proxyAuthenticated(request, env, `/issues/${id}`, 'PATCH', JSON.stringify({ issueStatus: 'IN_PROGRESS' }));
        if (action === 'resolve' && method === 'POST') return await proxyAuthenticated(request, env, `/issues/${id}/resolve`, 'POST');
        if (action === 'share' && method === 'POST') return await proxyAuthenticated(request, env, `/issues/${id}/share`, 'POST');
      }
      const sharedPage = url.pathname.match(/^\/s\/([^/]+)\/?$/);
      if (sharedPage && method === 'GET') return await sharePage(request, env, sharedPage[1]);
      if (method === 'GET' && (/^\/issues\/[^/]+\/?$/.test(url.pathname) || url.pathname === '/')) return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ event: 'request_failed', path: url.pathname, method, error: error instanceof Error ? error.message : 'unknown' }));
      return json({ success: false, message: '服务暂时不可用，请稍后重试' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
