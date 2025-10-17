/**
 * Translation Usage Database Functions
 *
 * Tracks character usage for Google Translate API per church
 */

import { supabaseAdmin } from '../supabase.js';

/**
 * Record translation character usage
 * @param {Object} usageData - Usage data
 * @param {string} usageData.church_id - Church UUID
 * @param {string} usageData.service_id - Service ID string
 * @param {string} usageData.language - Target language code
 * @param {number} usageData.character_count - Number of characters translated
 * @param {number} usageData.client_count - Number of clients receiving translation
 * @returns {Object|null} Created usage record
 */
export async function recordTranslationUsage(usageData) {
  try {
    const { church_id, service_id, language, character_count, client_count = 0 } = usageData;

    if (!church_id || !service_id || !language || !character_count) {
      console.warn('Missing required usage data fields');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('translation_usage')
      .insert([{
        church_id,
        service_id,
        language,
        character_count,
        client_count,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error recording translation usage:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in recordTranslationUsage:', error);
    // Don't throw - we don't want usage tracking to break translations
    return null;
  }
}

/**
 * Get total character usage for a church
 * @param {string} churchId - Church UUID
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @returns {Object} Usage statistics
 */
export async function getChurchUsage(churchId, options = {}) {
  try {
    let query = supabaseAdmin
      .from('translation_usage')
      .select('character_count, language, date, client_count')
      .eq('church_id', churchId);

    if (options.startDate) {
      query = query.gte('date', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('date', options.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching church usage:', error);
      throw error;
    }

    // Calculate total characters
    const totalCharacters = data.reduce((sum, record) => sum + record.character_count, 0);

    // Group by language
    const byLanguage = data.reduce((acc, record) => {
      if (!acc[record.language]) {
        acc[record.language] = 0;
      }
      acc[record.language] += record.character_count;
      return acc;
    }, {});

    // Group by date
    const byDate = data.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = 0;
      }
      acc[record.date] += record.character_count;
      return acc;
    }, {});

    return {
      totalCharacters,
      byLanguage,
      byDate,
      recordCount: data.length
    };
  } catch (error) {
    console.error('Error in getChurchUsage:', error);
    throw error;
  }
}

/**
 * Get usage for current month
 * @param {string} churchId - Church UUID
 * @returns {Object} Current month usage statistics
 */
export async function getCurrentMonthUsage(churchId) {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    return await getChurchUsage(churchId, { startDate, endDate });
  } catch (error) {
    console.error('Error in getCurrentMonthUsage:', error);
    throw error;
  }
}

/**
 * Get usage for a specific date range
 * @param {string} churchId - Church UUID
 * @param {number} days - Number of days back to query
 * @returns {Object} Usage statistics
 */
export async function getRecentUsage(churchId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    return await getChurchUsage(churchId, { startDate: startDateStr });
  } catch (error) {
    console.error('Error in getRecentUsage:', error);
    throw error;
  }
}

export default {
  recordTranslationUsage,
  getChurchUsage,
  getCurrentMonthUsage,
  getRecentUsage
};
