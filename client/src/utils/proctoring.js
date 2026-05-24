class ProctoringSystem {
    constructor() {
        this.isActive = false;
        this.warnings = 0;
        this.maxWarnings = 5;
        this.eventLog = [];
        this.videoStream = null;
        this.isRecording = false;
        this.screenshots = [];
        this.tabSwitchCount = 0;
        this.fullscreenExitCount = 0;
        this.mouseLeaveCount = 0;
        this.lastEventTime = {};
        this.tabSwitchStartTime = null;
        this.tabSwitchTotalTime = 0;
        this.tabSwitches = []; // Track individual tab switches
        this.callbacks = {
            onWarning: null,
            onViolation: null,
            onTerminate: null,
            onFullscreenToggle: null
        };
        this.tabViolationTimer = null;
        this.tabViolationThreshold = 5000; // 5 seconds

        // Store bound versions of event handlers for reliable removal
        this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
        this.boundFullscreenChange = this.handleFullscreenChange.bind(this);
    }

    // Initialize proctoring system
    async initialize(config = {}) {
        this.maxWarnings = config.maxWarnings || 5;
        this.isActive = true;

        // Setup event listeners
        this.setupEventListeners();

        // Initialize webcam monitoring
        if (config.enableWebcam) {
            await this.initializeWebcam();
        }

        // Initialize screen monitoring
        if (config.enableScreenMonitoring) {
            this.initializeScreenMonitoring();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Tab switching detection
        document.addEventListener('visibilitychange', this.boundVisibilityChange);

        // Fullscreen detection
        document.addEventListener('fullscreenchange', this.boundFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.boundFullscreenChange);
        document.addEventListener('mozfullscreenchange', this.boundFullscreenChange);

        // Dev tools detection - just for logging, not violations
        this.detectDevTools();
    }

    // Handle visibility change (tab switching)
    handleVisibilityChange() {
        if (document.hidden) {
            // Tab switched away - start grace period timer
            this.logEvent('tab_hidden', 'Tab hidden (5s grace period started)');

            // Clear any existing timer just in case
            if (this.tabViolationTimer) clearTimeout(this.tabViolationTimer);

            this.tabViolationTimer = setTimeout(() => {
                this.tabSwitchCount++;
                const totalViolations = this.tabSwitchCount + this.fullscreenExitCount;
                this.logEvent('tab_switch_violation', `Tab violation detected - away for >5s (${totalViolations}/3)`);

                if (totalViolations >= 3) {
                    this.terminate();
                } else if (this.callbacks.onWarning) {
                    this.callbacks.onWarning({
                        type: 'tab_switch',
                        message: `Tab switch violation (stayed away >5s). ${this.maxWarnings - totalViolations} warning(s) remaining.`,
                        timestamp: new Date(),
                        warningCount: totalViolations,
                        tabSwitchCount: this.tabSwitchCount,
                        fullscreenExitCount: this.fullscreenExitCount
                    });
                }
                this.tabViolationTimer = null;
            }, this.tabViolationThreshold);
        } else {
            // Tab returned
            if (this.tabViolationTimer) {
                this.logEvent('tab_visible', 'Tab returned within grace period');
                clearTimeout(this.tabViolationTimer);
                this.tabViolationTimer = null;
            } else {
                this.logEvent('tab_visible', 'Tab returned after violation');
            }
        }
    }

    // Handle fullscreen change
    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);

        // Notify UI for overlay state
        if (this.callbacks.onFullscreenToggle) {
            this.callbacks.onFullscreenToggle(isFullscreen);
        }

        if (!isFullscreen) {
            this.fullscreenExitCount++;
            const totalViolations = this.tabSwitchCount + this.fullscreenExitCount;
            this.logEvent('fullscreen_exit', `Fullscreen mode exited (${totalViolations}/${this.maxWarnings})`);

            if (totalViolations >= this.maxWarnings) {
                this.terminate('Too many violations. Assessment terminated.');
            } else if (this.callbacks.onWarning) {
                this.callbacks.onWarning({
                    type: 'fullscreen_exit',
                    message: `Fullscreen exited. ${this.maxWarnings - totalViolations} warning(s) remaining.`,
                    timestamp: new Date(),
                    warningCount: totalViolations
                });
            }
        } else {
            this.logEvent('fullscreen_enter', 'Fullscreen mode entered');
        }
    }

    // Force fullscreen
    async forceFullscreen() {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                await elem.mozRequestFullScreen();
            }
        } catch (error) {
            console.error('Failed to force fullscreen:', error);
        }
    }

    // Handle mouse leave — log only, not a violation
    handleMouseLeave() {
        this.logEvent('mouse_leave', 'Mouse left window');
        this.mouseLeaveCount++;
    }

    // Handle mouse enter
    handleMouseEnter() {
        this.logEvent('mouse_enter', 'Mouse entered window');
    }

    // Handle window blur — log only, not a violation
    handleWindowBlur() {
        this.logEvent('window_blur', 'Window lost focus');
    }

    // Handle window focus
    handleWindowFocus() {
        this.logEvent('window_focus', 'Window gained focus');
    }

    // Handle keyboard shortcuts
    handleKeyDown(event) {
        const suspiciousKeys = [
            'F12', 'Alt', 'Control', 'Meta', 'Escape',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'
        ];

        if (suspiciousKeys.includes(event.key) ||
            (event.ctrlKey && (event.key === 'r' || event.key === 't' || event.key === 'n')) ||
            (event.altKey && event.key === 'Tab')) {

            this.logEvent('suspicious_key', `Suspicious key combination: ${event.key} (Ctrl: ${event.ctrlKey}, Alt: ${event.altKey})`);

            // Prevent certain actions but don't count as violation
            if (event.key === 'F12' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
            }
        }
    }

    // Handle copy/paste — log only, prevent action but don't count as violation
    handleCopy(event) {
        this.logEvent('copy_attempt', 'Copy attempt detected');
        event.preventDefault();
    }

    handlePaste(event) {
        this.logEvent('paste_attempt', 'Paste attempt detected');
        event.preventDefault();
    }

    handleCut(event) {
        this.logEvent('cut_attempt', 'Cut attempt detected');
        event.preventDefault();
    }

    // Handle context menu — log only, not a violation
    handleContextMenu(event) {
        this.logEvent('context_menu', 'Right-click attempt');
        event.preventDefault();
    }

    // Dev tools detection
    detectDevTools() {
        let devtools = {
            open: false,
            orientation: null
        };

        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logEvent('devtools_open', 'Developer tools opened');
                    this.handleViolation('devtools', 'Developer tools detected');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    // Initialize webcam monitoring
    async initializeWebcam() {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            // Create video element for monitoring
            const video = document.createElement('video');
            video.srcObject = this.videoStream;
            video.autoplay = true;
            video.muted = true;
            video.style.display = 'none';
            document.body.appendChild(video);

            // Start periodic screenshots
            this.startWebcamMonitoring(video);

        } catch (error) {
            console.error('Webcam access denied:', error);
            this.logEvent('webcam_denied', 'Webcam access denied');
            this.handleViolation('webcam_denied', 'Webcam access required');
        }
    }

    // Start webcam monitoring
    startWebcamMonitoring(video) {
        setInterval(() => {
            if (this.isActive && this.videoStream) {
                this.captureWebcamScreenshot(video);
            }
        }, 30000); // Capture every 30 seconds
    }

    // Capture webcam screenshot
    captureWebcamScreenshot(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.3);
        this.screenshots.push({
            timestamp: new Date(),
            type: 'webcam',
            data: imageData
        });

        // Keep only last 10 screenshots
        if (this.screenshots.length > 10) {
            this.screenshots.shift();
        }
    }

    // Initialize screen monitoring
    initializeScreenMonitoring() {
        // Monitor for screen recording software
        this.detectScreenRecording();

        // Monitor display changes
        this.detectDisplayChanges();
    }

    // Detect screen recording
    detectScreenRecording() {
        // Check for common screen recording indicators
        const checkRecording = () => {
            // Check if multiple displays (could indicate screen sharing)
            if (window.screen.height !== window.screen.availHeight ||
                window.screen.width !== window.screen.availWidth) {
                this.logEvent('screen_change', 'Screen dimensions changed');
            }
        };

        setInterval(checkRecording, 5000);
    }

    // Detect display changes — log only, not a violation
    detectDisplayChanges() {
        window.addEventListener('resize', () => {
            this.logEvent('window_resize', `Window resized to ${window.innerWidth}x${window.innerHeight}`);
        });
    }

    // Handle violations
    handleViolation(type, message) {
        this.warnings++;

        const violation = {
            type,
            message,
            timestamp: new Date(),
            warningCount: this.warnings
        };

        this.eventLog.push(violation);

        // Call warning callback
        if (this.callbacks.onWarning) {
            this.callbacks.onWarning(violation);
        }

        // Check if should terminate
        if (this.warnings >= this.maxWarnings) {
            this.terminate();
        }
    }

    // Log events
    logEvent(type, details) {
        const event = {
            type,
            details,
            timestamp: new Date()
        };

        this.eventLog.push(event);
        console.log('Proctoring event:', event);
    }

    // Terminate assessment
    terminate(reasonMsg = 'Violations limit exceeded') {
        if (!this.isActive) return; // Prevent multiple terminations

        this.isActive = false;

        // Stop webcam
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }

        // Remove event listeners
        this.removeEventListeners();

        // Call termination callback with violation details
        if (this.callbacks.onTerminate) {
            this.callbacks.onTerminate({
                reason: reasonMsg,
                warnings: this.warnings,
                tabSwitchCount: this.tabSwitchCount,
                fullscreenExitCount: this.fullscreenExitCount,
                totalViolations: this.warnings + this.tabSwitchCount + this.fullscreenExitCount,
                events: this.eventLog,
                screenshots: this.screenshots
            });
        }
    }

    // Remove event listeners
    removeEventListeners() {
        document.removeEventListener('visibilitychange', this.boundVisibilityChange);
        document.removeEventListener('fullscreenchange', this.boundFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.boundFullscreenChange);
        document.removeEventListener('mozfullscreenchange', this.boundFullscreenChange);
    }

    // Get proctoring data
    getProctoringData() {
        return {
            warnings: this.warnings,
            maxWarnings: this.maxWarnings,
            events: this.eventLog,
            screenshots: this.screenshots,
            tabSwitchCount: this.tabSwitchCount,
            fullscreenExitCount: this.fullscreenExitCount,
            mouseLeaveCount: this.mouseLeaveCount,
            isActive: this.isActive
        };
    }

    // Set callbacks
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Stop proctoring
    stop() {
        this.isActive = false;
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
        this.removeEventListeners();
    }
}

export default ProctoringSystem;
