require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const pool = require('./config/db');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'file://'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    socket.data.authUser = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    next(new Error('Invalid or expired authentication token.'));
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware for auth requests
app.use((req, res, next) => {
  if (req.path.includes('/auth/')) {
    console.log('Auth Request:', {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers
    });
  }
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const profileRoutes = require('./routes/profileRoutes');
const cardRoutes = require('./routes/cardRoutes');
const adminCardRoutes = require('./routes/adminCardRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/cards/admin', adminCardRoutes);

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '..')));

// Catch-all route to serve index.html
app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Socket.io for real-time chat
const activeAdmins = new Map();
const userSockets = new Map();
const adminTypingTimers = new Map();
const adminQueueRoom = 'support-admins';

const getSupportRoom = (userId) => `support-${userId}`;

io.on('connection', (socket) => {
  console.log('💬 Socket connected:', socket.id);

  socket.on('join-chat', async ({ targetUserId } = {}) => {
    const authUser = socket.data.authUser;
    const userId = Number(authUser.id);
    const isAdmin = authUser.role === 'admin';
    const targetId = isAdmin ? Number(targetUserId ?? userId) : userId;
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(targetId) || targetId <= 0) {
      socket.emit('chat-error', { message: 'Invalid chat participant.' });
      return;
    }
    const roomName = getSupportRoom(targetId);

    if (socket.data.currentRoom && socket.data.currentRoom !== roomName) {
      socket.leave(socket.data.currentRoom);
    }

    socket.join(roomName);
    socket.data.currentRoom = roomName;
    socket.data.userRole = authUser.role;
    socket.data.userId = userId;

    if (isAdmin) {
      activeAdmins.set(userId, socket.id);
      socket.join(adminQueueRoom);
      io.to(adminQueueRoom).emit('admin-online', { adminCount: activeAdmins.size });
      console.log('👨‍💼 Admin joined support room:', roomName);
    } else {
      userSockets.set(Number(userId), socket.id);
    }

    try {
      const messages = await pool.query(
        `SELECT cm.*, u.first_name, u.last_name
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.user_id = $1
         ORDER BY cm.created_at ASC`,
        [targetId]
      );
      socket.emit('chat-history', messages.rows);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      socket.emit('chat-error', { message: 'Failed to load chat history.' });
    }
  });

  socket.on('send-message', async ({ userId, message } = {}, acknowledge) => {
    try {
      const cleanMessage = String(message || '').trim();
      const isAdmin = socket.data.authUser.role === 'admin';
      const targetId = isAdmin ? Number(userId) : Number(socket.data.authUser.id);

      if (!Number.isInteger(targetId) || targetId <= 0 || !cleanMessage || cleanMessage.length > 5000) {
        const result = { success: false, message: 'Enter a message of 1 to 5000 characters.' };
        if (typeof acknowledge === 'function') acknowledge(result);
        else socket.emit('chat-error', result);
        return;
      }

      const result = await pool.query(
        `INSERT INTO chat_messages (user_id, sender_type, message)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [targetId, isAdmin ? 'admin' : 'user', cleanMessage]
      );

      const newMessage = result.rows[0];
      const roomName = getSupportRoom(targetId);
      io.to(roomName).emit('new-message', newMessage);

      if (!isAdmin) {
        io.to(adminQueueRoom).emit('new-user-message', {
          userId: targetId,
          message: newMessage
        });
      }
      if (typeof acknowledge === 'function') acknowledge({ success: true, message: newMessage });
    } catch (error) {
      console.error('Error sending message:', error);
      const result = { success: false, message: 'Message could not be sent. Please try again.' };
      if (typeof acknowledge === 'function') acknowledge(result);
      else socket.emit('chat-error', result);
    }
  });

  socket.on('admin-typing', ({ targetUserId } = {}) => {
    if (socket.data.authUser.role !== 'admin') return;
    const userId = Number(targetUserId);
    if (!Number.isInteger(userId) || userId <= 0) return;

    const roomName = getSupportRoom(userId);
    io.to(roomName).emit('admin-typing');
    const existingTimer = adminTypingTimers.get(socket.id);
    if (existingTimer) {
      clearTimeout(existingTimer.timer);
      if (existingTimer.roomName !== roomName) io.to(existingTimer.roomName).emit('admin-stop-typing');
    }
    const timer = setTimeout(() => {
      io.to(roomName).emit('admin-stop-typing');
      if (adminTypingTimers.get(socket.id)?.timer === timer) adminTypingTimers.delete(socket.id);
    }, 1500);
    adminTypingTimers.set(socket.id, { timer, roomName });
  });

  socket.on('admin-stop-typing', ({ targetUserId } = {}) => {
    if (socket.data.authUser.role !== 'admin') return;
    const userId = Number(targetUserId);
    if (!Number.isInteger(userId) || userId <= 0) return;
    const timer = adminTypingTimers.get(socket.id);
    if (timer) clearTimeout(timer.timer);
    adminTypingTimers.delete(socket.id);
    if (timer && timer.roomName !== getSupportRoom(userId)) io.to(timer.roomName).emit('admin-stop-typing');
    io.to(getSupportRoom(userId)).emit('admin-stop-typing');
  });

  socket.on('get-active-chats', async () => {
    if (socket.data.authUser.role !== 'admin') {
      socket.emit('chat-error', { message: 'Only support staff can view active chats.' });
      return;
    }
    try {
      const chats = await pool.query(
        `SELECT u.id AS user_id,
                u.first_name,
                u.last_name,
                u.email,
                latest.message AS last_message,
                latest.created_at AS last_message_time
         FROM users u
         LEFT JOIN LATERAL (
           SELECT message, created_at
           FROM chat_messages
           WHERE user_id = u.id
           ORDER BY created_at DESC
           LIMIT 1
         ) latest ON TRUE
         WHERE u.role != 'admin'
         ORDER BY latest.created_at DESC NULLS LAST, u.first_name, u.last_name`
      );
      socket.emit('active-chats', chats.rows);
    } catch (error) {
      console.error('Error fetching active chats:', error);
      socket.emit('chat-error', { message: 'Failed to load active chats.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    const typingTimer = adminTypingTimers.get(socket.id);
    if (typingTimer) {
      clearTimeout(typingTimer.timer);
      io.to(typingTimer.roomName).emit('admin-stop-typing');
    }
    adminTypingTimers.delete(socket.id);

    for (const [adminId, socketId] of activeAdmins.entries()) {
      if (socketId === socket.id) {
        activeAdmins.delete(adminId);
        io.to(adminQueueRoom).emit('admin-online', { adminCount: activeAdmins.size });
        break;
      }
    }

    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

// Simple database connection test
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});