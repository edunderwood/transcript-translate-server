/**
 * OpenWord Translation Server with Supabase Authentication
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
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ✅ ADD: Import translation system
import { 
  registerForServiceTranscripts, 
  addTranslationLanguageToService,
  removeTranslationLanguageFromService 
} from './translate.js';
import { transcriptAvailServiceSub } from './globals.js';
import { 
  serviceLanguageMap, 
  serviceSubscriptionMap 
} from './repositories/index.js';

// Import Supabase authentication
import { authenticateUser, authorizeService } from '../middleware/auth.js';
import { getChurchByUserId, getChurchByKey, updateChurch } from '../db/churches.js';
import { 
  getServiceByServiceId, 
  updateServiceStatus, 
  isServiceActive,
  getServicesByUser,
  createService
} from '../db/services.js';
import { supabase, supabaseAdmin } from '../supabase.js';
// Import QR code routes
import qrcodeRouter from './routes/qrcode.js';
// Import all route modules
import deepgramRouter from './routes/deepgram.js';
import authRouterOld from './routes/auth.js';
import churchRouterOld from './routes/church.js';
import roomRouter from './routes/room.js';
import clientRouter from './routes/clients.js';
import registrationRouter from './routes/registration-routes.js';

// =====================================================
// PROCESS-LEVEL ERROR HANDLERS (Prevent crashes)
// =====================================================

// Prevent unhandled promise rejections from crashing server
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('❌ Reason:', reason);
  // Application continues running
});

// Prevent uncaught exceptions from crashing server
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  // Log but don't exit - server continues running
  // In production, you may want to restart the process gracefully
});

const app = express();
const server = createServer(app);

// Initialize Socket.IO for control panel and clients
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

// Inject Supabase configuration for registration page
app.get('/register-config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    window.SUPABASE_URL = '${process.env.SUPABASE_URL}';
    window.SUPABASE_ANON_KEY = '${process.env.SUPABASE_ANON_KEY}';
  `);
});

// =====================================================
// STATIC FILE SERVING
// =====================================================

// Serve static files from public directory (go up one level from src/)
app.use(express.static(join(__dirname, '..', 'public')));

// QR Code generation routes
app.use('/qrcode', qrcodeRouter);

// =====================================================
// API ROUTE REGISTRATIONS
// =====================================================

// CRITICAL: Deepgram routes - required for transcription functionality
app.use('/deepgram', deepgramRouter);

// Additional API routes
app.use('/rooms', roomRouter);
app.use('/clients', clientRouter);

// Registration route
app.get('/register', (req, res) => {
  res.sendFile(join(__dirname, '../views/register.html'));
});

// Two-stage registration routes
app.use('/', registrationRouter);



    // ✅ FIX: Use supabaseAdmin to create user (bypasses email verification requirement)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true  // ✅ Auto-confirm email
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({
        success: false,
        message: authError.message
      });
    }

    if (!authData || !authData.user) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    console.log(`✅ Created user: ${authData.user.id}`);

    // Generate unique keys
    const churchKey = generateChurchKey();
    const defaultServiceId = generateServiceId();

    // Prepare church record data
    const churchData = {
      user_id: authData.user.id,
      name: organizationName,
      church_key: churchKey,
      greeting: greeting || 'Welcome!',
      message: [],
      additional_welcome: additionalWelcome || '',
      waiting_message: waitingMessage || 'Service is currently offline',
      logo_base64: logoBase64 || '',
      host_language: hostLanguage || 'en-US',
      translation_languages: translationLanguages,
      default_service_id: defaultServiceId,
      contact_name: contactName,
      contact_phone: contactPhone || ''
    };

    // Create church record
    const { data: churchResult, error: churchError } = await supabaseAdmin
      .from('churches')
      .insert([churchData])
      .select()
      .single();

    if (churchError) {
      console.error('Church creation error:', churchError);
      
      // ✅ Cleanup: Delete user if church creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create organization record',
        error: churchError.message
      });
    }

    console.log(`✅ Created church: ${churchResult.id}`);

    // Create default service
    const serviceData = {
      church_id: churchResult.id,
      service_id: defaultServiceId,
      name: 'Main Service',
      status: 'inactive',
      active_languages: []
    };

    const { error: serviceError } = await supabaseAdmin
      .from('services')
      .insert([serviceData]);

    if (serviceError) {
      console.error('Service creation error:', serviceError);
      // Continue anyway - service can be created later
    } else {
      console.log(`✅ Created service: ${defaultServiceId}`);
    }

    // Return success
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      church: churchResult
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: error.message
    });
  }
});

// Helper function to generate unique church key
function generateChurchKey() {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `CH_${random}${timestamp}`;
}

// Helper function to generate unique service ID
function generateServiceId() {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `SVC_${random}${timestamp}`;
}



// =============================================================================
// END REGISTRATION ROUTES
// =============================================================================
// Note: /auth and /church routes from old router are commented out
// because this server.js has custom implementations below
// If you need endpoints from the old routers, uncomment these:
// app.use('/auth-old', authRouterOld);
// app.use('/church-old', churchRouterOld);

// =====================================================
// IN-MEMORY STORAGE (will be replaced with database)
// =====================================================

// Active translation services
const activeServices = new Map();

// WebSocket connections per service
const serviceConnections = new Map();

// Track which services are currently active (streaming)
// Used to determine if service is ready for client connections
const activeServiceIds = new Map();

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
    activeServiceIds.set(serviceId, true);
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
  activeServiceIds.delete(serviceId);
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
        logo: church.logo_base64,  // Changed from "logo" to "base64Logo" to match client expectation
        base64Logo: church.logo_base64,
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
    
    // Check in-memory first (for active streaming), then database
    const isActiveInMemory = activeServiceIds.has(serviceId);
    const isActiveInDB = await isServiceActive(serviceId);
    const isActive = isActiveInMemory || isActiveInDB;

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
 * Get livestream status for service
 * Used by client LivestreamComponent to show session status
 * PUBLIC - No authentication required
 */
app.get('/church/:serviceId/livestreaming', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const status = activeServiceIds.has(serviceId) ? 'online' : 'offline';
    
    res.json({
      success: true,
      responseObject: {
        status: status
      }
    });
  } catch (error) {
    console.error('❌ Error checking livestream status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get active languages and subscriber counts for service
 * Used by client to show which languages are being used
 * PUBLIC - No authentication required
 */
app.get('/church/:serviceId/languages', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Get subscriber counts from Socket.IO rooms
    const languages = [];
    
    // Check transcript room
    const transcriptRoom = `service-${serviceId}`;
    const room = participantNamespace.adapter.rooms.get(transcriptRoom);
    const transcriptSubscribers = room ? room.size : 0;
    
    if (transcriptSubscribers > 0) {
      languages.push({
        name: "Transcript",
        subscribers: transcriptSubscribers
      });
    }
    
    // TODO: Add language-specific room counting when implemented
    
    res.json({
      success: true,
      responseObject: {
        serviceId: serviceId,
        languages: languages
      }
    });
  } catch (error) {
    console.error('❌ Error getting languages:', error);
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
// SOCKET.IO SETUP (Enhanced for Control Panel & Subscribers)
// Place this code around line 634 in /src/server.js
// This replaces the existing Socket.IO setup
// =====================================================

// Track subscribers per service and language
const subscriberTracker = new Map();

// Control namespace for control panel
const controlNamespace = io.of('/control');

controlNamespace.on('connection', (socket) => {
  console.log('🔌 Control panel connected via Socket.IO:', socket.id);
  
  socket.on('monitor', (serviceId) => {
    console.log(`📊 Monitoring service: ${serviceId}`);
    socket.join(`service-${serviceId}`);
    
    // Send initial subscriber list if any exist
    const serviceSubscribers = subscriberTracker.get(serviceId);
    if (serviceSubscribers) {
      const languages = Array.from(serviceSubscribers.entries()).map(([name, subscribers]) => ({
        name,
        subscribers
      }));
      socket.emit('subscribers', { languages });
    } else {
      // Send empty list
      socket.emit('subscribers', { languages: [] });
    }
    
    // Send confirmation
    socket.emit('registered', { serviceId });
  });
  
socket.on('heartbeat', (data) => {
  const { serviceCode, status } = data;
  console.log(`💓 Heartbeat from service ${serviceCode}:`, status);
  
  // ✅ FIX: Mark service as active when receiving ANY heartbeat from control panel
  // This indicates the console is running and available, allowing the language
  // selector to be visible to users even before streaming starts
  activeServiceIds.set(serviceCode, true);
  console.log(`✅ Service ${serviceCode} marked as active (status: ${status})`);
  
  // Broadcast livestream status only when actually streaming
  // This keeps the livestream indicator (OFF/ON) separate from service availability
  if (status === 'livestreaming' || status === 'streaming') {
    const heartbeatRoom = `${serviceCode}:heartbeat`;
    participantNamespace.to(heartbeatRoom).emit('livestreaming');
    console.log(`📡 Broadcasting livestreaming to room: ${heartbeatRoom}`);
  }
  
  // TODO: Send back subscriber list like old version
  // const subscribers = getActiveLanguages(io, serviceCode);
  // socket.emit('subscribers', subscribers);
});
  
  socket.on('transcriptReady', (data) => {
  console.log(`📝 Transcript ready for service ${data.serviceCode}:`, data.transcript);
  
  // ✅ FIX: Publish to translation system (this will handle translation and distribution)
  transcriptAvailServiceSub.next({
    serviceCode: data.serviceCode,
    transcript: data.transcript,
    serviceLanguageMap
  });
  
  // Keep existing broadcast for compatibility
  participantNamespace.to(`service-${data.serviceCode}`).emit('newTranscript', {
    transcript: data.transcript,
    timestamp: new Date().toISOString()
  });
  
  // Send confirmation back to control panel
  socket.emit('transcriptSent', {
    success: true,
    serviceCode: data.serviceCode
  });
});
  
  // Mark service as active when streaming starts
  socket.on('streamingStarted', (data) => {
    const { serviceId } = data;
    console.log(`🎙️ Streaming started for service ${serviceId}`);
    
    // Mark service as active
    activeServiceIds.set(serviceId, true);
    
    // Set timeout to auto-deactivate after SERVICE_TIMEOUT minutes
    const timeout = parseInt(process.env.SERVICE_TIMEOUT || '60') * 60 * 1000;
    setTimeout(() => {
      console.log(`⏰ Service ${serviceId} timeout reached - auto-deactivating`);
      activeServiceIds.delete(serviceId);
    }, timeout);
  });
  
  // Mark service as inactive when streaming stops
  socket.on('streamingStopped', (data) => {
    const { serviceId } = data;
    console.log(`🛑 Streaming stopped for service ${serviceId}`);
    activeServiceIds.delete(serviceId);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Control panel disconnected:', socket.id);
  });
});

// Participant namespace for clients
const participantNamespace = io.of('/participant');

participantNamespace.on('connection', (socket) => {
  console.log('🔌 Participant connected via Socket.IO:', socket.id);
  
  // ✅ FIX: Track ALL rooms this socket joins, not just the last one
  const socketRooms = new Map(); // Map of room -> language
  
  socket.on('join', (data) => {
    let serviceId, language;
    
    // Handle multiple formats
    if (typeof data === 'string') {
      // Check if it's room format "serviceId:language"
      if (data.includes(':')) {
        const parts = data.split(':');
        serviceId = parts[0];
        language = parts[1];
      } else {
        // Just serviceId
        serviceId = data;
        language = 'unknown';
      }
    } else {
      // Object format {serviceId, language}
      serviceId = data.serviceId;
      language = data.language || 'unknown';
    }
    
    const room = `${serviceId}:${language}`;
    
    // ✅ FIX: Store this room for later cleanup
    socketRooms.set(room, { serviceId, language });
    
    console.log(`👤 Participant joined service: ${serviceId}, language: ${language}`);
    
    // Join room
    socket.join(room);
    console.log(`📥 Socket ${socket.id} joined room: ${room}`);
    
    // Register for translation service if not already registered
    if (!serviceSubscriptionMap.has(serviceId)) {
      console.log(`🔧 Registering translation service for ${serviceId}`);
      registerForServiceTranscripts({
        io: participantNamespace,
        serviceId,
        serviceLanguageMap,
        serviceSubscriptionMap
      });
    }
    
    // Add language to service translation map (exclude special rooms)
    if (language !== 'transcript' && language !== 'heartbeat') {
      addTranslationLanguageToService({
        serviceId,
        language,
        serviceLanguageMap
      });
      console.log(`🌐 Added language ${language} to service ${serviceId}`);
      
      // ✅ FIX: Only track real language rooms in subscriber count
      // Track subscriber for control panel display
      if (!subscriberTracker.has(serviceId)) {
        subscriberTracker.set(serviceId, new Map());
      }
      const serviceSubscribers = subscriberTracker.get(serviceId);
      
      // Increment count for this language
      const currentCount = serviceSubscribers.get(language) || 0;
      serviceSubscribers.set(language, currentCount + 1);
      
      // Notify control panel of subscriber update
      const languages = Array.from(serviceSubscribers.entries()).map(([name, subscribers]) => ({
        name,
        subscribers
      }));
      controlNamespace.to(`service-${serviceId}`).emit('subscribers', { languages });
      
      console.log(`📊 Updated subscribers for ${serviceId}:`, languages);
    } else {
      console.log(`⏭️  Skipping subscriber tracking for special room: ${language}`);
    }
  });
  
  // ✅ NEW: Add 'leave' event handler
  socket.on('leave', (data) => {
    let serviceId, language;
    
    // Handle multiple formats
    if (typeof data === 'string') {
      if (data.includes(':')) {
        const parts = data.split(':');
        serviceId = parts[0];
        language = parts[1];
      } else {
        serviceId = data;
        language = 'unknown';
      }
    } else {
      serviceId = data.serviceId;
      language = data.language || 'unknown';
    }
    
    const room = `${serviceId}:${language}`;
    
    console.log(`👋 Participant leaving room: ${room}`);
    
    // Leave the room
    socket.leave(room);
    
    // ✅ Remove from tracking
    socketRooms.delete(room);
    
    // ✅ Decrement subscriber count (only for real language rooms)
    if (language !== 'transcript' && language !== 'heartbeat') {
      const serviceSubscribers = subscriberTracker.get(serviceId);
      if (serviceSubscribers && serviceSubscribers.has(language)) {
        const count = serviceSubscribers.get(language);
        
        if (count <= 1) {
          // Remove language entirely if this was the last subscriber
          serviceSubscribers.delete(language);
          console.log(`🗑️  Removed ${language} from ${serviceId} (last subscriber left)`);
        } else {
          // Decrement count
          serviceSubscribers.set(language, count - 1);
          console.log(`📉 Decremented ${language} count to ${count - 1} for ${serviceId}`);
        }
        
        // Check if room is truly empty
        const subscribersInRoom = participantNamespace.adapter.rooms.get(room)?.size || 0;
        if (subscribersInRoom === 0) {
          removeTranslationLanguageFromService({
            serviceId,
            language,
            serviceLanguageMap
          });
          console.log(`🧹 Removed language ${language} from service ${serviceId} translation map`);
        }
        
        // Notify control panel of subscriber update
        const languages = Array.from(serviceSubscribers.entries()).map(([name, subscribers]) => ({
          name,
          subscribers
        }));
        controlNamespace.to(`service-${serviceId}`).emit('subscribers', { languages });
        
        console.log(`📊 Updated subscribers for ${serviceId}:`, languages);
        
        // Clean up empty service tracker
        if (serviceSubscribers.size === 0) {
          subscriberTracker.delete(serviceId);
          console.log(`🧹 Cleaned up empty tracker for service ${serviceId}`);
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Participant disconnected:', socket.id);
    
    // ✅ FIX: Clean up ALL rooms this socket was in, not just the last one
    for (const [room, { serviceId, language }] of socketRooms.entries()) {
      console.log(`🧹 Cleaning up room ${room} for disconnected socket`);
      
      // Decrement subscriber count (only for real language rooms)
      if (language !== 'transcript' && language !== 'heartbeat') {
        const serviceSubscribers = subscriberTracker.get(serviceId);
        if (serviceSubscribers && serviceSubscribers.has(language)) {
          const count = serviceSubscribers.get(language);
          
          if (count <= 1) {
            serviceSubscribers.delete(language);
            console.log(`🗑️  Removed ${language} from ${serviceId} (disconnected)`);
          } else {
            serviceSubscribers.set(language, count - 1);
            console.log(`📉 Decremented ${language} to ${count - 1} (disconnected)`);
          }
          
          // Check if room is truly empty
          const subscribersInRoom = participantNamespace.adapter.rooms.get(room)?.size || 0;
          if (subscribersInRoom === 0) {
            removeTranslationLanguageFromService({
              serviceId,
              language,
              serviceLanguageMap
            });
            console.log(`🧹 Removed language ${language} from translation map`);
          }
          
          // Notify control panel
          const languages = Array.from(serviceSubscribers.entries()).map(([name, subscribers]) => ({
            name,
            subscribers
          }));
          controlNamespace.to(`service-${serviceId}`).emit('subscribers', { languages });
          
          console.log(`📊 Updated subscribers for ${serviceId}:`, languages);
          
          // Clean up empty tracker
          if (serviceSubscribers.size === 0) {
            subscriberTracker.delete(serviceId);
            console.log(`🧹 Cleaned up tracker for ${serviceId}`);
          }
        }
      }
    }
    
    // Clear the socket's room tracking
    socketRooms.clear();
  });
});

/**
 * Broadcast message to all Socket.IO clients in a service
 * @param {string} serviceId - Service ID
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
export function broadcastToSocketIO(serviceId, event, data) {
  controlNamespace.to(`service-${serviceId}`).emit(event, data);
  participantNamespace.to(`service-${serviceId}`).emit(event, data);
  console.log(`📡 Socket.IO broadcast ${event} to service ${serviceId}`);
}

// =====================================================
// END OF SOCKET.IO SETUP
// =====================================================



// =====================================================
// WEBSOCKET SETUP (native ws)
// =====================================================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');

  // ✅ CRITICAL FIX: Add error handler FIRST, before any operations
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error:`, error.message);
    // Don't crash the server - just log the error
  });

  // Extract service ID from URL or headers
  const url = new URL(req.url, `http://${req.headers.host}`);
  const serviceId = url.searchParams.get('serviceId');

  if (!serviceId) {
    console.warn('⚠️  WebSocket connection without serviceId');
    // Use terminate() instead of close() to avoid close code issues
    ws.terminate();
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
    try {
      console.log(`📨 Message from client on service ${serviceId}:`, message.toString());
      // TODO: Handle client messages if needed
    } catch (error) {
      console.error(`❌ Error processing message:`, error.message);
    }
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
  try {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to translation service',
        serviceId: serviceId,
        timestamp: new Date().toISOString()
      }));
    }
  } catch (error) {
    console.error(`❌ Error sending initial message:`, error.message);
  }
});

// ✅ CRITICAL FIX: Server-level error handler prevents crashes
wss.on('error', (error) => {
  console.error('❌ WebSocket Server error:', error.message);
  // Don't crash - just log it
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
    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
        sentCount++;
      }
    } catch (error) {
      console.error(`❌ Error broadcasting to client:`, error.message);
      // Continue with other clients even if one fails
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

// ✅ FIX 1c: Auto-create service in database
async function ensureDefaultServiceExists() {
  try {
    const defaultServiceId = process.env.DEFAULT_SERVICE_ID;
    const churchKey = process.env.CHURCH_KEY;
    
    if (!defaultServiceId || !churchKey) {
      console.warn('⚠️  DEFAULT_SERVICE_ID or CHURCH_KEY not set in .env');
      return;
    }
    
    const exists = await getServiceByServiceId(defaultServiceId);
    if (exists) {
      console.log(`✅ Default service ${defaultServiceId} already exists`);
      return;
    }
    
    const church = await getChurchByKey(churchKey);
    if (!church) {
      console.error(`❌ Church not found with key: ${churchKey}`);
      return;
    }
    
    await createService(church.id, {
      service_id: defaultServiceId,
      name: 'Default Service',
      active_languages: []
    });
    
    console.log(`✅ Created default service: ${defaultServiceId}`);
  } catch (error) {
    console.error('❌ Error ensuring default service exists:', error);
  }
}

// Add imports at top if needed:
// import { getServiceByServiceId, createService } from '../db/services.js';
// import { getChurchByKey } from '../db/churches.js';

await ensureDefaultServiceExists();

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
  console.log('   GET  /church/info          → Church config (public API)');
  console.log('   GET  /church/configuration → Control panel config');
  console.log('   GET  /api/church/profile   → User profile (auth)');
  console.log('   GET  /api/services         → User services (auth)');
  console.log('===========================================');
});

// Export for testing
export { app, server };
