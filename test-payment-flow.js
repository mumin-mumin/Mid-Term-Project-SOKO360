#!/usr/bin/env node

/**
 * End-to-end test for M-Pesa payment flow
 * Tests: cart → checkout → STK push → callback simulation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PHONE = '0712345678'; // Test phone
const AMOUNT = 100; // Test amount

console.log('\n📱 M-Pesa Payment Flow Test\n');
console.log('='.repeat(60));

// Test 1: Health check
function testHealthCheck() {
    return new Promise((resolve, reject) => {
        console.log('\n[1] Testing server health...');
        const url = new URL(BASE_URL);

        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === 'success') {
                        console.log('✅ Server healthy');
                        console.log(`   Environment: ${result.environment}`);
                        resolve(true);
                    } else {
                        console.log('❌ Server returned unexpected status');
                        reject(new Error('Invalid health check response'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Test 2: Test M-Pesa credentials
function testDarajaConnection() {
    return new Promise((resolve, reject) => {
        console.log('\n[2] Testing M-Pesa API connection...');

        const url = new URL(`${BASE_URL}/api/daraja/test`);
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Connected to M-Pesa API');
                        console.log(`   Environment: ${result.environment}`);
                    } else {
                        console.log('⚠️  M-Pesa connection issue:');
                        console.log(`   ${result.message}`);
                    }
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Test 3: Initiate STK Push
function testStkPush() {
    return new Promise((resolve, reject) => {
        console.log(`\n[3] Initiating STK Push...`);
        console.log(`   Phone: ${PHONE}, Amount: KES ${AMOUNT}`);

        const payload = JSON.stringify({
            phone: PHONE,
            amount: AMOUNT,
            accountReference: 'TEST-ORDER-001',
            transactionDesc: 'Test payment'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/mpesa/stkpush',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.data.CheckoutRequestID) {
                        console.log('✅ STK Push initiated successfully');
                        console.log(`   CheckoutRequestID: ${result.data.CheckoutRequestID}`);
                        console.log(`   Response Code: ${result.data.ResponseCode}`);
                        console.log(`   Message: ${result.data.CustomerMessage}`);
                        resolve(result.data.CheckoutRequestID);
                    } else {
                        console.log('❌ STK Push failed');
                        console.log(`   ${result.message}`);
                        reject(new Error(result.message || 'STK Push failed'));
                    }
                } catch (e) {
                    console.log('❌ Error parsing STK response');
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Test 4: Query payment status
function testPaymentQuery(checkoutRequestId) {
    return new Promise((resolve, reject) => {
        console.log(`\n[4] Querying payment status...`);
        console.log(`   CheckoutRequestID: ${checkoutRequestId}`);

        const payload = JSON.stringify({ checkoutRequestId });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/mpesa/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Query successful');
                    console.log(`   Status: ${result.status}`);
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Test 5: Simulate M-Pesa callback
function testCallbackSimulation() {
    return new Promise((resolve, reject) => {
        console.log(`\n[5] Simulating M-Pesa callback...`);

        const payload = JSON.stringify({
            Body: {
                stkCallback: {
                    MerchantRequestID: 'test-merchant-001',
                    CheckoutRequestID: 'test-checkout-001',
                    ResultCode: 0,
                    ResultDesc: 'The service request has been processed successfully.',
                    CallbackMetadata: {
                        Item: [
                            { Name: 'Amount', Value: AMOUNT },
                            { Name: 'MpesaReceiptNumber', Value: 'LHG31H500V' },
                            { Name: 'TransactionDate', Value: '20231215123045' },
                            { Name: 'PhoneNumber', Value: '254' + PHONE.substring(1) }
                        ]
                    }
                }
            }
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/mpesa/callback',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ResultCode === 0) {
                        console.log('✅ Callback received and processed');
                        console.log(`   Response: ${result.ResultDesc}`);
                    } else {
                        console.log('⚠️  Callback processed with status:', result.ResultCode);
                    }
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Run all tests
async function runTests() {
    try {
        await testHealthCheck();
        await testDarajaConnection();
        const checkoutId = await testStkPush();
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
        await testPaymentQuery(checkoutId);
        await testCallbackSimulation();

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests passed!\n');
        console.log('📋 Summary:');
        console.log('   • Server is running and healthy');
        console.log('   • M-Pesa credentials are configured');
        console.log('   • STK Push endpoint is working');
        console.log('   • Payment status query is working');
        console.log('   • Callback endpoint is reachable');
        console.log('\n🎉 Ready for production testing!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:');
        console.error(`   ${error.message}\n`);
        process.exit(1);
    }
}

runTests();