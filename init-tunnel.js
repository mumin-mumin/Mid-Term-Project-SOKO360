const localtunnel = require('localtunnel');
const fs = require('fs');

(async() => {
    try {
        console.log('[TUNNEL] Connecting to localtunnel service...');
        const tunnel = await localtunnel({ port: 3000 });

        console.log(`✅ TUNNEL URL: ${tunnel.url}`);
        fs.writeFileSync('TUNNEL_URL.txt', tunnel.url, 'utf8');

        tunnel.on('close', () => {
            console.log('[TUNNEL] Closed');
            process.exit(0);
        });

    } catch (err) {
        console.error('[ERROR]', err && (err.message || err));
        process.exit(1);
    }
})();