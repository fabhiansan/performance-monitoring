/**
 * Authentication Middleware
 * 
 * Provides simple token-based authentication for mutating API endpoints.
 * For development environments, authentication can be disabled via environment variable.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
  authToken?: string;
}

// Simple token-based auth for desktop app
const VALID_TOKENS = new Set([
  process.env.API_TOKEN || 'development-token-12345',
  'electron-app-token' // Hardcoded token for Electron app
]);

const SKIP_AUTH = process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development';

/**
 * Authentication middleware for mutating endpoints
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip authentication in development or when explicitly disabled
  if (SKIP_AUTH) {
    req.isAuthenticated = true;
    next();
    return;
  }

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header', { 
      endpoint: req.path, 
      method: req.method,
      ip: req.ip 
    });
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid authorization token required'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!VALID_TOKENS.has(token)) {
    logger.warn('Invalid authentication token', { 
      endpoint: req.path, 
      method: req.method,
      ip: req.ip,
      tokenPrefix: token.substring(0, 8) + '...'
    });
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
    return;
  }

  req.isAuthenticated = true;
  req.authToken = token;
  next();
}

/**
 * Middleware to check if endpoint requires authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated && !SKIP_AUTH) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required for this endpoint'
    });
    return;
  }
  next();
}

/**
 * Get CORS options with restricted origins for production
 */
export function getCorsOptions(): import('cors').CorsOptions {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Alternative dev port
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ];

  // In production, be more restrictive
  if (process.env.NODE_ENV === 'production') {
    return {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count']
    };
  }

  // In development, be more permissive but still explicit
  return {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count']
  };
}

export default authMiddleware;