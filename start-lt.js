const localtunnel = require('localtunnel');

(async() => {
    try {
        const tunnel = await localtunnel({ port: 3000 });
        console.log('LT_URL=' + tunnel.url);
        tunnel.on('close', () => console.log('tunnel closed'));
        // keep process running
    } catch (err) {
        console.error('LT_ERROR', err && (err.message || err));
        process.exit(1);
    }
})();