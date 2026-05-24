const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Initialize Socket.IO
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "*", // Allow all origins if not specified
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // ─── AUTH MIDDLEWARE ───────────────────────────────────────────
    // Verify JWT before allowing any socket connection.
    // The decoded token is attached to socket.user so all event
    // handlers can trust it instead of client-supplied fields.
    io.use((socket, next) => {
        // Support token in handshake.auth or query parameter for flexibility
        const token = socket.handshake.auth?.token || socket.handshake.query?.token || socket.handshake.headers['x-auth-token'];
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Support different payload structures from admin/candidate tokens
            if (decoded.admin) {
                socket.user = decoded.admin;
                socket.role = 'admin';
                socket.userId = decoded.admin.id;
            } else if (decoded.candidate) {
                socket.user = decoded.candidate;
                socket.role = 'candidate';
                socket.userId = decoded.candidate.id;
            } else {
                return next(new Error('Invalid token structure'));
            }
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token'));
        }
    });

    // Connection handling
    io.on('connection', (socket) => {
        console.log(`Authenticated ${socket.role} connected: ${socket.id} (userId: ${socket.userId})`);

        // Join assessment room — uses server-verified identity, not client-supplied data
        socket.on('join-assessment', (data) => {
            const { assessmentId } = data;

            // Use the verified role and userId from the JWT
            const role = socket.role;
            const userId = socket.userId;

            socket.join(`assessment-${assessmentId}`);
            socket.join(`${role}-${userId}`);

            // Notify others in the room
            socket.to(`assessment-${assessmentId}`).emit('user-joined', {
                userId,
                role,
                timestamp: new Date()
            });

            console.log(`${role} ${userId} joined assessment ${assessmentId}`);
        });

        // Leave assessment room
        socket.on('leave-assessment', (data) => {
            const { assessmentId } = data;
            const role = socket.role;
            const userId = socket.userId;

            socket.leave(`assessment-${assessmentId}`);
            socket.leave(`${role}-${userId}`);

            // Notify others
            socket.to(`assessment-${assessmentId}`).emit('user-left', {
                userId,
                role,
                timestamp: new Date()
            });

            console.log(`${role} ${userId} left assessment ${assessmentId}`);
        });

        // Real-time progress updates (candidates only)
        socket.on('progress-update', (data) => {
            if (socket.role !== 'candidate') return; // Ignore non-candidate senders

            const { assessmentId, progress } = data;

            // Send to admins monitoring this assessment
            socket.to(`assessment-${assessmentId}`).emit('candidate-progress', {
                userId: socket.userId,
                progress,
                timestamp: new Date()
            });
        });

        // Proctoring alerts (candidates only)
        socket.on('proctoring-alert', (data) => {
            if (socket.role !== 'candidate') return;

            const { assessmentId, alert } = data;

            // Send to admins
            socket.to(`assessment-${assessmentId}`).emit('proctoring-violation', {
                userId: socket.userId,
                alert,
                timestamp: new Date()
            });

            console.log(`Proctoring alert for candidate ${socket.userId}:`, alert);
        });

        // Time warnings
        socket.on('time-warning', (data) => {
            const { assessmentId, timeLeft } = data;

            socket.to(`assessment-${assessmentId}`).emit('assessment-time-warning', {
                timeLeft,
                timestamp: new Date()
            });
        });

        // Assessment status updates (admins only)
        socket.on('assessment-status', (data) => {
            if (socket.role !== 'admin') return; // Only admins can change status

            const { assessmentId, status } = data;

            socket.to(`assessment-${assessmentId}`).emit('assessment-status-update', {
                status,
                timestamp: new Date()
            });
        });

        // Admin to candidate messaging (admins only)
        socket.on('admin-message', (data) => {
            if (socket.role !== 'admin') return; // Only admins can send messages

            const { targetUserId, message } = data;

            // Send to specific candidate
            io.to(`candidate-${targetUserId}`).emit('message-from-admin', {
                message,
                timestamp: new Date()
            });
        });

        // Candidate questions (candidates only)
        socket.on('candidate-question', (data) => {
            if (socket.role !== 'candidate') return;

            const { assessmentId, question } = data;

            // Send to admins
            socket.to(`assessment-${assessmentId}`).emit('candidate-question-received', {
                userId: socket.userId,
                question,
                timestamp: new Date()
            });
        });

        // Heartbeat to keep connection alive
        socket.on('heartbeat', () => {
            socket.emit('heartbeat-response', {
                timestamp: new Date()
            });
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`${socket.role} ${socket.userId} disconnected: ${reason}`);

            // Notify others in all rooms the user was in
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('user-disconnected', {
                        userId: socket.userId,
                        role: socket.role,
                        reason,
                        timestamp: new Date()
                    });
                }
            });
        });

        // Error handling
        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.role} ${socket.userId}:`, error);
        });
    });

    console.log('Socket.IO initialized with JWT authentication');
    return io;
};

// Get IO instance
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

// Helper functions for broadcasting
const broadcastToAssessment = (assessmentId, event, data) => {
    if (io) {
        io.to(`assessment-${assessmentId}`).emit(event, {
            ...data,
            timestamp: new Date()
        });
    }
};

const sendToCandidate = (userId, event, data) => {
    if (io) {
        io.to(`candidate-${userId}`).emit(event, {
            ...data,
            timestamp: new Date()
        });
    }
};

const sendToAdmin = (userId, event, data) => {
    if (io) {
        io.to(`admin-${userId}`).emit(event, {
            ...data,
            timestamp: new Date()
        });
    }
};

module.exports = {
    initializeSocket,
    getIO,
    broadcastToAssessment,
    sendToCandidate,
    sendToAdmin
};
