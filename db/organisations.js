/**
 * Organisation Database Functions
 *
 * Handles all database operations related to organisations
 */

import { supabaseAdmin } from '../supabase.js';

/**
 * Get organisation info for a specific user
 * @param {string} userId - User's UUID
 * @returns {Object|null} Organisation data or null
 */
async function getOrganisationByUserId(userId) {
  try {
    console.log(`🔍 DB Query: Fetching organisation for user_id: ${userId}`);

    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`❌ DB Error:`, error);
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log(`ℹ️  No organisation found for user ${userId}`);
        return null;
      }
      console.error('Error fetching organisation by user ID:', error);
      throw error;
    }

    console.log(`✅ DB Result: Found organisation:`, {
      id: data.id,
      name: data.name,
      organisation_key: data.organisation_key,
      user_id: data.user_id,
      default_service_id: data.default_service_id
    });

    return data;
  } catch (error) {
    console.error('Error in getOrganisationByUserId:', error);
    throw error;
  }
}

/**
 * Get organisation info by organisation_key (public - no auth needed)
 * Used by client app to fetch branding/config
 * @param {string} organisationKey - Unique organisation identifier
 * @returns {Object|null} Organisation data or null
 */
async function getOrganisationByKey(organisationKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('*')
      .eq('organisation_key', organisationKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No organisation found with key ${organisationKey}`);
        return null;
      }
      console.error('Error fetching organisation by key:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrganisationByKey:', error);
    throw error;
  }
}

/**
 * Get organisation by ID
 * @param {string} organisationId - Organisation UUID
 * @returns {Object|null} Organisation data or null
 */
async function getOrganisationById(organisationId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('*')
      .eq('id', organisationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No organisation found with ID ${organisationId}`);
        return null;
      }
      console.error('Error fetching organisation by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrganisationById:', error);
    throw error;
  }
}

/**
 * Create new organisation for user
 * @param {string} userId - User's UUID
 * @param {Object} organisationData - Organisation information
 * @returns {Object} Created organisation data
 */
async function createOrganisation(userId, organisationData) {
  try {
    // Generate organisation key from name if not provided
    const organisationName = organisationData.name || 'My Organisation';
    const organisationKey = organisationData.organisation_key || await generateOrganisationKey(organisationName);

    console.log(`🔑 Generated organisation key: ${organisationKey} for ${organisationName}`);

    const { data, error } = await supabaseAdmin
      .from('organisations')
      .insert([{
        user_id: userId,
        name: organisationName,
        organisation_key: organisationKey,
        greeting: organisationData.greeting || 'Welcome!',
        message: organisationData.message || [],
        additional_welcome: organisationData.additional_welcome || '',
        waiting_message: organisationData.waiting_message || 'Service is currently offline',
        logo_base64: organisationData.logo_base64 || '',
        host_language: organisationData.host_language || 'en-US',
        translation_languages: organisationData.translation_languages || [],
        default_service_id: organisationData.default_service_id || '1234'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating organisation:', error);
      throw error;
    }

    console.log(`✅ Created organisation for user ${userId}: ${data.name}`);
    return data;
  } catch (error) {
    console.error('Error in createOrganisation:', error);
    throw error;
  }
}

/**
 * Update organisation info
 * @param {string} userId - User's UUID (for verification)
 * @param {string} organisationId - Organisation UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated organisation data
 */
async function updateOrganisation(userId, organisationId, updates) {
  try {
    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.created_at;

    const { data, error } = await supabaseAdmin
      .from('organisations')
      .update(allowedUpdates)
      .eq('id', organisationId)
      .eq('user_id', userId) // Ensure user owns this organisation
      .select()
      .single();

    if (error) {
      console.error('Error updating organisation:', error);
      throw error;
    }

    console.log(`✅ Updated organisation ${organisationId} for user ${userId}`);
    return data;
  } catch (error) {
    console.error('Error in updateOrganisation:', error);
    throw error;
  }
}

/**
 * Delete organisation
 * @param {string} userId - User's UUID (for verification)
 * @param {string} organisationId - Organisation UUID
 * @returns {boolean} Success status
 */
async function deleteOrganisation(userId, organisationId) {
  try {
    const { error } = await supabaseAdmin
      .from('organisations')
      .delete()
      .eq('id', organisationId)
      .eq('user_id', userId); // Ensure user owns this organisation

    if (error) {
      console.error('Error deleting organisation:', error);
      throw error;
    }

    console.log(`✅ Deleted organisation ${organisationId} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error in deleteOrganisation:', error);
    throw error;
  }
}

/**
 * Generate unique organisation key from organisation name
 * Format: INITIALS-SUFFIX (max 15 characters including dash)
 * Example: "Firmus Technology Ltd" → "FTL-9A3B2C"
 * Example: "St John's 123 Company" → "SJ1C-8F4D1"
 * @param {string} organisationName - Name of the organisation
 * @returns {string} Unique organisation key
 */
async function generateOrganisationKey(organisationName) {
  // Extract first character of each word (letters and numbers)
  const initials = organisationName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .filter(char => /[A-Z0-9]/.test(char)) // Letters and numbers
    .join('')
    .substring(0, 4); // Max 4 initials

  // Generate unique suffix (max 15 total - initials - 1 for dash)
  const maxSuffixLength = 15 - initials.length - 1;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate random alphanumeric suffix
    const suffix = Math.random().toString(36).substring(2, 2 + maxSuffixLength).toUpperCase();
    const organisationKey = `${initials}-${suffix}`;

    // Check if this key is available
    const isAvailable = await isOrganisationKeyAvailable(organisationKey);
    if (isAvailable) {
      return organisationKey;
    }

    attempts++;
  }

  // If we couldn't generate a unique key, add timestamp
  const timestamp = Date.now().toString(36).substring(0, maxSuffixLength).toUpperCase();
  return `${initials}-${timestamp}`.substring(0, 15);
}

/**
 * Check if organisation key is available
 * @param {string} organisationKey - Organisation key to check
 * @returns {boolean} True if available
 */
async function isOrganisationKeyAvailable(organisationKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('id')
      .eq('organisation_key', organisationKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - key is available
        return true;
      }
      throw error;
    }

    // Key exists
    return false;
  } catch (error) {
    console.error('Error checking organisation key availability:', error);
    throw error;
  }
}

/**
 * Get all organisations (admin only)
 * @param {number} limit - Max number of results
 * @param {number} offset - Offset for pagination
 * @returns {Array} Array of organisations
 */
async function getAllOrganisations(limit = 50, offset = 0) {
  try {
    const { data, error } = await supabaseAdmin
      .from('organisations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all organisations:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getAllOrganisations:', error);
    throw error;
  }
}

export {
  getOrganisationByUserId,
  getOrganisationByKey,
  getOrganisationById,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  generateOrganisationKey,
  isOrganisationKeyAvailable,
  getAllOrganisations
};
