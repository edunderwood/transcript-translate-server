/**
 * Two-Stage Registration Routes for OpenWord Server
 * 
 * This module implements a two-stage registration process:
 * 1. User registration with email verification
 * 2. Organization setup after email is verified
 * 
 * Add these routes to your Express app in server.js
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../../supabase.js';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateOrganisationKey } from '../../db/organisations.js';
import { generateServiceId } from '../../db/services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Middleware to verify JWT token and check email verification
 */
async function requireVerifiedEmail(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        const token = authHeader.substring(7);

        // Verify JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check if email is verified
        if (!user.email_confirmed_at) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Please verify your email before continuing.'
            });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
}

// =====================================================
// STAGE 1 ROUTES - User Registration
// =====================================================

/**
 * Serve Stage 1 registration page
 * GET /register
 */
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/register-step1.html'));
});

/**
 * Serve email verification page
 * GET /verify-email
 */
router.get('/verify-email', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/verify-email.html'));
});

/**
 * Check if email is verified
 * GET /api/check-verification
 * 
 * This endpoint checks the verification status of the current user
 */
router.get('/api/check-verification', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                verified: false,
                message: 'No authorization token provided'
            });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                verified: false,
                message: 'Invalid token'
            });
        }

        const isVerified = user.email_confirmed_at !== null;

        res.json({
            success: true,
            verified: isVerified,
            email: user.email,
            userId: user.id
        });

    } catch (error) {
        console.error('Verification check error:', error);
        res.status(500).json({
            success: false,
            verified: false,
            message: 'Error checking verification status'
        });
    }
});

// =====================================================
// STAGE 2 ROUTES - Organization Setup
// =====================================================

/**
 * Serve Stage 2 organization setup page
 * GET /complete-setup
 */
router.get('/complete-setup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/complete-setup.html'));
});

/**
 * Create organization after email verification
 * POST /api/register/organization
 *
 * This endpoint creates the organisation record and default service
 * Requires verified email
 */
router.post('/api/register/organization', requireVerifiedEmail, async (req, res) => {
    try {
        const {
            organisationName,
            contactName,
            contactPhone,
            hostLanguage,
            translationLanguages,
            greeting,
            message,
            additionalWelcome,
            waitingMessage,
            logoBase64
        } = req.body;

        const userId = req.user.id;

        // Validate required fields
        if (!organisationName || !contactName || !hostLanguage) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        if (!translationLanguages || translationLanguages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one translation language is required'
            });
        }

        // Check if user already has an organisation
        const { data: existingOrganisations, error: checkError } = await supabaseAdmin
            .from('churches')
            .select('id')
            .eq('user_id', userId);

        if (checkError) {
            console.error('Error checking existing organisation:', checkError);
            return res.status(500).json({
                success: false,
                message: 'Error checking existing organization'
            });
        }

        if (existingOrganisations && existingOrganisations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Organization already exists for this user'
            });
        }

        // Generate unique keys
        const organisationKey = await generateOrganisationKey(organisationName);
        const defaultServiceId = await generateServiceId();

        // Prepare organisation record data
        const organisationData = {
            user_id: userId,
            name: organisationName,
            church_key: organisationKey,
            greeting: greeting || 'Welcome!',
            message: message || [],
            additional_welcome: additionalWelcome || '',
            waiting_message: waitingMessage || 'Service is currently offline',
            logo_base64: logoBase64 || '',
            host_language: hostLanguage,
            translation_languages: translationLanguages,
            default_service_id: defaultServiceId,
            contact_name: contactName,
            contact_phone: contactPhone || ''
        };

        // Create organisation record
        const { data: organisationResult, error: organisationError } = await supabaseAdmin
            .from('churches')
            .insert([organisationData])
            .select()
            .single();

        if (organisationError) {
            console.error('Organisation creation error:', organisationError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create organization',
                error: organisationError.message
            });
        }

        console.log(`✅ Created organisation: ${organisationResult.id} for user ${userId}`);

        // Create default service
        const serviceData = {
            church_id: organisationResult.id,
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
            message: 'Organization setup completed successfully',
            organisation: {
                id: organisationResult.id,
                name: organisationResult.name,
                organisation_key: organisationResult.church_key,
                default_service_id: defaultServiceId
            }
        });

    } catch (error) {
        console.error('Organization setup error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during organization setup',
            error: error.message
        });
    }
});

/**
 * Check if organization setup is complete
 * GET /api/setup-status
 *
 * Returns whether the user has completed organization setup
 */
router.get('/api/setup-status', requireVerifiedEmail, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if organisation exists for this user
        const { data: organisations, error } = await supabaseAdmin
            .from('churches')
            .select('id, name, church_key')
            .eq('user_id', userId);

        if (error) {
            console.error('Error checking setup status:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking setup status'
            });
        }

        const isComplete = organisations && organisations.length > 0;

        res.json({
            success: true,
            setupComplete: isComplete,
            organisation: isComplete ? organisations[0] : null
        });

    } catch (error) {
        console.error('Setup status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking setup status'
        });
    }
});

/**
 * Resend verification email
 * POST /api/resend-verification
 * 
 * Resends the email verification link
 */
router.post('/api/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Use Supabase to resend verification email
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) {
            console.error('Resend verification error:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resending verification email'
        });
    }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

export default router;
