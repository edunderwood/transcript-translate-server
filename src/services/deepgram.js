import { createClient} from "@deepgram/sdk";
import { getChurchSecretKey } from "../repositories/church.js";
import { getDeepgramApiKey, getDeepgramProjectId } from "../repositories/deepgram.js";
import { getChurchByKey } from "../../db/churches.js";

const deepgram = createClient(getDeepgramApiKey());

export const authService = async ({ serviceId, churchKey }) => {
    try {
        console.log(`🔐 Deepgram auth - Service ID: ${serviceId}, Church Key: ${churchKey}`);

        // Multi-tenant: Validate church key against database
        if (!churchKey) {
            console.error('❌ Church key is required for Deepgram authentication');
            return {
                success: false,
                statusCode: 400,
                message: `Church key is required`,
                responseObject: {
                    error: 'Church key is required'
                }
            }
        }

        // Look up church in database
        const church = await getChurchByKey(churchKey);

        if (!church) {
            console.error(`❌ Invalid church key: ${churchKey}`);
            return {
                success: false,
                statusCode: 400,
                message: `Invalid church key`,
                responseObject: {
                    error: 'Invalid church key'
                }
            }
        }

        console.log(`✅ Church validated: ${church.name} (${church.church_key})`);

        // Fallback: Also check environment variable for backward compatibility
        // This allows single-tenant setups to still work
        if (process.env.CHURCH_KEY && churchKey !== process.env.CHURCH_KEY) {
            console.warn(`⚠️  Church key ${churchKey} doesn't match CHURCH_KEY env var`);
        }

        // Get a Token used for making the Websocket calls in the front end
        console.log(`🔑 Requesting temporary Deepgram key for service ${serviceId}`);
        const keyResult = await deepgram.manage.createProjectKey(getDeepgramProjectId(),
            {
                comment: `Service ${serviceId} - ${church.name}`,
                scopes: ["usage:write"],
                time_to_live_in_seconds: 10
            })

        console.log(`✅ Deepgram token created successfully for ${church.name}`);
        return {
            success: true,
            statusCode: 200,
            message: 'Successfully obtained deepgram token',
            responseObject: {
                deepgramToken: keyResult.result.key,
                churchName: church.name,
                churchKey: church.church_key
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