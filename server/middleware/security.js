/**
 * Security Middleware for MongoDB sanitization and rate limiting
 */
class SecurityMiddleware {
    /**
     * Create MongoDB sanitization middleware
     * @returns {Function} - Express middleware
     */
    static mongoSanitize() {
        return (req, res, next) => {
            const options = {
                replaceWith: '_'
            };

            // Recursively sanitize objects without reassigning the root properties if they are read-only
            const sanitize = (obj) => {
                if (obj && typeof obj === 'object') {
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        if (key.startsWith('$') || key.includes('.')) {
                            const newKey = key.replace(/[\$.]/g, '_');
                            obj[newKey] = value;
                            delete obj[key];
                        }
                        if (value && typeof value === 'object') {
                            sanitize(value);
                        }
                    });
                }
            };

            if (req.body) sanitize(req.body);
            if (req.query) sanitize(req.query);
            if (req.params) sanitize(req.params);

            next();
        };
    }

    /**
     * Create login rate limiting middleware (Disabled)
     * @returns {Function} - Express middleware
     */
    static loginRateLimit() {
        return (req, res, next) => next();
    }

    /**
     * Create Assessment specific rate limiting middleware (Disabled)
     * @returns {Function} - Express middleware
     */
    static assessmentRateLimit() {
        return (req, res, next) => next();
    }

    /**
     * Create API rate limiting middleware (Disabled)
     * @returns {Function} - Express middleware
     */
    static apiRateLimit() {
        return (req, res, next) => next();
    }

    /**
     * Create request size limiter middleware
     * @param {Object} options - Size limit options
     * @returns {Function} - Express middleware
     */
    static requestSizeLimit(options = {}) {
        const {
            maxRequestBodySize = '10mb',
            maxRequestSize = '10mb'
        } = options;

        return (req, res, next) => {
            // Check Content-Length header
            const contentLength = req.get('content-length');
            if (contentLength && parseInt(contentLength) > this.parseSize(maxRequestBodySize)) {
                return res.status(413).json({
                    error: 'Request entity too large',
                    message: `Request size exceeds limit of ${maxRequestBodySize}`
                });
            }

            // Check URL length
            if (req.url && req.url.length > 2048) { // 2KB URL limit
                return res.status(414).json({
                    error: 'Request-URI Too Long',
                    message: 'URL length exceeds maximum allowed length'
                });
            }

            next();
        };
    }

    /**
     * Parse size string to bytes
     * @param {string} sizeStr - Size string (e.g., '10mb')
     * @returns {number} - Size in bytes
     */
    static parseSize(sizeStr) {
        const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
        const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
        
        if (!match) {
            return 1024 * 1024; // Default to 1MB
        }
        
        const size = parseFloat(match[1]);
        const unit = match[2];
        return Math.floor(size * units[unit]);
    }

    /**
     * Create security headers middleware
     * @returns {Function} - Express middleware
     */
    static securityHeaders() {
        return (req, res, next) => {
            // Remove server information
            res.removeHeader('X-Powered-By');
            
            // Prevent MIME type sniffing
            res.setHeader('X-Content-Type-Options', 'nosniff');
            
            // Prevent clickjacking
            res.setHeader('X-Frame-Options', 'DENY');
            
            // Enable XSS protection
            res.setHeader('X-XSS-Protection', '1; mode=block');
            
            // Referrer Policy
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

            // Permissions Policy
            res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), interest-cohort=()');

            // Force HTTPS in production
            if (process.env.NODE_ENV === 'production') {
                res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            }
            
            // Content Security Policy
            res.setHeader('Content-Security-Policy', 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: https: blob:; " +
                "connect-src 'self' wss: ws: https: http:; " +
                "worker-src 'self' blob:; " +
                "frame-ancestors 'none'; " +
                "form-action 'self'; " +
                "base-uri 'self';"
            );
            
            next();
        };
    }

    /**
     * Create IP whitelist middleware
     * @param {Array} whitelist - Array of allowed IPs
     * @returns {Function} - Express middleware
     */
    static ipWhitelist(whitelist = []) {
        return (req, res, next) => {
            if (whitelist.length === 0) {
                return next();
            }

            const clientIp = req.ip || 
                           req.connection.remoteAddress || 
                           req.socket.remoteAddress ||
                           (req.connection.socket ? req.connection.socket.remoteAddress : null);

            if (clientIp && whitelist.includes(clientIp)) {
                return next();
            }

            console.warn(`🚨 Unauthorized access attempt from IP: ${clientIp}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address is not authorized to access this resource'
            });
        };
    }
}

module.exports = SecurityMiddleware;
