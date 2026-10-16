// backend/sockets/chat.js
const pool = require('../config/db');

const ADMIN_ROOM = 'admins';
const userRoom = (id) => `user:${id}`;

module.exports = function registerChat(io) {
  io.on('connection', (socket) => {
    const authUser = socket.data.authUser;
    const isAdmin = authUser?.role === 'admin';
    const userId = Number(authUser?.id);

    if (!userId || !Number.isInteger(userId)) {
      socket.emit('chat:error', { message: 'Invalid session.' });
      return;
    }

    // ---- 1. Join the appropriate room ----
    // Customers join only their own room.
    // Admins join the shared admins room (they join a customer's room temporarily when viewing).
    if (isAdmin) {
      socket.join(ADMIN_ROOM);
    } else {
      socket.join(userRoom(userId));
    }

    console.log(`💬 [chat] ${isAdmin ? 'admin' : 'user'} ${userId} connected (${socket.id})`);

    // ---- 2. Send history automatically to customers ----
    // Customers get their own history as soon as they connect.
    // Admins request it explicitly via chat:join with a target.
    if (!isAdmin) {
      sendHistory(socket, userId).catch((err) => {
        console.error('[chat] history error:', err);
        socket.emit('chat:error', { message: 'Failed to load chat history.' });
      });
    }

    // ---- 3. chat:join — register interest in a room ----
    // For customers: no-op (already in their room).
    // For admins: join a specific customer's room to receive live messages for that conversation.
    socket.on('chat:join', async ({ userId: targetId } = {}) => {
      if (isAdmin) {
        const tid = Number(targetId);
        if (!Number.isInteger(tid) || tid <= 0) {
          return socket.emit('chat:error', { message: 'Invalid customer id.' });
        }
        // Leave any previous customer room (but stay in ADMINS)
        if (socket.data.customerRoom && socket.data.customerRoom !== userRoom(tid)) {
          socket.leave(socket.data.customerRoom);
        }
        socket.join(userRoom(tid));
        socket.data.customerRoom = userRoom(tid);
        await sendHistory(socket, tid);
      } else {
        // Customer just re-confirms they're in their own room
        socket.join(userRoom(userId));
      }
    });

    // ---- 4. chat:send — send a message ----
    socket.on('chat:send', async ({ toUserId, text } = {}, ack) => {
      try {
        const body = String(text || '').trim();
        if (!body || body.length > 5000) {
          return ack?.({ success: false, message: 'Message must be 1–5000 chars.' });
        }

        // Customers can only send as themselves. Admins send to whichever customer they specify.
        const targetUserId = isAdmin ? Number(toUserId) : userId;
        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
          return ack?.({ success: false, message: 'Invalid recipient.' });
        }

        const { rows } = await pool.query(
          `INSERT INTO chat_messages (user_id, sender_type, message)
           VALUES ($1, $2, $3)
           RETURNING id, user_id, sender_type, message, created_at`,
          [targetUserId, isAdmin ? 'admin' : 'user', body]
        );

        const msg = rows[0];

        // Deliver to everyone in the user's room (the customer + any admin currently viewing)
        io.to(userRoom(targetUserId)).emit('chat:message', msg);

        // Notify the admin queue if this came from a customer
        if (!isAdmin) {
          io.to(ADMIN_ROOM).emit('chat:notify', { userId: targetUserId, message: msg });
        }

        ack?.({ success: true, message: msg });
      } catch (err) {
        console.error('[chat] send error:', err);
        ack?.({ success: false, message: 'Message could not be sent.' });
      }
    });

    // ---- 5. chat:list — admin only: list active conversations ----
    socket.on('chat:list', async () => {
      if (!isAdmin) return;
      try {
        const { rows } = await pool.query(
          `SELECT u.id AS user_id, u.first_name, u.last_name, u.email,
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
            WHERE u.role <> 'admin'
            ORDER BY latest.created_at DESC NULLS LAST, u.first_name, u.last_name`
        );
        socket.emit('chat:list', rows);
      } catch (err) {
        console.error('[chat] list error:', err);
        socket.emit('chat:error', { message: 'Failed to load chats.' });
      }
    });

    // ---- 6. chat:typing — typing indicators ----
    socket.on('chat:typing', ({ toUserId, typing } = {}) => {
      const targetId = isAdmin ? Number(toUserId) : userId;
      if (!Number.isInteger(targetId) || targetId <= 0) return;
      socket.to(userRoom(targetId)).emit('chat:typing:update', {
        from: isAdmin ? 'admin' : 'user',
        typing: Boolean(typing)
      });
    });

    // ---- 7. disconnect ----
    socket.on('disconnect', () => {
      console.log(`💬 [chat] socket ${socket.id} disconnected`);
    });
  });
};

// Helper: send full history for a given user to a socket
async function sendHistory(socket, targetUserId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, sender_type, message, created_at
       FROM chat_messages
      WHERE user_id = $1
      ORDER BY created_at ASC`,
    [targetUserId]
  );
  socket.emit('chat:history', { userId: targetUserId, messages: rows });
}