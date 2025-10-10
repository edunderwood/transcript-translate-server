/**
 * Services Database Functions
 * 
 * Handles all database operations related to translation services
 */

import { supabaseAdmin } from '../supabase.js';

/**
 * Get service by service_id (string identifier)
 * @param {string} serviceId - Service ID string
 * @returns {Object|null} Service data with church info
 */
async function getServiceByServiceId(serviceId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select(`
        *,
        churches (*)
      `)
      .eq('service_id', serviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No service found with ID ${serviceId}`);
        return null;
      }
      console.error('Error fetching service by service ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getServiceByServiceId:', error);
    throw error;
  }
}

/**
 * Get service by UUID
 * @param {string} id - Service UUID
 * @returns {Object|null} Service data
 */
async function getServiceById(id) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  No service found with UUID ${id}`);
        return null;
      }
      console.error('Error fetching service by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getServiceById:', error);
    throw error;
  }
}

/**
 * Get all services for a church
 * @param {string} churchId - Church UUID
 * @returns {Array} Array of services
 */
async function getServicesByChurch(churchId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services by church:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getServicesByChurch:', error);
    throw error;
  }
}

/**
 * Get all services for a user
 * @param {string} userId - User UUID
 * @returns {Array} Array of services
 */
async function getServicesByUser(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select(`
        *,
        churches!inner (
          user_id
        )
      `)
      .eq('churches.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services by user:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getServicesByUser:', error);
    throw error;
  }
}

/**
 * Create new service
 * @param {string} churchId - Church UUID
 * @param {Object} serviceData - Service information
 * @returns {Object} Created service data
 */
async function createService(churchId, serviceData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .insert([{
        church_id: churchId,
        service_id: serviceData.service_id || generateServiceId(),
        name: serviceData.name || 'Main Service',
        status: 'inactive',
        active_languages: serviceData.active_languages || []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      throw error;
    }

    console.log(`✅ Created service ${data.service_id} for church ${churchId}`);
    return data;
  } catch (error) {
    console.error('Error in createService:', error);
    throw error;
  }
}

/**
 * Update service status (active/inactive)
 * @param {string} serviceId - Service ID string
 * @param {string} status - 'active' or 'inactive'
 * @param {Array} activeLanguages - Array of active language codes
 * @returns {Object} Updated service data
 */
async function updateServiceStatus(serviceId, status, activeLanguages = []) {
  try {
    const updates = {
      status,
      active_languages: activeLanguages
    };

    // Add timestamp based on status
    if (status === 'active') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'inactive') {
      updates.ended_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .update(updates)
      .eq('service_id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating service status:', error);
      throw error;
    }

    console.log(`✅ Updated service ${serviceId} status to ${status}`);
    return data;
  } catch (error) {
    console.error('Error in updateServiceStatus:', error);
    throw error;
  }
}

/**
 * Update service details
 * @param {string} serviceId - Service ID string
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated service data
 */
async function updateService(serviceId, updates) {
  try {
    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.service_id;
    delete allowedUpdates.church_id;
    delete allowedUpdates.created_at;

    const { data, error } = await supabaseAdmin
      .from('services')
      .update(allowedUpdates)
      .eq('service_id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      throw error;
    }

    console.log(`✅ Updated service ${serviceId}`);
    return data;
  } catch (error) {
    console.error('Error in updateService:', error);
    throw error;
  }
}

/**
 * Delete service
 * @param {string} serviceId - Service ID string
 * @returns {boolean} Success status
 */
async function deleteService(serviceId) {
  try {
    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error deleting service:', error);
      throw error;
    }

    console.log(`✅ Deleted service ${serviceId}`);
    return true;
  } catch (error) {
    console.error('Error in deleteService:', error);
    throw error;
  }
}

/**
 * Check if service is active
 * @param {string} serviceId - Service ID string
 * @returns {boolean} True if active
 */
async function isServiceActive(serviceId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('status')
      .eq('service_id', serviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error checking service status:', error);
      throw error;
    }

    return data && data.status === 'active';
  } catch (error) {
    console.error('Error in isServiceActive:', error);
    return false;
  }
}

/**
 * Get all active services
 * @returns {Array} Array of active services
 */
async function getActiveServices() {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select(`
        *,
        churches (*)
      `)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active services:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveServices:', error);
    throw error;
  }
}

/**
 * Generate unique service ID
 * @returns {string} Unique service ID
 */
function generateServiceId() {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `SVC_${random}${timestamp}`;
}

/**
 * Check if service ID is available
 * @param {string} serviceId - Service ID to check
 * @returns {boolean} True if available
 */
async function isServiceIdAvailable(serviceId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('id')
      .eq('service_id', serviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return true; // No rows found - ID is available
      }
      throw error;
    }

    return false; // ID exists
  } catch (error) {
    console.error('Error checking service ID availability:', error);
    throw error;
  }
}

/**
 * Get service statistics
 * @param {string} serviceId - Service ID string
 * @returns {Object} Service statistics
 */
async function getServiceStats(serviceId) {
  try {
    const service = await getServiceByServiceId(serviceId);
    
    if (!service) {
      return null;
    }

    // Get related session data
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching service stats:', error);
      throw error;
    }

    return {
      service_id: service.service_id,
      name: service.name,
      status: service.status,
      started_at: service.started_at,
      ended_at: service.ended_at,
      active_languages: service.active_languages,
      recent_sessions: sessions || [],
      total_sessions: sessions?.length || 0
    };
  } catch (error) {
    console.error('Error in getServiceStats:', error);
    throw error;
  }
}

export {
  getServiceByServiceId,
  getServiceById,
  getServicesByChurch,
  getServicesByUser,
  createService,
  updateServiceStatus,
  updateService,
  deleteService,
  isServiceActive,
  getActiveServices,
  generateServiceId,
  isServiceIdAvailable,
  getServiceStats
};
