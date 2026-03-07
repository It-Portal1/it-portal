/**
 * Rate Limiter Middleware
 * Schutz vor Brute-Force-Angriffen auf den Login-Endpunkt
 */
import rateLimit from 'express-rate-limit';

/**
 * Strenger Rate Limiter für Login:
 * Max. 5 Versuche pro 15 Minuten pro IP
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 5,
    message: {
        error: 'Zu viele Login-Versuche. Bitte versuche es in 15 Minuten erneut.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Erfolgreiche Logins zählen nicht
});

/**
 * Allgemeiner API Rate Limiter (großzügiger)
 */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 Minute
    max: 100,
    message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
    standardHeaders: true,
    legacyHeaders: false,
});
