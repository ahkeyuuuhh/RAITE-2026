import express from 'express';
import { z } from 'zod';
import { createCalendarService } from './google-calendar.js';
import { CalendarStore } from './google-calendar-store.js';
import { tokenHash } from './sessions.js';

export function calendarRouters(service) {
  const api = express.Router(), callback = express.Router();
  const wrap = (fn) => async (req, res, next) => { try { res.set('Cache-Control', 'no-store'); res.json(await fn(req)); } catch (e) { next(e); } };
  const session = (req) => req.headers.authorization.slice(7);
  api.get('/status', wrap((req) => service.status(req.user.id, session(req))));
  api.post('/connect', wrap((req) => service.begin(req.user, session(req))));
  api.post('/confirm', wrap((req) => service.confirm(req.user.id, session(req))));
  api.get('/events', wrap((req) => {
    const { from, to } = z.object({ from: z.string().max(50), to: z.string().max(50) }).parse(req.query);
    return service.list(req.user.id, from, to);
  }));
  api.post('/events', wrap((req) => service.create(req.user.id, req.body)));
  api.delete('/connection', wrap((req) => service.disconnect(req.user.id)));
  const stateValue = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
  const cookieName = (state) => `aider_gc_${tokenHash(state).slice(0, 16)}`;
  const cookieOptions = () => ({ httpOnly: true, secure: service.config.redirectUri.startsWith('https:'),
    sameSite: 'lax', path: '/api/oauth/google-calendar', maxAge: 10 * 60 * 1000 });
  callback.get('/start', async (req, res, next) => {
    try {
      const state = stateValue.parse(req.query.ticket);
      const result = await service.start(state);
      res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer');
      res.cookie(cookieName(state), result.browserSecret, cookieOptions());
      res.redirect(result.url);
    } catch (e) { next(e); }
  });
  callback.get('/callback', async (req, res) => {
    let success = false;
    try {
      const state = stateValue.parse(req.query.state);
      const cookie = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName(state)}=`));
      const browserSecret = cookie?.slice(cookieName(state).length + 1);
      res.clearCookie(cookieName(state), cookieOptions());
      await service.callback({ state, browserSecret, code: typeof req.query.code === 'string' ? req.query.code : '', error: req.query.error });
      success = true;
    } catch { /* Never echo provider codes, credentials, or raw errors into HTML. */ }
    res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer');
    res.status(success ? 200 : 400).type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aider · Google Calendar</title><body><main><h1>${success ? 'Google account selected' : 'Calendar connection not completed'}</h1><p>${success ? 'Return to the Calendar tab in Aider and confirm the Google account to finish connecting.' : 'Return to Aider and try connecting again. Allow calendar access when Google asks.'}</p><p>You can close this tab.</p></main></body></html>`);
  });
  return { api, callback };
}
const routers = calendarRouters(createCalendarService({ store: new CalendarStore() }));
export const googleCalendarRouter = routers.api;
export const googleCalendarCallbackRouter = routers.callback;
