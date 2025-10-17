import QRCode from 'qrcode';
import { getDebabelClientUrl } from '../repositories/index.js';

// Get the URL of the app
const clientUrl = getDebabelClientUrl(); 

export const generateQR = async ({serviceId, organisationKey, format = 'svg'}) => {
    console.log(`🔍 QR Generation - Received params:`, { serviceId, organisationKey, format, clientUrl });

    // Build URL with both organisation and serviceId parameters
    const url = organisationKey
        ? `${clientUrl}?organisation=${encodeURIComponent(organisationKey)}&serviceId=${serviceId}`
        : `${clientUrl}?serviceId=${serviceId}`;

    console.log(`✅ Generating QR code for URL: ${url}`);
    try {
        let qrcode;
        
        if (format === 'png') {
            // Generate PNG as base64 data URL
            qrcode = await QRCode.toDataURL(url, {
                width: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } else {
            // Default to SVG
            qrcode = await QRCode.toString(url, { type: "svg" });
        }
        
        return {
            success: true,
            statusCode: 200,
            message: `QR Code generated successfully`,
            responseObject: {
                qrCode: qrcode,
                format: format
            }
        }
    } catch (err) {
        console.log(`ERROR generating QR code for: ${url}`);
        return {
            success: false,
            statusCode: 400,
            message: `Unable to generate QR Code`,
            responseObject: {
                qrCode: null
            }
        };
    }
}