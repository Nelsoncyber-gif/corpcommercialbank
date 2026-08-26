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
const activeAdmins = new Map(); // Map<adminUserId, socketId>
const userSockets = new Map();  // Map<userId, socketId>
const adminSocketIds = new Set(); // Set of all admin socket IDs

const getChatRoom = (userId) => `chat-${userId}`;

io.on('connection', (socket) => {
  console.log('💬 User connected:', socket.id);

  // User joins chat
  socket.on('join-chat', async ({ userId, userRole, targetUserId }) => {
    const chatUserId = targetUserId ?? userId;
    const roomName = getChatRoom(chatUserId);

    if (socket.data.chatRoomName && socket.data.chatRoomName !== roomName) {
      socket.leave(socket.data.chatRoomName);
    }

    socket.join(roomName);
    socket.data.chatUserId = chatUserId;
    socket.data.chatRoomName = roomName;
    socket.data.userRole = userRole;

    if (userRole === 'admin') {
      activeAdmins.set(userId, socket.id);
      adminSocketIds.add(socket.id);
      socket.join('admin-chat');
      io.emit('admin-online', { adminCount: activeAdmins.size });
      console.log('👨‍💼 Admin joined chat room:', roomName);
      console.log('👨‍💼 Admin joined admin queue. Active admins:', activeAdmins.size);
    } else {
      userSockets.set(userId, socket.id);
    }

    // Send chat history for this specific user conversation
    try {
      const messages = await pool.query(
        `SELECT cm.*, u.first_name, u.last_name
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.user_id = $1
         ORDER BY cm.created_at ASC`,
        [chatUserId]
      );
      socket.emit('chat-history', messages.rows);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  // Send message
  socket.on('send-message', async ({ userId, message, senderType }) => {
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (user_id, sender_type, message)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, senderType, message]
      );

      const newMessage = result.rows[0];
      const roomName = getChatRoom(userId);
      console.log('💾 Message saved to DB:', newMessage);

      // Always send to the exact conversation room so the customer and any admin
      // currently viewing that thread receive the message on the same channel.
      io.to(roomName).emit('new-message', newMessage);

      if (senderType === 'user') {
        console.log('📢 Broadcasting user message to admins for chat room:', roomName);
        io.to('admin-chat').emit('new-user-message', {
          userId,
          message: newMessage
        });
      } else if (senderType === 'admin') {
        console.log('📢 Admin sent message to user', userId);
      }

      console.log(`📨 Message from ${senderType}:`, message.substring(0, 50));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Admin requests all active chats
  socket.on('get-active-chats', async () => {
    try {
      const chats = await pool.query(
        `SELECT DISTINCT cm.user_id, u.first_name, u.last_name, u.email,
         (SELECT message FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) as last_message_time
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE u.role != 'admin'
         ORDER BY last_message_time DESC`
      );
      socket.emit('active-chats', chats.rows);
    } catch (error) {
      console.error('Error fetching active chats:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (let [userId, socketId] of activeAdmins.entries()) {
      if (socketId === socket.id) {
        activeAdmins.delete(userId);
        adminSocketIds.delete(socketId);
        io.emit('admin-online', { adminCount: activeAdmins.size });
        break;
      }
    }

    for (let [userId, socketId] of userSockets.entries()) {
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