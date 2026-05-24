import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.callbacks = {};
    }

    // Initialize socket connection
    connect(token, userData = {}) {
        if (this.socket && this.connected) {
            return Promise.resolve(this.socket);
        }

        return new Promise((resolve, reject) => {
            // In production, connect to the same origin. In dev, use VITE_SERVER_URL or localhost.
            const serverUrl = import.meta.env.VITE_SERVER_URL ||
                (window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:8000');

            this.socket = io(serverUrl, {
                auth: {
                    token
                },
                query: {
                    token // Fallback for some environments
                },
                extraHeaders: {
                    'x-auth-token': token // Support header-based auth
                },
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('Socket connected:', this.socket.id);
                this.connected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();

                if (this.callbacks.onConnect) {
                    this.callbacks.onConnect();
                }

                resolve(this.socket);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                this.connected = false;
                this.stopHeartbeat();

                if (this.callbacks.onDisconnect) {
                    this.callbacks.onDisconnect(reason);
                }

                if (reason === 'io server disconnect') {
                    // Server disconnected, reconnect manually
                    this.socket.connect();
                }
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    if (this.callbacks.onConnectionFailed) {
                        this.callbacks.onConnectionFailed(error);
                    }
                    reject(error);
                }

                if (this.callbacks.onConnectError) {
                    this.callbacks.onConnectError(error);
                }
            });

            // Assessment events
            this.socket.on('user-joined', (data) => {
                console.log('User joined assessment:', data);
                if (this.callbacks.onUserJoined) {
                    this.callbacks.onUserJoined(data);
                }
            });

            this.socket.on('user-left', (data) => {
                console.log('User left assessment:', data);
                if (this.callbacks.onUserLeft) {
                    this.callbacks.onUserLeft(data);
                }
            });

            this.socket.on('candidate-progress', (data) => {
                if (this.callbacks.onCandidateProgress) {
                    this.callbacks.onCandidateProgress(data);
                }
            });

            this.socket.on('proctoring-violation', (data) => {
                console.warn('Proctoring violation:', data);
                if (this.callbacks.onProctoringViolation) {
                    this.callbacks.onProctoringViolation(data);
                }
            });

            this.socket.on('assessment-time-warning', (data) => {
                if (this.callbacks.onTimeWarning) {
                    this.callbacks.onTimeWarning(data);
                }
            });

            this.socket.on('assessment-status-update', (data) => {
                if (this.callbacks.onAssessmentStatus) {
                    this.callbacks.onAssessmentStatus(data);
                }
            });

            this.socket.on('message-from-admin', (data) => {
                if (this.callbacks.onAdminMessage) {
                    this.callbacks.onAdminMessage(data);
                }
            });

            this.socket.on('heartbeat-response', (data) => {
                // Heartbeat response received
            });

            this.socket.on('user-disconnected', (data) => {
                if (this.callbacks.onUserDisconnected) {
                    this.callbacks.onUserDisconnected(data);
                }
            });
        });
    }

    // Start heartbeat
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.socket) {
                this.socket.emit('heartbeat');
            }
        }, 30000); // Every 30 seconds
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Join assessment room
    joinAssessment(assessmentId, userId, role) {
        if (this.connected && this.socket) {
            this.socket.emit('join-assessment', {
                assessmentId,
                userId,
                role
            });
        }
    }

    // Leave assessment room
    leaveAssessment(assessmentId, userId, role) {
        if (this.connected && this.socket) {
            this.socket.emit('leave-assessment', {
                assessmentId,
                userId,
                role
            });
        }
    }

    // Send progress update
    sendProgressUpdate(assessmentId, userId, progress) {
        if (this.connected && this.socket) {
            this.socket.emit('progress-update', {
                assessmentId,
                userId,
                progress
            });
        }
    }

    // Send proctoring alert
    sendProctoringAlert(assessmentId, userId, alert) {
        if (this.connected && this.socket) {
            this.socket.emit('proctoring-alert', {
                assessmentId,
                userId,
                alert
            });
        }
    }

    // Send time warning
    sendTimeWarning(assessmentId, timeLeft) {
        if (this.connected && this.socket) {
            this.socket.emit('time-warning', {
                assessmentId,
                timeLeft
            });
        }
    }

    // Send assessment status update
    sendAssessmentStatus(assessmentId, status) {
        if (this.connected && this.socket) {
            this.socket.emit('assessment-status', {
                assessmentId,
                status
            });
        }
    }

    // Send admin message
    sendAdminMessage(assessmentId, targetUserId, message) {
        if (this.connected && this.socket) {
            this.socket.emit('admin-message', {
                assessmentId,
                targetUserId,
                message
            });
        }
    }

    // Send candidate question
    sendCandidateQuestion(assessmentId, question) {
        if (this.connected && this.socket) {
            this.socket.emit('candidate-question', {
                assessmentId,
                question
            });
        }
    }

    // Set callbacks
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Get connection status
    isConnected() {
        return this.connected;
    }

    // Get socket ID
    getSocketId() {
        return this.socket ? this.socket.id : null;
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Reconnect
    reconnect() {
        if (this.socket) {
            this.socket.connect();
        }
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
