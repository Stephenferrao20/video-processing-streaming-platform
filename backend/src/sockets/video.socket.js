import { authenticateSocket } from '../middleware/socket-auth.middleware.js';


 //Initialize Socket.io handlers for real-time video processing updates
 
export const initializeSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.userId}`);

    // Join tenant-specific room for receiving updates
    const tenantId = socket.tenantId || socket.userId;
    socket.join(`tenant-${tenantId}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.userId}`);
    });

    // Handle client-specific events if needed
    socket.on('subscribe-video', (videoId) => {
      socket.join(`video-${videoId}`);
    });

    socket.on('unsubscribe-video', (videoId) => {
      socket.leave(`video-${videoId}`);
    });
  });
};
