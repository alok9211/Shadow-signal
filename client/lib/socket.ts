// client/lib/socket.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001";

// Track if we've already shown the error to avoid spam
let hasShownConnectionError = false;
let connectionErrorShownAt: number | null = null;
const ERROR_SUPPRESSION_TIME = 60000; // Suppress errors for 60 seconds after showing one
let isServerKnownUnavailable = false; // Track if server is known to be unavailable

// SINGLE global socket instance - lazy initialization
let socketInstance: Socket | null = null;

// Initialize socket only when needed (lazy connection)
function getSocket(): Socket {
  if (!socketInstance) {
    // Only create socket in browser environment
    if (typeof window !== 'undefined') {
      socketInstance = io(SOCKET_URL, {
        transports: ["polling", "websocket"], // Try polling first to reduce WebSocket errors
        upgrade: true, // Allow upgrade to websocket once connected
        autoConnect: false, // Don't auto-connect - connect only when explicitly needed
        reconnection: true,
        reconnectionAttempts: 5, // Limit reconnection attempts to reduce spam
        reconnectionDelay: 3000, // Wait 3 seconds between attempts
        reconnectionDelayMax: 10000, // Max 10 seconds between attempts
        timeout: 10000, // 10 second connection timeout (faster failure)
        forceNew: false,
      });
      
      setupSocketListeners(socketInstance);
    } else {
      // Server-side: create a dummy socket that won't connect
      socketInstance = io(SOCKET_URL, {
        autoConnect: false,
        reconnection: false,
      }) as Socket;
    }
  }
  return socketInstance;
}

function setupSocketListeners(socket: Socket) {
  // Add connection event listeners for debugging
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    hasShownConnectionError = false; // Reset on successful connection
    connectionErrorShownAt = null;
    isServerKnownUnavailable = false; // Reset availability status
    
    // Re-enable reconnection in case it was disabled
    if (socket.io && socket.io.opts) {
      socket.io.opts.reconnection = true;
    }
  });

  socket.on('disconnect', (reason) => {
    // Only log disconnects if we were previously connected
    if (socket.connected) {
      console.log('Socket disconnected:', reason);
    }
  });

  socket.on('connect_error', (error) => {
    const now = Date.now();
    // More aggressive error suppression
    const shouldShowError = 
      !hasShownConnectionError || 
      (connectionErrorShownAt && now - connectionErrorShownAt > ERROR_SUPPRESSION_TIME);

    if (shouldShowError) {
      isServerKnownUnavailable = true;
      
      // Disable automatic reconnection to prevent spam of connection errors
      if (socket.io && socket.io.opts) {
        socket.io.opts.reconnection = false;
        socket.io.reconnecting = false;
        // Disconnect to stop any ongoing connection attempts
        if (!socket.connected) {
          socket.disconnect();
        }
      }
      
      // In development, show a single helpful warning
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Socket server not available at ${SOCKET_URL}. ` +
          `Game features requiring real-time updates will not work. ` +
          `To start the server: cd server && npm run dev\n` +
          `(Errors will be suppressed for ${ERROR_SUPPRESSION_TIME / 1000} seconds)`
        );
      } else {
        // In production, show full error details
        console.error('Socket connection error:', error.message);
        if (error.message === 'timeout' || error.message.includes('timeout')) {
          console.error('⚠️ Connection timeout - Make sure the server is running on', SOCKET_URL);
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed')) {
          console.error('❌ Cannot connect to server at', SOCKET_URL);
          console.error('💡 Make sure the server is running: cd server && npm run dev');
          console.error('💡 If the server is on a different port, set NEXT_PUBLIC_SOCKET_URL in .env.local');
        } else {
          console.error('Make sure the server is running on', SOCKET_URL);
        }
      }
      hasShownConnectionError = true;
      connectionErrorShownAt = now;
    }
    // Silently handle subsequent errors (don't let socket.io log them)
    // Prevent default error behavior
    if (!shouldShowError) {
      error.preventDefault?.();
    }
  });
  
  // Suppress reconnect_attempt events when server is known unavailable
  socket.on('reconnect_attempt', () => {
    if (isServerKnownUnavailable && hasShownConnectionError) {
      // Stop reconnection attempts if server is known unavailable
      socket.io.reconnecting = false;
      socket.disconnect();
      return;
    }
  });
}

// Auto-connect when socket methods are called
function ensureConnected(socket: Socket) {
  if (typeof window !== 'undefined' && !socket.connected) {
    // Only try to connect if we haven't determined the server is unavailable
    // or if enough time has passed since the last error
    const now = Date.now();
    const shouldAttemptConnection = 
      !isServerKnownUnavailable || 
      !connectionErrorShownAt ||
      (now - connectionErrorShownAt > ERROR_SUPPRESSION_TIME);
    
    if (shouldAttemptConnection) {
      // Re-enable reconnection if it was disabled, in case server is now available
      if (socket.io && socket.io.opts && !socket.io.opts.reconnection) {
        socket.io.opts.reconnection = true;
      }
      socket.connect();
    }
    // If server is known unavailable, don't attempt connection at all
    // This prevents ERR_CONNECTION_REFUSED errors from appearing
  }
}

// Export socket with lazy connection - connects automatically when methods are called
export const socket: Socket = new Proxy({} as Socket, {
  get(target, prop) {
    const actualSocket = getSocket();
    const value = (actualSocket as any)[prop];
    
    // Auto-connect when calling methods that require connection
    if (typeof value === 'function') {
      const methodName = String(prop);
      // Methods that typically require connection
      if (['emit', 'on', 'once', 'off', 'send'].includes(methodName)) {
        return function(...args: any[]) {
          ensureConnected(actualSocket);
          return value.apply(actualSocket, args);
        };
      }
      // For connect method, ensure we try to connect
      if (methodName === 'connect') {
        return function(...args: any[]) {
          ensureConnected(actualSocket);
          return value.apply(actualSocket, args);
        };
      }
      return value.bind(actualSocket);
    }
    
    return value;
  }
});

