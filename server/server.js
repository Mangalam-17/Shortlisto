const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const db = require('./config/db');
const { errorHandler, requestLogger, notFound } = require('./middleware/errorHandler');
const { cacheMiddleware, cacheResponse } = require('./middleware/cacheMiddleware');
const { pagination } = require('./middleware/pagination');
const { initializeSocket } = require('./config/socket');
const SecurityMiddleware = require('./middleware/security');

require('dotenv').config();

// Run startup validation and then start server
const StartupValidator = require('./scripts/validateStartup');
const validator = new StartupValidator();
validator.runAll()
    .then(results => {
        if (!results.success) {
            console.error('❌ Startup validation failed. Please fix errors before starting the server.');
            process.exit(1);
        }
        
        // Start server after successful validation
        startServer();
    })
    .catch(error => {
        console.error('❌ Startup validation crashed:', error);
        process.exit(1);
    });

function startServer() {
    try {
        console.log('🚀 Starting server initialization...');
        
    require('./workers/emailWorker');
    require('./workers/analysisWorker');
    console.log('✅ Workers initialized');

    // Fail fast if critical env vars are missing
    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
        process.exit(1);
    }

    console.log('✅ JWT_SECRET check passed');

    if (!process.env.MONGO_URI) {
        console.error('FATAL: MONGO_URI environment variable is not set. Exiting.');
        process.exit(1);
    }

    console.log('✅ MONGO_URI check passed');

    const app = express();
    const server = http.createServer(app);
    server.on('error', (err) => {
        console.error('❌ HTTP server error:', err);
    });
    server.on('listening', () => {
        const addr = server.address();
        console.log(`✅ HTTP server listening on ${addr.address}:${addr.port}`);
    });

    // Initialize Socket.IO
    initializeSocket(server);
    console.log('✅ Socket.IO initialized');

    db();
    console.log('✅ Database connection initiated');

    // Enhanced Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
                workerSrc: ["'self'", "blob:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                childSrc: ["'none'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                manifestSrc: ["'self'"],
                upgradeInsecureRequests: null
            }
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        ieNoOpen: true,
        referrerPolicy: {
            policy: "no-referrer"
        },
        permittedCrossDomainPolicies: false,
        crossDomainResourcePolicy: false
    }));

    // Performance middleware
    app.use(compression());

    // CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : [
            process.env.CLIENT_URL,
            'http://localhost:3000',
            'http://localhost:5173'
          ].filter(Boolean);

    console.log('✅ CORS allowed origins:', allowedOrigins);

    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`⚠️  CORS blocked origin: ${origin}`);
                // Return false instead of throwing — prevents server crash
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token']
    };

    // Handle preflight OPTIONS requests first
    app.use(cors(corsOptions));
    console.log('✅ CORS middleware enabled');

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Apply security middleware after body parsing
    app.use(SecurityMiddleware.mongoSanitize());
    app.use(SecurityMiddleware.securityHeaders());
    app.use(SecurityMiddleware.requestSizeLimit());
    console.log('✅ Security middleware enabled');

    app.use(requestLogger);
    app.use(pagination);

    // Apply caching middleware for GET endpoints (short TTL in dev)
    app.use('/api/', cacheMiddleware(60));
    app.use('/api/', cacheResponse());
    console.log('✅ Caching middleware enabled for /api');

    app.use('/api', (req, res, next) => {
        if (!db.isDbConnected()) {
            return res.status(503).json({ success: false, error: 'Database unavailable' });
        }
        next();
    });

    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/drives', require('./routes/driveRoutes'));
    app.use('/api/dashboard', require('./routes/dashboardRoutes'));
    app.use('/api/candidates', require('./routes/candidateRoutes'));
    app.use('/api/assessments', require('./routes/assessmentRoutes'));
    app.use('/api/questions', require('./routes/questionRoutes'));
    app.use('/api/results', require('./routes/resultRoutes'));
    app.use('/api/analytics', require('./routes/analyticsRoutes'));
    app.use('/api/settings', require('./routes/settingsRoutes'));
    console.log('✅ Routes enabled: /api/auth, /api/drives, /api/dashboard, /api/candidates, /api/assessments, /api/questions, /api/results, /api/analytics, /api/settings');

    // Health check endpoint
    app.get('/health', (req, res) => {
        console.log('✅ Health check endpoint called');
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // Simple test endpoint
    app.get('/test', (req, res) => {
        console.log('✅ Test endpoint called');
        res.json({ message: 'Server is running!' });
    });



    // 404 handler (for API routes only in production)
    app.use(notFound);

    // Error handler
    app.use(errorHandler);

    const PORT = process.env.PORT || 8000;

    const startServer = (port) => {
        server.listen(port, '0.0.0.0', () => {
            console.log(`✅ Server started on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Socket.IO enabled`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Port ${port} is already in use. Trying port ${parseInt(port) + 1}...`);
                startServer(parseInt(port) + 1);
            } else {
                console.error('❌ HTTP server error:', err);
            }
        });
    };

    console.log('🚀 About to start server on port', PORT);
    startServer(PORT);
    
    console.log('✅ Server setup completed');

    // Graceful shutdown
    const shutdown = async (signal) => {
        try {
            console.log(`🔻 Received ${signal}. Shutting down gracefully...`);
            await new Promise(resolve => server.close(resolve));
            console.log('✅ HTTP server closed');
            process.exit(0);
        } catch (e) {
            console.error('❌ Error during shutdown:', e);
            process.exit(1);
        }
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Global listeners for unexpected crashes
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        // In development, we might not want to exit, but in production, we should
        if (process.env.NODE_ENV === 'production') {
            shutdown('unhandledRejection');
        }
    });

    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception thrown:', error);
        // Always shutdown on uncaughtException as the process is in an undefined state
        shutdown('uncaughtException');
    });

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}
