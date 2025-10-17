/**
 * Authentication and Authorization Middleware for DeBabel Server
 * ES Module Version
 * 
 * Provides middleware functions for:
 * - Verifying Supabase JWT tokens
 * - Checking user ownership of resources (services, organisations)
 * - Rate limiting (optional)
 */

import { supabase, supabaseAdmin } from '../supabase.js';

/**
 * Middleware to verify Supabase JWT token
 * Attaches user object to req if valid
 * 
 * Usage:
 *   app.get('/api/protected', authenticateUser, (req, res) => {
 *     console.log(req.user); // User object
 *     console.log(req.userId); // User ID
 *   });
 */
export async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️  No authorization token provided');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Token verification failed:', error?.message || 'No user');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token' 
      });
    }

    // Attach user info to request
    req.user = user;
    req.userId = user.id;
    req.userEmail = user.email;
    
    console.log(`✅ Authenticated user: ${user.email} (${user.id})`);
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed' 
    });
  }
}

/**
 * Middleware to check if user owns a specific service
 * Must be used after authenticateUser
 * 
 * Usage:
 *   app.post('/api/service/:serviceId/start', 
 *     authenticateUser, 
 *     authorizeService, 
 *     (req, res) => {
 *       // User owns this service
 *     }
 *   );
 */
export async function authorizeService(req, res, next) {
  try {
    const { serviceId } = req.params;
    const userId = req.userId;

    if (!serviceId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Service ID is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated' 
      });
    }

    // Check if user owns this service using RPC function
    const { data, error } = await supabaseAdmin.rpc('user_owns_service', {
      service_id_param: serviceId
    });

    if (error) {
      console.error('❌ Authorization check failed:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal Server Error',
        message: 'Authorization check failed' 
      });
    }

    if (!data) {
      console.warn(`⚠️  User ${userId} attempted to access service ${serviceId} without permission`);
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this service' 
      });
    }

    console.log(`✅ User ${userId} authorized for service ${serviceId}`);
    next();
  } catch (error) {
    console.error('❌ Authorization error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      message: 'Authorization failed' 
    });
  }
}

/**
 * Middleware to check if user owns an organisation
 * Must be used after authenticateUser
 * 
 * Usage:
 *   app.put('/api/organisation/:organisationId', 
 *     authenticateUser, 
 *     authorizeChurch, 
 *     (req, res) => {
 *       // User owns this organisation
 *     }
 *   );
 */
export async function authorizeChurch(req, res, next) {
  try {
    const { organisationId } = req.params;
    const userId = req.userId;

    if (!organisationId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Church ID is required' 
      });
    }

    // Check if user owns this organisation
    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .eq('id', organisationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn(`⚠️  User ${userId} attempted to access organisation ${organisationId} without permission`);
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this organisation' 
      });
    }

    console.log(`✅ User ${userId} authorized for organisation ${organisationId}`);
    next();
  } catch (error) {
    console.error('❌ Authorization error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      message: 'Authorization failed' 
    });
  }
}

/**
 * Optional middleware to check if user has a specific role
 * Useful for admin-only endpoints
 */
export function requireRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      // Get user metadata from Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !user) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Unable to verify user role'
        });
      }

      const userRole = user.user_metadata?.role || 'user';

      if (!allowedRoles.includes(userRole)) {
        console.warn(`⚠️  User ${userId} with role ${userRole} attempted to access restricted endpoint`);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('❌ Role check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Role verification failed'
      });
    }
  };
}
