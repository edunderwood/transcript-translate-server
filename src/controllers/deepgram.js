import { authService } from "../services/deepgram.js"

// Example Payload Body
//{
//    "serviceId": "5555",
//    "organisationKey": "NEFC-A1B2"
//}
export const authController = async (req, res) => {
    console.log(`Request Body: ${JSON.stringify(req.body, null, 2)}`);
    const serviceResponse = await authService(req.body);

    res.status((await serviceResponse).statusCode).json({...serviceResponse});
}