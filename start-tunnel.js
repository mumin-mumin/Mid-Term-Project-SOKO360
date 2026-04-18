const localtunnel = require('localtunnel');

(async() => {
    try {
        const tunnel = await localtunnel({ port: 3000 });
        console.log('TUNNEL_URL=' + tunnel.url);

        // Keep tunnel open
        tunnel.on('close', () => {
            console.log('Tunnel closed');
            process.exit(0);
        });

    } catch (err) {
        console.error('ERROR:', err && (err.message || err));
        process.exit(1);
    }
})();