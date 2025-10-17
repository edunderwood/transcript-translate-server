import { createClient} from "@deepgram/sdk";
import { getDeepgramApiKey, getDeepgramProjectId } from "../repositories/deepgram.js";
import { getOrganisationByKey } from "../../db/organisations.js";

const deepgram = createClient(getDeepgramApiKey());

export const authService = async ({ serviceId, organisationKey }) => {
    try {
        console.log(`🔐 Deepgram auth - Service ID: ${serviceId}, Organisation Key: ${organisationKey}`);

        // Multi-tenant: Validate organisation key against database
        if (!organisationKey) {
            console.error('❌ Organisation key is required for Deepgram authentication');
            return {
                success: false,
                statusCode: 400,
                message: `Organisation key is required`,
                responseObject: {
                    error: 'Organisation key is required'
                }
            }
        }

        // Look up church in database
        const organisation = await getOrganisationByKey(organisationKey);

        if (!organisation) {
            console.error(`❌ Invalid organisation key: ${organisationKey}`);
            return {
                success: false,
                statusCode: 400,
                message: `Invalid organisation key`,
                responseObject: {
                    error: 'Invalid organisation key'
                }
            }
        }

        console.log(`✅ Organisation validated: ${organisation.name} (${organisation.organisation_key})`);

        // Fallback: Also check environment variable for backward compatibility
        // This allows single-tenant setups to still work
        if (process.env.ORGANISATION_KEY && organisationKey !== process.env.ORGANISATION_KEY) {
            console.warn(`⚠️  Organisation key ${organisationKey} doesn't match ORGANISATION_KEY env var`);
        }

        // Get a Token used for making the Websocket calls in the front end
        console.log(`🔑 Requesting temporary Deepgram key for service ${serviceId}`);
        const keyResult = await deepgram.manage.createProjectKey(getDeepgramProjectId(),
            {
                comment: `Service ${serviceId} - ${organisation.name}`,
                scopes: ["usage:write"],
                time_to_live_in_seconds: 10
            })

        console.log(`✅ Deepgram token created successfully for ${organisation.name}`);
        return {
            success: true,
            statusCode: 200,
            message: 'Successfully obtained deepgram token',
            responseObject: {
                deepgramToken: keyResult.result.key,
                organisationName: organisation.name,
                organisationKey: organisation.organisation_key
            }
        }
    } catch (error) {
        console.error(`❌ Deepgram auth error: ${error.message}`);
        console.error('Full error:', error);
        return {
            success: false,
            statusCode: 500,
            message: `Failed to authenticate with Deepgram`,
            responseObject: {
                error: error.message
            }
        }
    }
}