#!/usr/bin/env node

/**
 * Health Check Script for Portal PDU
 * This script performs basic health checks on the application
 */

const http = require('http');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkHttpEndpoint() {
    return new Promise((resolve) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: '/',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve({ status: 'healthy', message: 'HTTP endpoint responding' });
            } else {
                resolve({ status: 'warning', message: `HTTP endpoint returned ${res.statusCode}` });
            }
        });

        req.on('error', (err) => {
            resolve({ status: 'unhealthy', message: `HTTP request failed: ${err.message}` });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'unhealthy', message: 'HTTP request timed out' });
        });

        req.end();
    });
}

async function checkPM2Status() {
    return new Promise((resolve) => {
        exec('pm2 jlist', (error, stdout, stderr) => {
            if (error) {
                resolve({ status: 'unhealthy', message: 'PM2 not running or not accessible' });
                return;
            }

            try {
                const processes = JSON.parse(stdout);
                const portalPdu = processes.find(p => p.name === 'portal-pdu');

                if (!portalPdu) {
                    resolve({ status: 'unhealthy', message: 'Portal PDU process not found in PM2' });
                    return;
                }

                if (portalPdu.pm2_env.status === 'online') {
                    resolve({
                        status: 'healthy',
                        message: `PM2 process online (PID: ${portalPdu.pid}, Memory: ${Math.round(portalPdu.monit.memory / 1024 / 1024)}MB)`
                    });
                } else {
                    resolve({ status: 'unhealthy', message: `PM2 process status: ${portalPdu.pm2_env.status}` });
                }
            } catch (parseError) {
                resolve({ status: 'warning', message: 'Could not parse PM2 status' });
            }
        });
    });
}

async function checkDatabase() {
    // This is a basic check - you might want to implement a more thorough DB health check
    return new Promise((resolve) => {
        // For now, just check if the app can start (which requires DB connection)
        resolve({ status: 'unknown', message: 'Database check not implemented - relies on app startup' });
    });
}

async function runHealthCheck() {
    log('🔍 Running Portal PDU Health Check', 'blue');
    log('=====================================', 'blue');

    const results = await Promise.all([
        checkHttpEndpoint(),
        checkPM2Status(),
        checkDatabase()
    ]);

    const checks = ['HTTP Endpoint', 'PM2 Process', 'Database'];
    let overallStatus = 'healthy';

    results.forEach((result, index) => {
        const checkName = checks[index];
        const status = result.status;
        const message = result.message;

        let color = 'green';
        if (status === 'unhealthy') {
            color = 'red';
            overallStatus = 'unhealthy';
        } else if (status === 'warning') {
            color = 'yellow';
            if (overallStatus === 'healthy') overallStatus = 'warning';
        }

        log(`${checkName}: ${message}`, color);
    });

    log('=====================================', 'blue');

    if (overallStatus === 'healthy') {
        log('✅ Overall Status: HEALTHY', 'green');
        process.exit(0);
    } else if (overallStatus === 'warning') {
        log('⚠️  Overall Status: WARNING', 'yellow');
        process.exit(1);
    } else {
        log('❌ Overall Status: UNHEALTHY', 'red');
        process.exit(1);
    }
}

// Run the health check
runHealthCheck().catch((error) => {
    log(`Health check failed: ${error.message}`, 'red');
    process.exit(1);
});
