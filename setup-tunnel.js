const { spawn } = require('child_process');
const fs = require('fs');

// Start server first
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    detached: false
});

server.stdout.on('data', data => console.log(`[SERVER] ${data}`));
server.stderr.on('data', data => console.error(`[SERVER] ${data}`));

// Wait 2 seconds for server to start
setTimeout(() => {
    console.log('[SETUP] Starting localtunnel...');

    const lt = spawn('npx', ['localtunnel', '--port', '3000'], {
        cwd: __dirname,
        detached: false
    });

    let output = '';

    lt.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[LT] ${chunk}`);

        // Look for the URL line
        if (chunk.includes('https://')) {
            const match = chunk.match(/https:\/\/[^\s]+/);
            if (match) {
                const url = match[0];
                console.log(`\n✅ TUNNEL URL: ${url}\n`);
                fs.writeFileSync('TUNNEL_URL.txt', url, 'utf8');
            }
        }
    });

    lt.stderr.on('data', data => console.error(`[LT] ${data}`));
}, 2000);