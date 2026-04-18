const https = require('https');

const postData = JSON.stringify({
    Body: {
        stkCallback: {
            CheckoutRequestID: 'test-checkout',
            ResultCode: 0,
            CallbackMetadata: {
                Item: []
            }
        }
    }
});

const options = {
    hostname: 'smooth-paths-scream.loca.lt',
    port: 443,
    path: '/api/mpesa/callback',
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS:`, res.headers);

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('RESPONSE:', data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
});

req.write(postData);
req.end();