/**
 * DeBabel Translation Server with Supabase Authentication
 * ES Module Version
 * 
 * Main server file that integrates:
 * - Supabase authentication
 * - Deepgram transcription
 * - Google Cloud Translation
 * - WebSocket connections
 * - Real-time translation streaming
 * - Control Center with login
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import Supabase authentication
import { authenticateUser, authorizeService } from '../middleware/auth.js';
import { getChurchByUserId, getChurchByKey, updateChurch } from '../db/churches.js';
import { 
  getServiceByServiceId, 
  updateServiceStatus, 
  isServiceActive,
  getServicesByUser 
} from '../db/services.js';
import { supabase } from '../supabase.js';

const app = express();
const server = createServer(app);

// ES Module path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form submissions

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =====================================================
// STATIC FILE SERVING
// =====================================================

// Serve static files from public directory (go up one level from src/)
app.use(express.static(join(__dirname, '..', 'public')));

// =====================================================
// IN-MEMORY STORAGE (will be replaced with database)
// =====================================================

// Active translation services
const activeServices = new Map();

// WebSocket connections per service
const serviceConnections = new Map();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Initialize translation service
 * Sets up Deepgram and translation pipelines
 */
async function initializeTranslationService(serviceId, languages) {
  console.log(`🚀 Initializing translation service ${serviceId} for languages:`, languages);
  
  // TODO: Add your existing Deepgram initialization here
  // Example:
  // const deepgramConnection = await setupDeepgram(serviceId);
  // const translationStreams = await setupTranslationStreams(languages);
  
  activeServices.set(serviceId, {
    status: 'active',
    languages: languages,
    startedAt: new Date().toISOString(),
    connections: []
  });
  
  console.log(`✅ Service ${serviceId} initialized`);
}

/**
 * Cleanup translation service
 * Closes all connections and streams
 */
async function cleanupTranslationService(serviceId) {
  console.log(`🛑 Cleaning up service ${serviceId}`);
  
  // TODO: Add your existing cleanup logic here
  // Example:
  // await closeDeepgramConnection(serviceId);
  // await closeTranslationStreams(serviceId);
  
  // Close WebSocket connections
  const connections = serviceConnections.get(serviceId);
  if (connections) {
    connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.close();
      }
    });
    serviceConnections.delete(serviceId);
  }
  
  activeServices.delete(serviceId);
  console.log(`✅ Service ${serviceId} cleaned up`);
}

// =====================================================
// CONTROL CENTER ROUTES
// =====================================================

/**
 * Root endpoint - redirect to login
 * PUBLIC
 */
app.get('/', (req, res) => {
  res.redirect('/login');
});

/**
 * Login page
 * PUBLIC
 */
app.get('/login', (req, res) => {
  res.sendFile(join(__dirname, '..', 'views', 'login.html'));
});

/**
 * Control panel page
 * PUBLIC (authentication happens client-side)
 */
app.get('/control', (req, res) => {
  res.sendFile(join(__dirname, '..', 'views', 'control.html'));
});

/**
 * Legacy route for backward compatibility
 */
app.get('/local', (req, res) => {
  res.redirect('/control');
});

/**
 * Login authentication endpoint
 * Authenticates user with Supabase
 * PUBLIC
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: error.message
      });
    }

    console.log(`✅ User logged in: ${data.user.email}`);

    // Return success with session data
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      },
      redirectUrl: '/control'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * Logout endpoint
 * PUBLIC
 */
app.post('/auth/logout', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Sign out this session
      await supabase.auth.signOut(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

/**
 * Health check endpoint
 * PUBLIC
 */
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

/**
 * Get church info by church key
 * Used by client app to fetch branding/config
 * PUBLIC - No authentication required
 */
app.get('/church/info', async (req, res) => {
  try {
    // Get church key from query parameter or use default
    const churchKey = req.query.key || process.env.CHURCH_KEY || 'default';
    
    console.log(`📍 Fetching church info for key: ${churchKey}`);
    const church = await getChurchByKey(churchKey);

    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church not found'
      });
    }

    // Return church data in format expected by client
    res.json({
      success: true,
      responseObject: {
        name: church.name,
        greeting: church.greeting,
        message: JSON.stringify(church.message || []),
        additionalWelcome: church.additional_welcome,
        waiting: church.waiting_message,
        logo: church.logo_base64,
        language: church.host_language,
        translationLanguages: JSON.stringify(church.translation_languages || []),
        defaultServiceId: church.default_service_id
      }
    });
  } catch (error) {
    console.error('❌ Error fetching church info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get service status (public for client polling)
 * PUBLIC - No authentication required
 */
app.get('/church/:serviceId/status', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const isActive = await isServiceActive(serviceId);

    res.json({
      success: true,
      responseObject: {
        active: isActive
      }
    });
  } catch (error) {
    console.error('❌ Error checking service status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Legacy endpoint - redirect to new endpoint
 * PUBLIC
 */
app.get('/getChurchInfo', async (req, res) => {
  console.log('⚠️  Legacy endpoint /getChurchInfo called, redirecting...');
  const churchKey = req.query.key || process.env.CHURCH_KEY || 'default';
  res.redirect(`/church/info?key=${churchKey}`);
});

/**
 * Get church configuration for control panel
 * PUBLIC - Used by legacy control.html
 * 
 * This endpoint provides configuration data needed by the old control.html page:
 * - Host language (source language for transcription)
 * - Default service ID
 * - Service timeout duration
 * - Available translation languages
 */
app.get('/church/configuration', async (req, res) => {
  try {
    // Get church key from query parameter or environment variable
    const churchKey = req.query.key || process.env.CHURCH_KEY || 'default';
    
    console.log(`📍 Fetching configuration for church key: ${churchKey}`);
    const church = await getChurchByKey(churchKey);

    if (!church) {
      // Church not found in database - use environment variable fallback
      console.warn(`⚠️  No church found for key "${churchKey}", using environment variables`);
      
      return res.json({
        success: true,
        responseObject: {
          hostLanguage: process.env.HOST_LANGUAGE || 'en-GB',
          defaultServiceId: process.env.DEFAULT_SERVICE_ID || generateRandomServiceId(),
          serviceTimeout: process.env.SERVICE_TIMEOUT || '90',
          translationLanguages: process.env.TRANSLATION_LANGUAGES 
            ? JSON.parse(process.env.TRANSLATION_LANGUAGES) 
            : ['Spanish', 'French', 'German'],
          churchKey: churchKey
        }
      });
    }

    // Return church configuration from database
    console.log(`✅ Church configuration found: ${church.name}`);
    res.json({
      success: true,
      responseObject: {
        hostLanguage: church.host_language || 'en-GB',
        defaultServiceId: church.default_service_id || '1234',
        serviceTimeout: process.env.SERVICE_TIMEOUT || '90',
        translationLanguages: church.translation_languages || [],
        churchKey: church.church_key,
        name: church.name,
        greeting: church.greeting,
        logo: church.logo_base64
      }
    });
  } catch (error) {
    console.error('❌ Error fetching church configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration',
      message: error.message
    });
  }
});

/**
 * Helper function to generate a random 4-digit service ID
 * Used as fallback when no default service ID is configured
 */
function generateRandomServiceId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// =====================================================
// PROTECTED ROUTES (Authentication required)
// =====================================================

/**
 * Get user's church profile
 * PROTECTED - Requires authentication
 */
app.get('/api/church/profile', authenticateUser, async (req, res) => {
  try {
    const church = await getChurchByUserId(req.userId);

    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church profile not found',
        message: 'No church associated with this user. Please contact support.'
      });
    }

    res.json({
      success: true,
      data: church
    });
  } catch (error) {
    console.error('❌ Error fetching church profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update church profile
 * PROTECTED - Requires authentication
 */
app.put('/api/church/profile', authenticateUser, async (req, res) => {
  try {
    const church = await getChurchByUserId(req.userId);
    
    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church profile not found'
      });
    }

    const updates = req.body;
    const updatedChurch = await updateChurch(req.userId, church.id, updates);

    res.json({
      success: true,
      data: updatedChurch,
      message: 'Church profile updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating church profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get user's services
 * PROTECTED - Requires authentication
 */
app.get('/api/services', authenticateUser, async (req, res) => {
  try {
    const services = await getServicesByUser(req.userId);

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Start translation service
 * PROTECTED - Requires authentication AND ownership of service
 */
app.post('/api/service/:serviceId/start', 
  authenticateUser, 
  authorizeService, 
  async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { languages } = req.body;

      console.log(`🚀 User ${req.userEmail} starting service ${serviceId}`);
      console.log(`📋 Languages requested: ${languages?.join(', ') || 'none'}`);

      // Check if service is already active
      if (activeServices.has(serviceId)) {
        return res.status(409).json({
          success: false,
          error: 'Service already active',
          message: 'This service is already running. Stop it first before starting again.'
        });
      }

      // Update service status in database
      const service = await updateServiceStatus(serviceId, 'active', languages || []);

      // Initialize translation service
      await initializeTranslationService(serviceId, languages || []);

      res.json({
        success: true,
        data: service,
        message: 'Translation service started successfully'
      });
    } catch (error) {
      console.error('❌ Error starting service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start service',
        message: error.message
      });
    }
  }
);

/**
 * Stop translation service
 * PROTECTED - Requires authentication AND ownership of service
 */
app.post('/api/service/:serviceId/stop', 
  authenticateUser, 
  authorizeService, 
  async (req, res) => {
    try {
      const { serviceId } = req.params;

      console.log(`🛑 User ${req.userEmail} stopping service ${serviceId}`);

      // Check if service is active
      if (!activeServices.has(serviceId)) {
        return res.status(404).json({
          success: false,
          error: 'Service not active',
          message: 'This service is not currently running.'
        });
      }

      // Update service status in database
      const service = await updateServiceStatus(serviceId, 'inactive');

      // Cleanup translation service
      await cleanupTranslationService(serviceId);

      res.json({
        success: true,
        data: service,
        message: 'Translation service stopped successfully'
      });
    } catch (error) {
      console.error('❌ Error stopping service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop service',
        message: error.message
      });
    }
  }
);

/**
 * Get service details
 * PROTECTED - Requires authentication AND ownership of service
 */
app.get('/api/service/:serviceId', 
  authenticateUser, 
  authorizeService, 
  async (req, res) => {
    try {
      const { serviceId } = req.params;
      const service = await getServiceByServiceId(serviceId);

      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      // Add real-time status from in-memory store
      const activeStatus = activeServices.get(serviceId);
      const enhancedService = {
        ...service,
        isActive: !!activeStatus,
        activeLanguages: activeStatus?.languages || [],
        connectionCount: serviceConnections.get(serviceId)?.length || 0
      };

      res.json({
        success: true,
        data: enhancedService
      });
    } catch (error) {
      console.error('❌ Error fetching service:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// =====================================================
// WEBSOCKET SETUP
// =====================================================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');

  // Extract service ID from URL or headers
  const url = new URL(req.url, `http://${req.headers.host}`);
  const serviceId = url.searchParams.get('serviceId');

  if (!serviceId) {
    console.warn('⚠️  WebSocket connection without serviceId');
    ws.close(1008, 'Service ID required');
    return;
  }

  // Add connection to service connections
  if (!serviceConnections.has(serviceId)) {
    serviceConnections.set(serviceId, []);
  }
  serviceConnections.get(serviceId).push(ws);

  console.log(`✅ Client connected to service ${serviceId}`);
  console.log(`👥 Total connections for ${serviceId}: ${serviceConnections.get(serviceId).length}`);

  // Handle incoming messages (if needed)
  ws.on('message', (message) => {
    console.log(`📨 Message from client on service ${serviceId}:`, message.toString());
    // TODO: Handle client messages if needed
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 Client disconnected from service ${serviceId}`);
    
    // Remove from connections
    const connections = serviceConnections.get(serviceId);
    if (connections) {
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      
      // Clean up empty connection arrays
      if (connections.length === 0) {
        serviceConnections.delete(serviceId);
      }
    }
  });

  // Send initial connection confirmation
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to translation service',
      serviceId: serviceId,
      timestamp: new Date().toISOString()
    }));
  }
});

/**
 * Broadcast message to all clients connected to a service
 * @param {string} serviceId - Service ID
 * @param {Object} message - Message to broadcast
 */
export function broadcastToService(serviceId, message) {
  const connections = serviceConnections.get(serviceId);
  if (!connections || connections.length === 0) {
    return;
  }

  const messageStr = JSON.stringify(message);
  let sentCount = 0;

  connections.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(messageStr);
      sentCount++;
    }
  });

  console.log(`📡 Broadcast to service ${serviceId}: ${sentCount} clients`);
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// =====================================================
// CLEANUP ON SHUTDOWN
// =====================================================

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, cleaning up...');
  
  // Stop all active services
  for (const [serviceId] of activeServices) {
    await cleanupTranslationService(serviceId);
  }
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, cleaning up...');
  
  // Stop all active services
  for (const [serviceId] of activeServices) {
    await cleanupTranslationService(serviceId);
  }
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('===========================================');
  console.log('🚀 DeBabel Translation Server Started');
  console.log('===========================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🎤 Deepgram: ${process.env.DEEPGRAM_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🌐 Translation: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Configured' : '❌ Not configured'}`);
  console.log('===========================================');
  console.log('📋 Available Routes:');
  console.log('   GET  /                     → Login page');
  console.log('   GET  /login                → Login page');
  console.log('   GET  /control              → Control center');
  console.log('   POST /auth/login           → Authentication');
  console.log('   GET  /health               → Health check');
  console.log('   GET  /church/info          → Church config');
  console.log('   GET  /api/church/profile   → User profile (auth)');
  console.log('   GET  /api/services         → User services (auth)');
  console.log('===========================================');
});

// Export for testing
export { app, server };
