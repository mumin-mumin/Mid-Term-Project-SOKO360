// daraja.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const base64 = require('base-64');
const fs = require('fs');
const path = require('path');

// ====== VALIDATE REQUIRED ENV VARIABLES ======
const requiredEnv = [
    'CONSUMER_KEY',
    'CONSUMER_SECRET',
    'SHORTCODE',
    'PASSKEY',
    'CALLBACK_BASE_URL'
];

const missing = requiredEnv.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error(`❌ Missing .env variables: ${missing.join(', ')}`);
    process.exit(1);
}

const app = express();
app.use(express.json());

// ====== AUTO-LOAD TUNNEL URL ======
const tunnelFile = path.join(__dirname, 'TUNNEL_URL.txt');
if (fs.existsSync(tunnelFile)) {
    const url = fs.readFileSync(tunnelFile, 'utf8').trim();
    if (url) {
        console.log(`🔗 Using tunnel URL: ${url}`);
        process.env.CALLBACK_BASE_URL = url;
    }
}

// ====== ENV VARS ======
const {
    ENVIRONMENT,
    CONSUMER_KEY,
    CONSUMER_SECRET,
    SHORTCODE,
    PASSKEY,
    CALLBACK_BASE_URL,
    PORT = 3000,
    B2B_INITIATOR,
    B2B_INITIATOR_PASSWORD,
    B2B_RECEIVER_SHORTCODE,
    USSD_PARTNER_URL
} = process.env;

const BASE_URL =
    ENVIRONMENT === 'production' ?
    'https://api.safaricom.co.ke' :
    'https://sandbox.safaricom.co.ke';

// ====== ACCESS TOKEN WITH CACHING ======
let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
    const now = Date.now();
    if (tokenCache.token && tokenCache.expiresAt > now + 5000) {
        return tokenCache.token;
    }

    const auth = base64.encode(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

    const res = await axios.get(
        `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } }
    );

    tokenCache.token = res.data.access_token;
    tokenCache.expiresAt = now + res.data.expires_in * 1000;

    return tokenCache.token;
}

// ====== WRAPPED AXIOS ======
async function darajaRequest(method, path, data) {
    const token = await getAccessToken();
    return axios({
        method,
        url: `${BASE_URL}${path}`,
        data,
        headers: { Authorization: `Bearer ${token}` }
    });
}

// ====== FORMAT PHONE ======
function formatPhone(phone) {
    phone = phone.replace(/[\s\-\+\(\)]/g, '');
    if (phone.startsWith('+254')) phone = phone.substring(1);
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (/^[71]\d{8}$/.test(phone)) phone = '254' + phone;
    if (!phone.startsWith('254')) phone = '254' + phone;
    return phone;
}

const transactions = new Map();

// ============================================================
// ⭐ B2B
// ============================================================
app.post('/api/b2b', async(req, res) => {
    try {
        const payload = {
            Initiator: B2B_INITIATOR,
            SecurityCredential: B2B_INITIATOR_PASSWORD,
            CommandID: "BusinessPayment",
            Amount: req.body.amount,
            PartyA: SHORTCODE,
            PartyB: B2B_RECEIVER_SHORTCODE,
            Remarks: "B2B Payment",
            AccountReference: "B2B",
            QueueTimeOutURL: `${CALLBACK_BASE_URL}/api/b2b/timeout`,
            ResultURL: `${CALLBACK_BASE_URL}/api/b2b/result`
        };

        const resp = await darajaRequest('post', '/mpesa/b2b/v1/paymentrequest', payload);
        res.json(resp.data);

    } catch (err) {
        res.status(500).json({ error: err.response ? .data || err.message });
    }
});

// ============================================================
// ⭐ C2B
// ============================================================
app.post('/api/c2b/register', async(req, res) => {
    try {
        const payload = {
            ShortCode: SHORTCODE,
            ResponseType: "Completed",
            ConfirmationURL: `${CALLBACK_BASE_URL}/api/c2b/confirmation`,
            ValidationURL: `${CALLBACK_BASE_URL}/api/c2b/validation`
        };

        const resp = await darajaRequest('post', '/mpesa/c2b/v1/registerurl', payload);
        res.json(resp.data);

    } catch (err) {
        res.status(500).json({ error: err.response ? .data || err.message });
    }
});

app.post('/api/c2b/validation', (req, res) => {
    console.log("C2B Validation:", req.body);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post('/api/c2b/confirmation', (req, res) => {
    console.log("C2B Confirmation:", req.body);
    res.send("OK");
});

// ============================================================
// ⭐ STK PUSH
// ============================================================
app.post('/api/mpesa/stkpush', async(req, res) => {
    try {
        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone & amount required"
            });
        }

        const formatted = formatPhone(phone);

        if (!/^254[71]\d{8}$/.test(formatted)) {
            return res.status(400).json({
                success: false,
                message: `Invalid Safaricom number: ${formatted}`
            });
        }

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.ceil(amount),
            PartyA: formatted,
            PartyB: SHORTCODE,
            PhoneNumber: formatted,
            CallBackURL: `${CALLBACK_BASE_URL}/api/mpesa/callback`,
            AccountReference: "PrimePicks",
            TransactionDesc: "Payment"
        };

        const resp = await darajaRequest("post", "/mpesa/stkpush/v1/processrequest", payload);

        transactions.set(resp.data.CheckoutRequestID, {
            phone: formatted,
            amount,
            status: "pending",
            timestamp: new Date()
        });

        res.json({ success: true, data: resp.data });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.response ? .data || err.message
        });
    }
});

// ============================================================
// ⭐ CALLBACK
// ============================================================
app.post('/api/mpesa/callback', (req, res) => {
    console.log("📥 CALLBACK RECEIVED");
    console.log(JSON.stringify(req.body, null, 2));

    try {
        const cb = req.body.Body.stkCallback;
        const id = cb.CheckoutRequestID;

        if (transactions.has(id)) {
            const tx = transactions.get(id);

            if (cb.ResultCode === 0) {
                const items = cb.CallbackMetadata ? .Item || [];

                tx.status = "success";
                tx.amount = items.find(i => i.Name === "Amount") ? .Value;
                tx.receipt = items.find(i => i.Name === "MpesaReceiptNumber") ? .Value;
                tx.phone = items.find(i => i.Name === "PhoneNumber") ? .Value;
                tx.date = items.find(i => i.Name === "TransactionDate") ? .Value;

                console.log("✅ SUCCESS:", tx);

            } else {
                tx.status = "failed";
                tx.resultDesc = cb.ResultDesc;
                console.log("❌ FAILED:", cb.ResultDesc);
            }

            transactions.set(id, tx);
        }

        res.json({ ResultCode: 0, ResultDesc: "Success" });

    } catch (err) {
        console.error("Callback Error:", err.message);
        res.json({ ResultCode: 0 });
    }
});

// ============================================================
// ⭐ QUERY
// ============================================================
app.post('/api/mpesa/query', async(req, res) => {
    try {
        const { checkoutRequestId } = req.body;

        if (!checkoutRequestId)
            return res.status(400).json({ success: false, message: "Missing checkoutRequestId" });

        if (transactions.has(checkoutRequestId)) {
            return res.json({
                success: true,
                local: true,
                data: transactions.get(checkoutRequestId)
            });
        }

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        const resp = await darajaRequest('post', '/mpesa/stkpushquery/v1/query', payload);

        res.json({ success: true, data: resp.data });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.response ? .data || err.message
        });
    }
});

// ============================================================
// ⭐ HEALTH CHECK
// ============================================================
app.get('/api/daraja/test', async(req, res) => {
    try {
        await getAccessToken();
        res.json({
            success: true,
            message: "Connected to M-Pesa",
            callback: `${CALLBACK_BASE_URL}/api/mpesa/callback`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: "OK", environment: ENVIRONMENT });
});

// ============================================================
// ⭐ START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔔 Callback Base URL: ${CALLBACK_BASE_URL}`);
});