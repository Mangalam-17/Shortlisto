#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

/**
 * Startup Validation Script
 * Ensures all critical components are working before starting server
 */

const logger = require('../utils/logger');
const cacheManager = require('../utils/cache/cacheManager');
const queueManager = require('../utils/queue/queueManager');

class StartupValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate environment variables
     */
    validateEnvironment() {
        logger.info('Validating environment variables...');
        
        const requiredVars = ['JWT_SECRET', 'MONGO_URI'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            // In development, warn instead of error for missing optional vars
            if (process.env.NODE_ENV === 'development') {
                this.warnings.push(`Missing environment variables: ${missingVars.join(', ')}`);
            } else {
                this.errors.push(`Missing required environment variables: ${missingVars.join(', ')}`);
            }
        }
        
        // SMTP is configured via database; no email credentials are expected in environment
        
        // Removed Redis check as we migrated to node-cache
        
        logger.info('Environment validation completed');
    }

    /**
     * Validate cache connectivity
     */
    async validateCache() {
        logger.info('Validating cache connectivity...');
        
        try {
            // Test cache operations (using memoryCache which is node-cache)
            const testKey = 'startup-test';
            const testVal = { timestamp: Date.now() };
            
            await cacheManager.set(testKey, testVal, 60);
            const retrieved = await cacheManager.get(testKey);
            
            if (!retrieved || retrieved.timestamp !== testVal.timestamp) {
                this.warnings.push('Cache validation failed - memory cache not responding correctly');
            } else {
                logger.info('Cache validation passed');
            }
            
            // Cleanup test key
            await cacheManager.del(testKey);
        } catch (error) {
            this.warnings.push(`Cache validation error: ${error.message}`);
        }
    }

    /**
     * Validate queue connectivity
     */
    async validateQueues() {
        logger.info('Validating queue connectivity...');
        
        try {
            // Test queue creation (now using local memory queue)
            const testQueue = queueManager.createQueue('startup-test');
            
            if (!testQueue) {
                this.warnings.push('Queue creation failed');
            } else {
                logger.info('Queue validation passed');
            }
        } catch (error) {
            this.warnings.push(`Queue validation error: ${error.message}`);
        }
    }

    /**
     * Validate database configuration
     */
    async validateDatabase() {
        logger.info('Validating database configuration...');
        
        try {
            if (!process.env.MONGO_URI) {
                this.errors.push('MONGO_URI is not defined in environment');
                return;
            }

            // Check if URI is valid format
            if (!process.env.MONGO_URI.startsWith('mongodb')) {
                this.errors.push('Invalid MONGO_URI format');
            } else {
                logger.info('Database configuration validation passed');
            }
        } catch (error) {
            this.warnings.push(`Database validation error: ${error.message}`);
        }
    }

    /**
     * Validate critical directories
     */
    validateDirectories() {
        logger.info('Validating critical directories...');
        
        const fs = require('fs');
        const path = require('path');
        
        const requiredDirs = ['logs'];
        
        requiredDirs.forEach(dir => {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
                try {
                    fs.mkdirSync(dirPath, { recursive: true });
                    logger.info(`Created directory: ${dir}`);
                } catch (error) {
                    this.errors.push(`Failed to create directory ${dir}: ${error.message}`);
                }
            }
        });
        
        logger.info('Directory validation completed');
    }

    /**
     * Validate security configuration
     */
    validateSecurity() {
        logger.info('Validating security configuration...');
        
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
            this.warnings.push('JWT_SECRET should be at least 32 characters for security');
        }
        
        if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your-secret-key') {
            this.errors.push('Default JWT secret detected in production - this is a security risk');
        }
        
        logger.info('Security validation completed');
    }

    /**
     * Run all validations
     */
    async runAll() {
        logger.info('Starting startup validation...');
        
        this.validateEnvironment();
        this.validateDirectories();
        this.validateSecurity();
        
        await Promise.all([
            this.validateCache(),
            this.validateQueues(),
            this.validateDatabase()
        ]);
        
        // Report results
        console.log('\n=== STARTUP VALIDATION RESULTS ===');
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('\n✅ All validations passed!');
        }
        
        console.log('=====================================\n');
        
        return {
            success: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new StartupValidator();
    validator.runAll()
        .then(results => {
            if (!results.success) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Validation failed:', error);
            process.exit(1);
        });
}

module.exports = StartupValidator;
