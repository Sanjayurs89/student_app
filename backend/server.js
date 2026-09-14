// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const authController = require('./controllers/authController');
const academicController = require('./controllers/academicController');
const notesController = require('./controllers/notesController');
const chatController = require('./controllers/chatController');
const roomController = require('./controllers/roomController');
const timetableController = require('./controllers/timetableController');
const commController = require('./controllers/commController');
const assignmentController = require('./controllers/assignmentController');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend connection
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded files statically from backend/uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/onboarding', authMiddleware, authController.onboard);
app.get('/api/auth/me', authMiddleware, authController.getMe);

// Academic routes
app.get('/api/academic/departments', academicController.getDepartments);
app.get('/api/academic/onboarding-data', academicController.getOnboardingData);
app.get('/api/academic/live-count', authMiddleware, academicController.getLiveCount);
app.get('/api/academic/subjects/:id/dashboard', authMiddleware, academicController.getSubjectDashboard);

// Notes routes
app.post('/api/notes', authMiddleware, notesController.upload.single('file'), notesController.createNote);
app.get('/api/notes', authMiddleware, notesController.getNotes);
app.get('/api/notes/tags', authMiddleware, notesController.getSubjectTags);
app.post('/api/notes/:id/upvote', authMiddleware, notesController.toggleUpvote);
app.post('/api/notes/:id/bookmark', authMiddleware, notesController.toggleBookmark);
app.post('/api/notes/:id/download', authMiddleware, notesController.incrementDownload);
app.post('/api/notes/:id/comments', authMiddleware, notesController.addComment);
app.get('/api/notes/:id/comments', authMiddleware, notesController.getComments);
app.post('/api/notes/:id/pin', authMiddleware, notesController.togglePinNote);

// Assignment routes
app.get('/api/assignments', authMiddleware, assignmentController.getAssignments);
app.get('/api/assignments/file-url', authMiddleware, assignmentController.getSignedFileUrl);
app.get('/api/assignments/:id', authMiddleware, assignmentController.getAssignmentById);
app.post('/api/assignments', authMiddleware, assignmentController.upload.single('file'), assignmentController.createAssignment);
app.post('/api/assignments/:id/submit', authMiddleware, assignmentController.upload.single('file'), assignmentController.submitAssignment);
app.post('/api/assignments/submissions/:submissionId/grade', authMiddleware, assignmentController.gradeSubmission);

// Chat routes
app.get('/api/chat/rooms', authMiddleware, chatController.getRooms);
app.get('/api/chat/messages/:roomId', authMiddleware, chatController.getMessages);

// Room routes
app.post('/api/rooms', authMiddleware, roomController.createRoom);
app.get('/api/rooms', authMiddleware, roomController.getJoinedRooms);
app.get('/api/rooms/discover', authMiddleware, roomController.discoverRooms);
app.post('/api/rooms/:id/join', authMiddleware, roomController.joinRoom);
app.post('/api/rooms/:id/leave', authMiddleware, roomController.leaveRoom);
app.get('/api/rooms/:id/notes', authMiddleware, roomController.getRoomNotes);

// Timetable routes
app.get('/api/timetable', authMiddleware, timetableController.getTimetable);
app.post('/api/timetable', authMiddleware, timetableController.createSlot);
app.delete('/api/timetable/:id', authMiddleware, timetableController.deleteSlot);

// Communication routes
app.get('/api/communication/announcements', authMiddleware, commController.getAnnouncements);
app.post('/api/communication/announcements', authMiddleware, commController.createAnnouncement);
app.get('/api/communication/doubts', authMiddleware, commController.getDoubts);
app.post('/api/communication/doubts', authMiddleware, commController.createDoubt);
app.get('/api/communication/doubts/:id', authMiddleware, commController.getDoubtDetails);
app.post('/api/communication/doubts/:id/answers', authMiddleware, commController.answerDoubt);

// Socket.io for Phase 3 (Chat) & Phase 6 (Presence)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Track online users: maps userId -> Set of active socket.ids
const connectedUsers = new Map();

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token is required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'college_app_super_secret_jwt_key_2026_!');
    socket.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`User connected to socket: ${socket.id} (${socket.user.name})`);
  
  // Track presence
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
    // Broadcast status change to everyone else
    socket.broadcast.emit('user_online', { userId, name: socket.user.name });
  }
  connectedUsers.get(userId).add(socket.id);

  // Send the current list of online user IDs to the newly connected user
  socket.emit('initial_online_users', Array.from(connectedUsers.keys()));
  
  // User joins a chat channel
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket] User ${socket.user.name} joined room: ${roomId}`);
  });

  // User leaves a chat channel
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`[Socket] User ${socket.user.name} left room: ${roomId}`);
  });

  // User sends a message in a channel
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content } = data;
      if (!roomId || !content || !content.trim()) return;

      // Save message to SQLite
      const savedMessage = await prisma.message.create({
        data: {
          content: content.trim(),
          roomId,
          userId: socket.user.id,
        },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      });

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit('new_message', savedMessage);
    } catch (error) {
      console.error('Socket message save/broadcast error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected from socket: ${socket.id}`);
    
    // Track presence disconnection
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        connectedUsers.delete(userId);
        // Broadcast status change to everyone else
        io.emit('user_offline', { userId });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
