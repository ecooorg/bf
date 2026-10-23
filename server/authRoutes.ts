/**
 * Session / login / logout routes.
 * Extracted from server.ts (p73) without behaviour change.
 */
import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { clearedCookie } from './security.ts';
import type { LoginLimiter } from './security.ts';
import { consumeRateLimit, recordAuditEvent } from './projectRepository.ts';
import { projectCapabilities } from './projectCapabilities.ts';
import { githubConfigFromEnv } from './githubIntegration.ts';

export interface AuthRouteDeps {
  appAuthEnabled: boolean;
  projectModeEnabled: boolean;
  nodeEnv: string;
  appPassword: string;
  loginMaxFails: number;
  loginWindowMs: number;
  authenticated: (req: Request) => boolean;
  setSession: (res: Response) => void;
  loginLimiter: LoginLimiter;
  clientIp: (req: Request) => string;
}

export function registerAuthRoutes(app: Express, deps: AuthRouteDeps): void {
  const {
    appAuthEnabled: APP_AUTH_ENABLED,
    projectModeEnabled: PROJECT_MODE_ENABLED,
    nodeEnv: NODE_ENV,
    appPassword: APP_PASSWORD,
    loginMaxFails: LOGIN_MAX_FAILS,
    loginWindowMs: LOGIN_WINDOW_MS,
    authenticated,
    setSession,
    loginLimiter,
    clientIp,
  } = deps;

  app.get('/api/session', (req, res) => {
    // Expose only the non-sensitive feature flag so the legacy UI can offer a
    // Project Mode entry point only when the server has it enabled.
    const isAuthenticated = authenticated(req);
    // P53: capability booleans for the Project page, only for a signed-in person and only when Project Mode is on.
    const capabilities = isAuthenticated && PROJECT_MODE_ENABLED ? projectCapabilities({ githubConfigured: githubConfigFromEnv() !== null }) : undefined;
    res.json({ success: true, authenticated: isAuthenticated, required: APP_AUTH_ENABLED, projectModeEnabled: PROJECT_MODE_ENABLED, ...(capabilities ? { capabilities } : {}) });
  });

  app.post('/api/login', async (req, res) => {
    if (!APP_AUTH_ENABLED) return res.json({ success: true, authenticated: true, required: false });
    const password = String(req.body?.password || '');
    const a = Buffer.from(password);
    const b = Buffer.from(APP_PASSWORD);
    const ip = clientIp(req);

    // BX-06 / TZ §13.4: when Project Mode is enabled, login throttling must be
    // shared across restarts and replicas. Fail closed if PostgreSQL cannot enforce it.
    if (PROJECT_MODE_ENABLED) {
      try {
        const limit = await consumeRateLimit({ key: `login:${ip}`, limit: LOGIN_MAX_FAILS, windowMs: LOGIN_WINDOW_MS });
        if (!limit.allowed) {
          const wait = Math.max(1, Math.ceil((limit.resetsAt.getTime() - Date.now()) / 1000));
          res.setHeader('Retry-After', String(wait));
          return res.status(429).json({ success: false, code: 'TOO_MANY_ATTEMPTS', retryAfter: wait,
            error: `Too many sign-in attempts. Please try again in ${Math.ceil(wait / 60)} minute(s).` });
        }
      } catch (error) {
        console.error(JSON.stringify({ type: 'login_rate_limit_unavailable', message: String((error as Error)?.message || error).slice(0, 160) }));
        return res.status(503).json({ success: false, code: 'RATE_LIMIT_UNAVAILABLE', error: 'Sign-in protection is temporarily unavailable.' });
      }
    } else {
      // Preserve the legacy Simple Mode behaviour when no Project Mode database is configured.
      const wait = loginLimiter.retryAfterSec(ip);
      if (wait > 0) {
        res.setHeader('Retry-After', String(wait));
        return res.status(429).json({ success: false, code: 'TOO_MANY_ATTEMPTS', retryAfter: wait,
          error: `Too many failed sign-in attempts. Please try again in ${Math.ceil(wait / 60)} minute(s).` });
      }
    }

    const ok = a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
    if (!ok) {
      if (!PROJECT_MODE_ENABLED) loginLimiter.recordFailure(ip);
      if (PROJECT_MODE_ENABLED) {
        try { await recordAuditEvent({ eventType: 'auth.login.failed', actor: 'human', details: { auth_mode: 'password' } }); }
        catch { /* audit optional on failure path; never block with 503 for wrong password */ }
      }
      return res.status(401).json({ success: false, error: 'Invalid password', code: 'INVALID_PASSWORD' });
    }
    if (PROJECT_MODE_ENABLED) {
      try { await recordAuditEvent({ eventType: 'auth.login.succeeded', actor: 'human', details: { auth_mode: 'password' } }); }
      catch (error) {
        console.error(JSON.stringify({ type: 'login_audit_unavailable', message: String((error as Error)?.message || error).slice(0, 160) }));
        return res.status(503).json({ success: false, code: 'AUDIT_UNAVAILABLE', error: 'Sign-in audit is temporarily unavailable.' });
      }
    }
    setSession(res);
    res.json({ success: true, authenticated: true, required: true });
  });

  app.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', clearedCookie(NODE_ENV === 'production'));
    res.json({ success: true });
  });
}
