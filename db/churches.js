/**
 * Church Database Functions
 * 
 * Handles all database operations related to churches
 */

import { supabaseAdmin } from '../supabase.js';

/**
 * Get church info for a specific user
 * @param {string} userId - User's UUID
 * @returns {Object|null} Church data or null
 */
async function getChurchByUserId(userId) {
  try {
    console.log(`🔍 DB Query: Fetching church for user_id: ${userId}`);

    const { data, error } = await supabaseAdmin
      .from('churches')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`❌ DB Error:`, error);
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log(`ℹ️  No church found for user ${userId}`);
        return null;
      }
      console.error('Error fetching church by user ID:', error);
      throw error;
    }

    console.log(`✅ DB Result: Found church:`, {
      id: data.id,
      name: data.name,
      church_key: data.church_key,
      user_id: data.user_id,
      default_service_id: data.default_service_id
    });

    return data;
  } catch (error) {
    console.error('Error in getChurchByUserId:', error);
    throw error;
  }
}

/**
 * Get church info by church_key (public - no auth needed)
 * Used by client app to fetch branding/config
 * @param {string} churchKey - Unique church identifier
 * @returns {Object|null} Church data or null
 */
async function getChurchByKey(churchKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from('churches')
      .select('*')
      .eq('church_key', churchKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No church found with key ${churchKey}`);
        return null;
      }
      console.error('Error fetching church by key:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getChurchByKey:', error);
    throw error;
  }
}

/**
 * Get church by ID
 * @param {string} churchId - Church UUID
 * @returns {Object|null} Church data or null
 */
async function getChurchById(churchId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('churches')
      .select('*')
      .eq('id', churchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No church found with ID ${churchId}`);
        return null;
      }
      console.error('Error fetching church by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getChurchById:', error);
    throw error;
  }
}

/**
 * Create new church for user
 * @param {string} userId - User's UUID
 * @param {Object} churchData - Church information
 * @returns {Object} Created church data
 */
async function createChurch(userId, churchData) {
  try {
    // Generate church key from name if not provided
    const churchName = churchData.name || 'My Church';
    const churchKey = churchData.church_key || await generateChurchKey(churchName);

    console.log(`🔑 Generated church key: ${churchKey} for ${churchName}`);

    const { data, error } = await supabaseAdmin
      .from('churches')
      .insert([{
        user_id: userId,
        name: churchName,
        church_key: churchKey,
        greeting: churchData.greeting || 'Welcome!',
        message: churchData.message || [],
        additional_welcome: churchData.additional_welcome || '',
        waiting_message: churchData.waiting_message || 'Service is currently offline',
        logo_base64: churchData.logo_base64 || '',
        host_language: churchData.host_language || 'en-US',
        translation_languages: churchData.translation_languages || [],
        default_service_id: churchData.default_service_id || '1234'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating church:', error);
      throw error;
    }

    console.log(`✅ Created church for user ${userId}: ${data.name}`);
    return data;
  } catch (error) {
    console.error('Error in createChurch:', error);
    throw error;
  }
}

/**
 * Update church info
 * @param {string} userId - User's UUID (for verification)
 * @param {string} churchId - Church UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated church data
 */
async function updateChurch(userId, churchId, updates) {
  try {
    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.created_at;

    const { data, error } = await supabaseAdmin
      .from('churches')
      .update(allowedUpdates)
      .eq('id', churchId)
      .eq('user_id', userId) // Ensure user owns this church
      .select()
      .single();

    if (error) {
      console.error('Error updating church:', error);
      throw error;
    }

    console.log(`✅ Updated church ${churchId} for user ${userId}`);
    return data;
  } catch (error) {
    console.error('Error in updateChurch:', error);
    throw error;
  }
}

/**
 * Delete church
 * @param {string} userId - User's UUID (for verification)
 * @param {string} churchId - Church UUID
 * @returns {boolean} Success status
 */
async function deleteChurch(userId, churchId) {
  try {
    const { error } = await supabaseAdmin
      .from('churches')
      .delete()
      .eq('id', churchId)
      .eq('user_id', userId); // Ensure user owns this church

    if (error) {
      console.error('Error deleting church:', error);
      throw error;
    }

    console.log(`✅ Deleted church ${churchId} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error in deleteChurch:', error);
    throw error;
  }
}

/**
 * Generate unique church key from church name
 * Format: INITIALS + unique suffix (max 12 characters)
 * Example: "Firmus Technology Ltd" → "FTL9A3B2C"
 * @param {string} churchName - Name of the church
 * @returns {string} Unique church key
 */
async function generateChurchKey(churchName) {
  // Extract initials from church name (first letter of each word)
  const initials = churchName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .filter(char => /[A-Z]/.test(char)) // Only letters
    .join('')
    .substring(0, 4); // Max 4 initials

  // Generate unique suffix to fill remaining characters (max 12 total)
  const maxSuffixLength = 12 - initials.length;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate random alphanumeric suffix
    const suffix = Math.random().toString(36).substring(2, 2 + maxSuffixLength).toUpperCase();
    const churchKey = initials + suffix;

    // Check if this key is available
    const isAvailable = await isChurchKeyAvailable(churchKey);
    if (isAvailable) {
      return churchKey;
    }

    attempts++;
  }

  // If we couldn't generate a unique key, add timestamp
  const timestamp = Date.now().toString(36).substring(0, maxSuffixLength).toUpperCase();
  return (initials + timestamp).substring(0, 12);
}

/**
 * Check if church key is available
 * @param {string} churchKey - Church key to check
 * @returns {boolean} True if available
 */
async function isChurchKeyAvailable(churchKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from('churches')
      .select('id')
      .eq('church_key', churchKey)
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
    console.error('Error checking church key availability:', error);
    throw error;
  }
}

/**
 * Get all churches (admin only)
 * @param {number} limit - Max number of results
 * @param {number} offset - Offset for pagination
 * @returns {Array} Array of churches
 */
async function getAllChurches(limit = 50, offset = 0) {
  try {
    const { data, error } = await supabaseAdmin
      .from('churches')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all churches:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getAllChurches:', error);
    throw error;
  }
}

export {
  getChurchByUserId,
  getChurchByKey,
  getChurchById,
  createChurch,
  updateChurch,
  deleteChurch,
  generateChurchKey,
  isChurchKeyAvailable,
  getAllChurches
};
