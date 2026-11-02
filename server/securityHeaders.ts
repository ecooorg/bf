import type { NextFunction, Request, Response } from 'express';

/** Baseline browser security headers; HSTS is emitted only on production HTTPS deployments. */
export function securityHeadersMiddleware(production = process.env.NODE_ENV === 'production') {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=()');
    res.setHeader('X-Frame-Options', 'DENY');
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}
