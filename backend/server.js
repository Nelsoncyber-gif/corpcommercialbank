require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const pool = require('./config/db');

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
const adminQueueRoom = 'support-admins';

const getSupportRoom = (userId) => `support-${userId}`;

io.on('connection', (socket) => {
  console.log('💬 Socket connected:', socket.id);

  socket.on('join-chat', async ({ userId, userRole, targetUserId }) => {
    const targetId = Number(targetUserId ?? userId);
    const roomName = getSupportRoom(targetId);

    if (socket.data.currentRoom && socket.data.currentRoom !== roomName) {
      socket.leave(socket.data.currentRoom);
    }

    socket.join(roomName);
    socket.data.currentRoom = roomName;
    socket.data.userRole = userRole;
    socket.data.userId = Number(userId);

    if (userRole === 'admin') {
      activeAdmins.set(Number(userId), socket.id);
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
    }
  });

  socket.on('send-message', async ({ userId, message, senderType }) => {
    console.log('📩 [DEBUG] send-message payload:', { userId, message, senderType });

    try {
      const cleanMessage = String(message || '').trim();
      const targetId = Number(userId);

      if (!targetId || isNaN(targetId) || !cleanMessage) {
        console.error('❌ [DEBUG] Invalid payload, dropping message');
        return;
      }

      const result = await pool.query(
        `INSERT INTO chat_messages (user_id, sender_type, message)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [targetId, senderType, cleanMessage]
      );

      const newMessage = result.rows[0];
      const roomName = getSupportRoom(targetId);
      console.log('💾 Saved message:', newMessage);

      io.to(roomName).emit('new-message', newMessage);

      if (senderType === 'user') {
        io.to(adminQueueRoom).emit('new-user-message', {
          userId: targetId,
          message: newMessage
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('get-active-chats', async () => {
    try {
      const chats = await pool.query(
        `SELECT DISTINCT ON (cm.user_id)
                cm.user_id,
                u.first_name,
                u.last_name,
                u.email,
                cm.message AS last_message,
                cm.created_at AS last_message_time
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE u.role != 'admin'
         ORDER BY cm.user_id, cm.created_at DESC`
      );
      socket.emit('active-chats', chats.rows);
    } catch (error) {
      console.error('Error fetching active chats:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);

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