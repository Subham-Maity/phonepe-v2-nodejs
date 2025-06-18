const axios = require("axios");

// Configuration
const OAUTH_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CLIENT_VERSION = process.env.CLIENT_VERSION;
const GRANT_TYPE = process.env.GRANT_TYPE;

let accessToken = null;
let tokenExpiry = null;

// Function to fetch the OAuth token
async function fetchOAuthToken() {
    console.log('🔄 Attempting to fetch OAuth token...');

    // Validate environment variables
    if (!CLIENT_ID || !CLIENT_SECRET || !CLIENT_VERSION || !GRANT_TYPE) {
        console.error('❌ Missing required environment variables');
        return;
    }

    try {
        // Create form data manually
        const formData = `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&client_version=${encodeURIComponent(CLIENT_VERSION)}&grant_type=${encodeURIComponent(GRANT_TYPE)}`;

        console.log('📤 Request Details:');
        console.log('URL:', OAUTH_URL);
        console.log('Headers: Content-Type: application/x-www-form-urlencoded');
        console.log('Data length:', formData.length);

        const response = await axios.post(OAUTH_URL, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log('📥 Response received:', response.status, response.statusText);
        const data = response.data;

        if (data && data.access_token && data.expires_at) {
            accessToken = data.access_token;
            tokenExpiry = data.expires_at * 1000;
            console.log("✅ Token fetched successfully");
            console.log("🕐 Token expires at:", new Date(tokenExpiry));
        } else {
            console.error("❌ Invalid response format:", data);
        }
    } catch (error) {
        console.error("❌ OAuth Error Details:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Status Text:", error.response.statusText);
            console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
            console.error("Response Headers:", error.response.headers);
        } else if (error.request) {
            console.error("No response received:", error.request);
        } else {
            console.error("Request setup error:", error.message);
        }
    }
}

// Refresh the token 5 minutes before it expires
setInterval(async () => {
    if (!tokenExpiry || tokenExpiry - Date.now() <= 5 * 60 * 1000) {
        console.log('🔄 Token refresh triggered');
        await fetchOAuthToken();
    }
}, 5 * 60 * 1000);

// Fetch token on server start
fetchOAuthToken();

const tokenHandler = (req, res) => {
    if (accessToken && tokenExpiry > Date.now()) {
        res.json({
            access_token: accessToken,
            expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
        });
    } else {
        res.status(500).json({ error: "Token is not available or expired." });
    }
};

const getToken = () => {
    if (accessToken && tokenExpiry > Date.now()) {
        return accessToken;
    }
    console.log('⚠️ Token is not available or expired');
    return null;
};

module.exports = {
    tokenHandler,
    getToken,
};