import os from 'os';
import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { initSocket } from './utils/socket';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const getLocalIPs = () => {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
};

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Start Server
        server.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            const ips = getLocalIPs();
            if (ips.length > 0) {
                console.log(`📡 Local Network Access:`);
                ips.forEach(ip => console.log(`   👉 http://${ip}:${PORT}/api`));
            }
            if (process.send) {
                process.send('ready');
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
