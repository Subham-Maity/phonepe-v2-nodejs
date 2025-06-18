const axios = require("axios");

// Configuration
const OAUTH_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const CLIENT_VERSION = process.env.CLIENT_VERSION
const GRANT_TYPE = process.env.GRANT_TYPE

let accessToken = null;
let tokenExpiry = null; // Timestamp for token expiry

// Function to fetch the OAuth token
async function fetchOAuthToken() {
    try {
        const response = await axios.post(
            OAUTH_URL,
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                client_version: CLIENT_VERSION,
                grant_type: GRANT_TYPE,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const data = response.data;

        if (data && data.access_token && data.expires_at) {
            accessToken = data.access_token;
            tokenExpiry = data.expires_at * 1000; // Convert expires_at (seconds) to milliseconds
            // console.log("New token fetched successfully:", accessToken);
        } else {
            console.error("Failed to fetch access token: Missing expiration details.", data);
        }
    } catch (error) {
        console.error("Error while fetching access token:", error.message);
    }
}

// Refresh the token 5 minutes before it expires
setInterval(async () => {
    if (!tokenExpiry || tokenExpiry - Date.now() <= 5 * 60 * 1000) {
        await fetchOAuthToken();
    }
}, 5 * 60 * 1000); // Check every 5 minutes

// Fetch token on server start
fetchOAuthToken();

// API endpoint to get the current token
const tokenHandler = (req, res) => {
    if (accessToken && tokenExpiry > Date.now()) {
        res.json({ access_token: accessToken, expires_in: Math.floor((tokenExpiry - Date.now()) / 1000) });
    } else {
        res.status(500).json({ error: "Token is not available or expired." });
    }
};

// Getter function for the token
const getToken = () => accessToken;

module.exports = {
    tokenHandler,
    getToken,
};
