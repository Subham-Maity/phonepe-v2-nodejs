const axios = require("axios");
const uniqid = require("uniqid");
const { getToken } = require("./auth");
// const { getToken } = require("./debug-auth"); //for debugging purposes - uncomment this line if you want to use the debug version
const BACKEND_URL = process.env.REDIRECT_BASE_URL;
const FRONTEND_URL = "http://localhost:3000"; // Next.js frontend URL

const payment = async (req, res) => {
    const { firstName, lastName, email, mobileNumber, amount, productName } = req.body;
    const merchantOrderId = uniqid();
    const fullName = `${firstName} ${lastName}`;

    if (!firstName || !lastName || !email || !mobileNumber || !amount) {
        return res.status(400).json({
            error: "Missing required parameters: firstName, lastName, email, mobileNumber, or amount."
        });
    }

    const requestData = {
        merchantOrderId,
        amount: amount * 100,
        expireAfter: 320,
        metaInfo: {
            merchantUserId: "MUID2345",
            fullName,
            mobileNumber,
            email,
        },
        paymentFlow: {
            type: "PG_CHECKOUT",
            message: "Test Payment",
            merchantUrls: {
                redirectUrl: `http://localhost:5000/api/redirect/${merchantOrderId}`,
            },
        },
    };

    const URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay";
    const token = getToken();

    if (!token) {
        return res.status(500).json({
            error: "OAuth token not available. Please try again later."
        });
    }

    const options = {
        method: "POST",
        url: URL,
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `O-Bearer ${token}`,
        },
        data: requestData,
    };

    try {
        const response = await axios.request(options);
        return res.status(200).json({
            success: true,
            redirectUrl: response.data.redirectUrl,
            merchantOrderId: merchantOrderId
        });
    } catch (error) {
        console.error("Payment Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing your payment.",
            error: error.response?.data || error.message
        });
    }
};

const status = async (req, res) => {
    const { merchantOrderId } = req.params;
    if (!merchantOrderId) {
        return res.status(400).json({ error: "Missing merchantOrderId parameter." });
    }

    const URL = `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantOrderId}/status`;
    const token = getToken();

    if (!token) {
        return res.status(500).json({
            error: "OAuth token not available. Please try again later."
        });
    }

    const options = {
        method: "GET",
        url: URL,
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `O-Bearer ${token}`,
        },
    };

    try {
        const response = await axios.request(options);
        if (response.data && response.data.state) {
            const { state, amount } = response.data;
            if (state === "COMPLETED") {
                const url = `${FRONTEND_URL}/success?merchantOrderId=${merchantOrderId}&amount=${amount / 100}`;
                return res.redirect(url);
            } else if (state === "FAILED") {
                const url = `${FRONTEND_URL}/failure?merchantOrderId=${merchantOrderId}`;
                return res.redirect(url);
            } else if (state === "PENDING") {
                return res.status(200).json({
                    status: "pending",
                    message: "Payment is still pending. Please try again later.",
                });
            }
        } else {
            return res.status(500).json({
                message: "Unexpected response from payment gateway.",
            });
        }
    } catch (error) {
        console.error("Status Error:", error.message);
        res.status(500).json({ error: "Failed to fetch payment status." });
    }
};

const callback = async (req, res) => {
    console.log("Callback URL hit");
    console.log("Received data:", req.body);

    const data = req.body;

    try {
        if (!data.event || !data.payload) {
            console.log("Invalid data format");
            return res.status(400).json({
                message: "Invalid data format. 'event' and 'payload' are required.",
            });
        }

        // Since we're not using DB, just log the callback data
        console.log("Callback data received:", data);
        res.status(200).json({ message: "Callback data received successfully" });
    } catch (error) {
        console.error("Error processing callback data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    payment,
    status,
    callback
};