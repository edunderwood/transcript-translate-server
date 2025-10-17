import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Get organisation secret key
 * Supports both ORGANISATION_KEY and CHURCH_KEY (deprecated) for backwards compatibility
 */
export const getOrganisationSecretKey = () => {
    return process.env.ORGANISATION_KEY || process.env.CHURCH_KEY;
}

/**
 * Get organisation name
 * Supports both ORGANISATION_NAME and CHURCH_NAME (deprecated)
 */
export const getOrganisationName = () => {
    return process.env.ORGANISATION_NAME || process.env.CHURCH_NAME;
}

/**
 * Get organisation logo (base64)
 * Supports both ORGANISATION_LOGO_BASE64 and CHURCH_LOGO_BASE64 (deprecated)
 */
export const getOrganisationLogoBase64 = () => {
    return process.env.ORGANISATION_LOGO_BASE64 || process.env.CHURCH_LOGO_BASE64;
}

/**
 * Get organisation greeting message
 * Supports both ORGANISATION_GREETING and CHURCH_GREETING (deprecated)
 */
export const getOrganisationGreeting = () => {
    return process.env.ORGANISATION_GREETING || process.env.CHURCH_GREETING;
}

/**
 * Get organisation welcome message
 * Supports both ORGANISATION_MESSAGE and CHURCH_MESSAGE (deprecated)
 */
export const getOrganisationMessage = () => {
    return process.env.ORGANISATION_MESSAGE || process.env.CHURCH_MESSAGE;
}

/**
 * Get organisation waiting message (when service is offline)
 * Supports both ORGANISATION_WAITING_MESSAGE and CHURCH_WAITING_MESSAGE (deprecated)
 */
export const getOrganisationWaitingMessage = () => {
    return process.env.ORGANISATION_WAITING_MESSAGE || process.env.CHURCH_WAITING_MESSAGE;
}

/**
 * Get organisation additional welcome message
 * Supports both ORGANISATION_ADDITIONAL_WELCOME and CHURCH_ADDITIONAL_WELCOME (deprecated)
 */
export const getOrganisationAdditionalWelcome = () => {
    return process.env.ORGANISATION_ADDITIONAL_WELCOME || process.env.CHURCH_ADDITIONAL_WELCOME;
}

/**
 * Get organisation host language
 */
export const getOrganisationLanguage = () => {
    return process.env.HOST_LANGUAGE;
}

/**
 * Get organisation default service ID
 */
export const getOrganisationDefaultServiceId = () => {
    return process.env.DEFAULT_SERVICE_ID;
}

/**
 * Get organisation translation languages
 */
export const getOrganisationTranslationLanguages = () => {
    return process.env.TRANSLATION_LANGUAGES;
}

/**
 * Get organisation service timeout
 */
export const getOrganisationServiceTimeout = () => {
    return process.env.SERVICE_TIMEOUT;
}

/**
 * Get all organisation info as an object
 */
export const getOrganisationInfo = () => {
    return {
        name: getOrganisationName(),
        defaultServiceId: getOrganisationDefaultServiceId(),
        greeting: getOrganisationGreeting(),
        message: getOrganisationMessage(),
        additionalWelcome: getOrganisationAdditionalWelcome(),
        waiting: getOrganisationWaitingMessage(),
        language: getOrganisationLanguage(),
        translationLanguages: getOrganisationTranslationLanguages(),
        base64Logo: getOrganisationLogoBase64()
    }
}

// ============================================================
// DEPRECATED: Backwards compatibility exports
// These will be removed in a future version
// Please update your code to use getOrganisation* functions
// ============================================================

/** @deprecated Use getOrganisationSecretKey instead */
export const getChurchSecretKey = getOrganisationSecretKey;

/** @deprecated Use getOrganisationName instead */
export const getChurchName = getOrganisationName;

/** @deprecated Use getOrganisationLogoBase64 instead */
export const getChurchLogoBase64 = getOrganisationLogoBase64;

/** @deprecated Use getOrganisationGreeting instead */
export const getChurchGreeting = getOrganisationGreeting;

/** @deprecated Use getOrganisationMessage instead */
export const getChurchMessage = getOrganisationMessage;

/** @deprecated Use getOrganisationWaitingMessage instead */
export const getChurchWaitingMessage = getOrganisationWaitingMessage;

/** @deprecated Use getOrganisationAdditionalWelcome instead */
export const getChurchAdditionalWelcome = getOrganisationAdditionalWelcome;

/** @deprecated Use getOrganisationLanguage instead */
export const getChurchLanguage = getOrganisationLanguage;

/** @deprecated Use getOrganisationDefaultServiceId instead */
export const getChurchDefaultServiceId = getOrganisationDefaultServiceId;

/** @deprecated Use getOrganisationTranslationLanguages instead */
export const getChurchTranslationLanguages = getOrganisationTranslationLanguages;

/** @deprecated Use getOrganisationServiceTimeout instead */
export const getChurchServiceTimeout = getOrganisationServiceTimeout;

/** @deprecated Use getOrganisationInfo instead */
export const getChurchInfo = getOrganisationInfo;
