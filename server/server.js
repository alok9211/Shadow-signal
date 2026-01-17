require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const gameSocket = require('./socket/gameSocket'); // make sure this file exists

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"] // Allow both transports
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shadow-signal')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.warn('Server will continue but game functionality may be limited without MongoDB');
  });

// Test route for HTTP GET /
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB!');
});

// Socket.io connection
gameSocket(io);

// Helper function to find an available port
const net = require('net');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

// Start server
const DEFAULT_PORT = parseInt(process.env.PORT || 4001);

async function startServer() {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    
    server.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`✅ Socket.IO server ready at http://localhost:${port}`);
      if (port !== DEFAULT_PORT) {
        console.warn(`\n⚠️  WARNING: Port ${DEFAULT_PORT} was in use, using port ${port} instead.`);
        console.warn(`⚠️  Update your client .env file: NEXT_PUBLIC_SOCKET_URL=http://localhost:${port}\n`);
      }
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} is now in use. This shouldn't happen after port check.`);
        console.error('💡 Try killing the process using this port:');
        console.error(`   Windows: netstat -ano | findstr :${port}`);
        console.error(`   Then: taskkill /PID <PID> /F\n`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error(`\n💡 To free up port ${DEFAULT_PORT}, run:`);
    console.error(`   Windows: netstat -ano | findstr :${DEFAULT_PORT}`);
    console.error(`   Then: taskkill /PID <PID> /F\n`);
    process.exit(1);
  }
}

startServer();

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


