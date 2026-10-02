import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { fail } from './domain.js';
import { tokenHash } from './sessions.js';

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'];
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const opaque = () => randomBytes(32).toString('base64url');
export function calendarConfig(env = process.env) {
  const config = {
    clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI || '', key: env.GOOGLE_CALENDAR_TOKEN_KEY || '',
    appUrl: env.GOOGLE_CALENDAR_APP_URL || 'http://localhost:8082/',
  };
  try {
    const redirect = new URL(config.redirectUri);
    config.configured = Boolean(config.clientId && config.clientSecret && /^[a-f0-9]{64}$/i.test(config.key) &&
      (redirect.protocol === 'https:' || (redirect.protocol === 'http:' && ['localhost','127.0.0.1'].includes(redirect.hostname))));
  } catch { config.configured = false; }
  return config;
}

// AES-GCM authenticates both ciphertext and the owning account, preventing row swaps.
export function encrypt(value, key, owner) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(owner));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64url')).join('.');
}
export function decrypt(value, key, owner) {
  const [iv, tag, encrypted] = value.split('.').map((s) => Buffer.from(s, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(owner)); cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(encrypted), cipher.final()]).toString());
}
export const eventSchema = z.object({
  requestId: z.string().uuid(), title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).default(''), location: z.string().max(300).default(''),
  allDay: z.boolean().default(false), start: z.string().max(50), end: z.string().max(50),
  timeZone: z.string().max(100).default('Asia/Manila'),
}).superRefine((v, ctx) => {
  const validZone = DateTime.now().setZone(v.timeZone).isValid;
  const parse = (s) => v.allDay ? DateTime.fromISO(s, { zone: v.timeZone }) : DateTime.fromISO(s, { setZone: true });
  const a = parse(v.start), b = parse(v.end);
  const format = v.allDay ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/;
  if (!validZone || !format.test(v.start) || !format.test(v.end) || !a.isValid || !b.isValid || b <= a || b.diff(a, 'days').days > 366)
    ctx.addIssue({ code: 'custom', message: 'Enter a valid start and later end, within one year, and a valid time zone.' });
});
export function normalizeEvent(event) {
  return {
    id: `google:${event.id}`, googleId: event.id, title: event.summary || '(Untitled event)',
    starts_at: event.start?.dateTime || event.start?.date,
    ends_at: event.end?.dateTime || event.end?.date,
    allDay: Boolean(event.start?.date), kind: 'Google Calendar',
    location: event.location || '', description: event.description || '',
    url: typeof event.htmlLink === 'string' && /^https:\/\/(calendar\.google\.com|www\.google\.com)\//.test(event.htmlLink) ? event.htmlLink : null,
  };
}

export function createCalendarService({ store, config = calendarConfig(), fetchImpl = fetch }) {
  const requireConfig = () => { if (!config.configured) fail('GOOGLE_SETUP_REQUIRED', 'Google Calendar connection is not available yet. Ask your administrator to finish setup.', 503); };
  const seal = (v, id) => encrypt(v, config.key, id);
  const open = (v, id) => decrypt(v, config.key, id);
  const jsonFetch = async (url, options = {}) => {
    try {
      const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(10000) });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } catch { fail('GOOGLE_UNAVAILABLE', 'Google Calendar could not be reached. Please try again.', 502); }
  };
  const exchange = (params) => jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }).toString(),
  });
  const scoped = (data) => GOOGLE_SCOPES.every((scope) => data.scope?.split(' ').includes(scope));
  async function status(userId, session) {
    if (!config.configured) return { configured: false, connected: false };
    const [connection, pending] = await Promise.all([store.connection(userId), store.pending(userId, tokenHash(session))]);
    return { configured: true, connected: Boolean(connection), email: connection?.email,
      pendingEmail: pending?.stage === 'ready' ? pending.email : undefined,
      pending: pending && ['created','authorizing','exchanging'].includes(pending.stage),
      failed: pending?.stage === 'failed' };
  }
  async function begin(user, session) {
    requireConfig();
    if (user.email?.endsWith('@classassist.demo')) fail('DEMO_ACCOUNT', 'Use your own Aider account to connect a private Google Calendar. Shared demo accounts cannot connect.', 403);
    const state = opaque();
    await store.begin({ state_hash: tokenHash(state), user_id: user.id, session_hash: tokenHash(session), verifier: seal(opaque(), user.id) });
    const url = new URL(config.redirectUri); url.pathname = url.pathname.replace(/\/callback$/, '/start');
    url.search = new URLSearchParams({ ticket: state }).toString();
    return { url: url.toString() };
  }
  async function start(state) {
    requireConfig(); const browserSecret = opaque();
    const attempt = await store.start(tokenHash(state), tokenHash(browserSecret));
    if (!attempt) fail('OAUTH_EXPIRED', 'This connection request expired. Start again from Aider.', 400);
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
      response_type: 'code', scope: GOOGLE_SCOPES.join(' '), state, access_type: 'offline', prompt: 'consent',
      code_challenge: Buffer.from(tokenHash(open(attempt.verifier, attempt.user_id)), 'hex').toString('base64url'), code_challenge_method: 'S256' });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, browserSecret };
  }
  async function callback({ state, code, error, browserSecret }) {
    requireConfig();
    const attempt = await store.consume(tokenHash(state), tokenHash(browserSecret || ''));
    if (!attempt) fail('OAUTH_EXPIRED', 'This connection request is invalid or expired. Start again from Aider.', 400);
    try {
      if (error || !code) fail('GOOGLE_CANCELLED', 'Google Calendar connection was cancelled.', 400);
      const { response, data } = await exchange({ code, redirect_uri: config.redirectUri,
        code_verifier: open(attempt.verifier, attempt.user_id), grant_type: 'authorization_code' });
      if (!response.ok || !data.access_token || !data.refresh_token || !scoped(data))
        fail('GOOGLE_CONSENT_REQUIRED', 'Allow calendar and account email access, then reconnect Google Calendar.', 400);
      const userInfo = await jsonFetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${data.access_token}` } });
      if (!userInfo.response.ok || !userInfo.data.email || !userInfo.data.verified_email)
        fail('GOOGLE_ACCOUNT_REQUIRED', 'Choose a Google account with a verified email address.', 400);
      await store.result(attempt.state_hash, seal({ access_token: data.access_token, refresh_token: data.refresh_token,
        expires_at: Date.now() + Number(data.expires_in || 3600) * 1000 }, attempt.user_id), userInfo.data.email);
      return { ok: true };
    } catch (e) { await store.result(attempt.state_hash, null, null); throw e; }
  }
  async function confirm(userId, session) {
    requireConfig();
    return store.lock(userId, async (db) => {
      const pending = await db.pending(userId, tokenHash(session));
      if (pending?.stage !== 'ready') fail('OAUTH_EXPIRED', 'No completed connection is waiting. Please reconnect.', 409);
      await db.save(userId, pending.result, pending.email);
      await db.clearPending(userId);
      return { ok: true };
    });
  }
  async function authorized(db, userId, url, options = {}) {
    const connection = await db.connection(userId);
    if (!connection) fail('GOOGLE_NOT_CONNECTED', 'Connect Google Calendar first.', 409);
    let credentials;
    try { credentials = open(connection.credentials, userId); }
    catch { fail('GOOGLE_RECONNECT_REQUIRED', 'Reconnect Google Calendar to restore access.', 409); }
    async function refresh() {
      const { response, data } = await exchange({ grant_type: 'refresh_token', refresh_token: credentials.refresh_token });
      if (!response.ok) {
        if (data.error === 'invalid_grant') fail('GOOGLE_RECONNECT_REQUIRED', 'Google access has expired or was revoked. Please reconnect.', 409);
        fail('GOOGLE_UNAVAILABLE', 'Google Calendar could not refresh access. Try again shortly.', 502);
      }
      if (!data.access_token) fail('GOOGLE_UNAVAILABLE', 'Google Calendar returned an incomplete response. Try again.', 502);
      credentials = { ...credentials, access_token: data.access_token, refresh_token: data.refresh_token || credentials.refresh_token,
        expires_at: Date.now() + Number(data.expires_in || 3600) * 1000 };
      await db.save(userId, seal(credentials, userId), connection.email);
    }
    if (credentials.expires_at < Date.now() + 60000) await refresh();
    const run = () => jsonFetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials.access_token}` } });
    let result = await run();
    if (result.response.status === 401) { await refresh(); result = await run(); }
    return result;
  }
  function googleError(response) {
    if (response.status === 401) fail('GOOGLE_RECONNECT_REQUIRED', 'Reconnect Google Calendar to restore access.', 409);
    if (response.status === 403) fail('GOOGLE_PERMISSION', 'Google Calendar access was denied. Enable the Calendar API and reconnect with calendar access.', 403);
    if (response.status === 429) fail('GOOGLE_RATE_LIMIT', 'Google Calendar is busy. Wait a moment and try again.', 429);
    fail('GOOGLE_UNAVAILABLE', 'Google Calendar could not complete this request. Please try again.', 502);
  }
  async function list(userId, from, to) {
    requireConfig();
    const a = DateTime.fromISO(from, { setZone: true }), b = DateTime.fromISO(to, { setZone: true });
    if (!a.isValid || !b.isValid || b <= a || b.diff(a, 'days').days > 93)
      fail('INVALID_RANGE', 'Choose a date range of at most three months.');
    return store.lock(userId, async (db) => {
      const events = []; let pageToken;
      // Bounded to avoid an unbounded provider call on large calendars. Surface truncation.
      for (let page = 0; page < 5; page++) {
        const params = new URLSearchParams({ timeMin: a.toUTC().toISO(), timeMax: b.toUTC().toISO(),
          singleEvents: 'true', orderBy: 'startTime', maxResults: '250', ...(pageToken ? { pageToken } : {}) });
        const { response, data } = await authorized(db, userId, `${API}?${params}`);
        if (!response.ok) googleError(response);
        events.push(...(data.items || []).filter((e) => e.status !== 'cancelled' && e.start && e.end).map(normalizeEvent));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
      return { events, truncated: Boolean(pageToken) };
    });
  }
  async function create(userId, input) {
    requireConfig(); const body = eventSchema.parse(input);
    // Stable Google event ID makes retries after a timeout safe, including across processes.
    const id = tokenHash(`${userId}:${body.requestId}`);
    const fingerprint = tokenHash(JSON.stringify({ ...body, requestId: undefined }));
    const event = { id, summary: body.title, description: body.description, location: body.location,
      start: body.allDay ? { date: body.start } : { dateTime: body.start, timeZone: body.timeZone },
      end: body.allDay ? { date: body.end } : { dateTime: body.end, timeZone: body.timeZone },
      extendedProperties: { private: { aiderRequest: fingerprint } } };
    return store.lock(userId, async (db) => {
      let result = await authorized(db, userId, `${API}?sendUpdates=none`, { method: 'POST', body: JSON.stringify(event) });
      if (result.response.status === 409) {
        result = await authorized(db, userId, `${API}/${id}`);
        if (result.response.ok && result.data.extendedProperties?.private?.aiderRequest !== fingerprint)
          fail('REQUEST_CONFLICT', 'This request was already used for a different event. Start a new event.', 409);
      }
      if (!result.response.ok) googleError(result.response);
      return normalizeEvent(result.data);
    });
  }
  async function disconnect(userId) {
    requireConfig();
    return store.lock(userId, async (db) => {
      const connection = await db.connection(userId);
      let revoked = true;
      if (connection) {
        try {
          const credentials = open(connection.credentials, userId);
          const response = await fetchImpl('https://oauth2.googleapis.com/revoke', { method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: credentials.refresh_token }).toString(), signal: AbortSignal.timeout(10000) });
          revoked = response.ok || response.status === 400;
        } catch { revoked = false; }
      }
      await db.remove(userId);
      return { ok: true, revoked };
    });
  }
  return { status, begin, start, callback, confirm, list, create, disconnect, config };
}
