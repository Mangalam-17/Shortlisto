class BehaviorAnalysis {
    constructor() {
        this.isActive = false;
        this.mouseMovements = [];
        this.keystrokes = [];
        this.clicks = [];
        this.scrollEvents = [];
        this.faceDetections = [];
        this.startTime = null;
        this.analysisInterval = null;
        this.callbacks = {
            onSuspiciousBehavior: null,
            onAnalysisUpdate: null
        };
        this.thresholds = {
            rapidClicks: 10, // clicks per second
            rapidTyping: 20, // keystrokes per second
            inactivityTime: 30000, // 30 seconds
            unusualMousePattern: 500, // pixels movement threshold
            faceAwayTime: 5000 // 5 seconds
        };

        // Store bound event handlers for reliable removal
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleWindowBlur = this.handleWindowBlur.bind(this);
        this.boundHandleWindowFocus = this.handleWindowFocus.bind(this);
    }

    // Initialize behavior analysis
    initialize(config = {}) {
        this.thresholds = { ...this.thresholds, ...config };
        this.isActive = true;
        this.startTime = Date.now();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start analysis interval
        this.startAnalysis();
    }

    // Setup event listeners
    setupEventListeners() {
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('click', this.boundHandleClick);
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('scroll', this.boundHandleScroll);
        window.addEventListener('blur', this.boundHandleWindowBlur);
        window.addEventListener('focus', this.boundHandleWindowFocus);
    }

    // Handle mouse movement
    handleMouseMove(event) {
        if (!this.isActive) return;
        
        const movement = {
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
            screenX: event.screenX,
            screenY: event.screenY
        };
        
        this.mouseMovements.push(movement);
        
        // Keep only last 100 movements
        if (this.mouseMovements.length > 100) {
            this.mouseMovements.shift();
        }
    }

    // Handle clicks
    handleClick(event) {
        if (!this.isActive) return;
        
        const click = {
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
            target: event.target.tagName,
            button: event.button
        };
        
        this.clicks.push(click);
        
        // Keep only last 50 clicks
        if (this.clicks.length > 50) {
            this.clicks.shift();
        }
    }

    // Handle keyboard
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        const keystroke = {
            key: event.key,
            code: event.code,
            timestamp: Date.now(),
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
        };
        
        this.keystrokes.push(keystroke);
        
        // Keep only last 100 keystrokes
        if (this.keystrokes.length > 100) {
            this.keystrokes.shift();
        }
    }

    // Handle scroll
    handleScroll(event) {
        if (!this.isActive) return;
        
        const scroll = {
            x: window.scrollX,
            y: window.scrollY,
            timestamp: Date.now(),
            target: event.target.tagName
        };
        
        this.scrollEvents.push(scroll);
        
        // Keep only last 20 scroll events
        if (this.scrollEvents.length > 20) {
            this.scrollEvents.shift();
        }
    }

    // Handle window blur
    handleWindowBlur() {
        if (!this.isActive) return;
        
        this.detectSuspiciousBehavior('window_blur', 'Window lost focus - possible tab switching');
    }

    // Handle window focus
    handleWindowFocus() {
        if (!this.isActive) return;
        
        // Check how long window was unfocused
        const now = Date.now();
        const timeSinceLastActivity = now - this.getLastActivityTime();
        
        if (timeSinceLastActivity > this.thresholds.inactivityTime) {
            this.detectSuspiciousBehavior('prolonged_inactivity', 
                `Window inactive for ${Math.round(timeSinceLastActivity / 1000)} seconds`);
        }
    }

    // Get last activity time
    getLastActivityTime() {
        const allEvents = [
            ...this.mouseMovements.map(m => m.timestamp),
            ...this.clicks.map(c => c.timestamp),
            ...this.keystrokes.map(k => k.timestamp),
            ...this.scrollEvents.map(s => s.timestamp)
        ];
        
        return allEvents.length > 0 ? Math.max(...allEvents) : this.startTime;
    }

    // Start analysis
    startAnalysis() {
        this.analysisInterval = setInterval(() => {
            this.analyzeBehavior();
        }, 5000); // Analyze every 5 seconds
    }

    // Analyze behavior patterns
    analyzeBehavior() {
        if (!this.isActive) return;
        
        const now = Date.now();
        const analysis = {
            timestamp: now,
            sessionDuration: now - this.startTime,
            suspiciousActivities: []
        };

        // Analyze rapid clicking
        const rapidClicks = this.analyzeRapidClicks(now);
        if (rapidClicks.suspicious) {
            analysis.suspiciousActivities.push(rapidClicks);
        }

        // Analyze rapid typing
        const rapidTyping = this.analyzeRapidTyping(now);
        if (rapidTyping.suspicious) {
            analysis.suspiciousActivities.push(rapidTyping);
        }

        // Analyze inactivity
        const inactivity = this.analyzeInactivity(now);
        if (inactivity.suspicious) {
            analysis.suspiciousActivities.push(inactivity);
        }

        // Analyze mouse patterns
        const mousePattern = this.analyzeMousePattern();
        if (mousePattern.suspicious) {
            analysis.suspiciousActivities.push(mousePattern);
        }

        // Analyze keystroke patterns
        const keystrokePattern = this.analyzeKeystrokePattern();
        if (keystrokePattern.suspicious) {
            analysis.suspiciousActivities.push(keystrokePattern);
        }

        // Send analysis update
        if (this.callbacks.onAnalysisUpdate) {
            this.callbacks.onAnalysisUpdate(analysis);
        }

        // Report suspicious activities
        analysis.suspiciousActivities.forEach(activity => {
            this.detectSuspiciousBehavior(activity.type, activity.message, activity.severity);
        });
    }

    // Analyze rapid clicking
    analyzeRapidClicks(now) {
        const recentClicks = this.clicks.filter(click => 
            now - click.timestamp < 1000 // Last 1 second
        );

        if (recentClicks.length > this.thresholds.rapidClicks) {
            return {
                type: 'rapid_clicking',
                suspicious: true,
                severity: 'medium',
                message: `Rapid clicking detected: ${recentClicks.length} clicks in 1 second`,
                data: { clicks: recentClicks.length, threshold: this.thresholds.rapidClicks }
            };
        }

        return { type: 'rapid_clicking', suspicious: false };
    }

    // Analyze rapid typing
    analyzeRapidTyping(now) {
        const recentKeystrokes = this.keystrokes.filter(keystroke => 
            now - keystroke.timestamp < 1000 // Last 1 second
        );

        if (recentKeystrokes.length > this.thresholds.rapidTyping) {
            return {
                type: 'rapid_typing',
                suspicious: true,
                severity: 'medium',
                message: `Rapid typing detected: ${recentKeystrokes.length} keystrokes in 1 second`,
                data: { keystrokes: recentKeystrokes.length, threshold: this.thresholds.rapidTyping }
            };
        }

        return { type: 'rapid_typing', suspicious: false };
    }

    // Analyze inactivity
    analyzeInactivity(now) {
        const lastActivity = this.getLastActivityTime();
        const inactivityDuration = now - lastActivity;

        if (inactivityDuration > this.thresholds.inactivityTime) {
            return {
                type: 'prolonged_inactivity',
                suspicious: true,
                severity: 'low',
                message: `Prolonged inactivity: ${Math.round(inactivityDuration / 1000)} seconds`,
                data: { duration: inactivityDuration, threshold: this.thresholds.inactivityTime }
            };
        }

        return { type: 'prolonged_inactivity', suspicious: false };
    }

    // Analyze mouse patterns
    analyzeMousePattern() {
        if (this.mouseMovements.length < 10) {
            return { type: 'mouse_pattern', suspicious: false };
        }

        // Check for linear mouse movement (possible bot)
        const recentMovements = this.mouseMovements.slice(-20);
        let linearMovements = 0;
        
        for (let i = 1; i < recentMovements.length; i++) {
            const prev = recentMovements[i - 1];
            const curr = recentMovements[i];
            
            // Check if movement is too linear
            const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            
            if (distance > this.thresholds.unusualMousePattern) {
                linearMovements++;
            }
        }

        if (linearMovements > recentMovements.length * 0.7) {
            return {
                type: 'unusual_mouse_pattern',
                suspicious: true,
                severity: 'high',
                message: 'Unusual mouse movement pattern detected',
                data: { linearMovements, total: recentMovements.length }
            };
        }

        return { type: 'mouse_pattern', suspicious: false };
    }

    // Analyze keystroke patterns
    analyzeKeystrokePattern() {
        if (this.keystrokes.length < 10) {
            return { type: 'keystroke_pattern', suspicious: false };
        }

        const recentKeystrokes = this.keystrokes.slice(-50);
        
        // Check for repeated patterns
        const patterns = {};
        recentKeystrokes.forEach(keystroke => {
            const pattern = `${keystroke.ctrlKey ? 'Ctrl+' : ''}${keystroke.altKey ? 'Alt+' : ''}${keystroke.key}`;
            patterns[pattern] = (patterns[pattern] || 0) + 1;
        });

        // Check for suspicious patterns (like Ctrl+C, Ctrl+V)
        const suspiciousPatterns = ['Ctrl+c', 'Ctrl+v', 'Ctrl+x', 'F12', 'Alt+Tab'];
        const foundSuspicious = Object.keys(patterns).filter(pattern => 
            suspiciousPatterns.some(sp => pattern.toLowerCase().includes(sp.toLowerCase()))
        );

        if (foundSuspicious.length > 0) {
            return {
                type: 'suspicious_keystrokes',
                suspicious: true,
                severity: 'high',
                message: `Suspicious keystroke patterns detected: ${foundSuspicious.join(', ')}`,
                data: { patterns: foundSuspicious }
            };
        }

        return { type: 'keystroke_pattern', suspicious: false };
    }

    // Detect suspicious behavior
    detectSuspiciousBehavior(type, message, severity = 'medium') {
        const suspiciousActivity = {
            type,
            message,
            severity,
            timestamp: Date.now()
        };

        if (this.callbacks.onSuspiciousBehavior) {
            this.callbacks.onSuspiciousBehavior(suspiciousActivity);
        }

        console.warn('Suspicious behavior detected:', suspiciousActivity);
    }

    // Analyze face detection (if webcam is available)
    analyzeFaceDetection(faceData) {
        if (!this.isActive) return;

        const detection = {
            timestamp: Date.now(),
            faces: faceData.faces || [],
            faceAway: faceData.faceAway || false,
            multipleFaces: (faceData.faces || []).length > 1,
            noFace: (faceData.faces || []).length === 0
        };

        this.faceDetections.push(detection);

        // Keep only last 20 detections
        if (this.faceDetections.length > 20) {
            this.faceDetections.shift();
        }

        // Check for suspicious face activity
        if (detection.multipleFaces) {
            this.detectSuspiciousBehavior('multiple_faces', 
                `Multiple faces detected: ${detection.faces.length}`, 'high');
        }

        if (detection.noFace) {
            this.detectSuspiciousBehavior('no_face', 
                'No face detected in camera view', 'medium');
        }

        if (detection.faceAway) {
            this.detectSuspiciousBehavior('face_away', 
                'Face turned away from camera', 'medium');
        }
    }

    // Set callbacks
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Get behavior summary
    getBehaviorSummary() {
        const now = Date.now();
        const sessionDuration = now - this.startTime;

        return {
            sessionDuration,
            totalMouseMovements: this.mouseMovements.length,
            totalClicks: this.clicks.length,
            totalKeystrokes: this.keystrokes.length,
            totalScrollEvents: this.scrollEvents.length,
            faceDetections: this.faceDetections.length,
            lastActivity: this.getLastActivityTime(),
            isActive: this.isActive
        };
    }

    // Stop behavior analysis
    stop() {
        this.isActive = false;
        
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }

        // Remove event listeners using the same bound references
        document.removeEventListener('mousemove', this.boundHandleMouseMove);
        document.removeEventListener('click', this.boundHandleClick);
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('scroll', this.boundHandleScroll);
        window.removeEventListener('blur', this.boundHandleWindowBlur);
        window.removeEventListener('focus', this.boundHandleWindowFocus);

        console.log('Behavior analysis stopped');
    }

    // Clear data
    clearData() {
        this.mouseMovements = [];
        this.keystrokes = [];
        this.clicks = [];
        this.scrollEvents = [];
        this.faceDetections = [];
        this.startTime = Date.now();
    }
}

export default BehaviorAnalysis;
