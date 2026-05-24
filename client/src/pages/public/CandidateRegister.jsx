import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    User, Mail, Phone, BookOpen, GraduationCap, School, Briefcase,
    Code, Link2, Linkedin, MapPin, Calendar, Shield, Check,
    ChevronRight, ChevronLeft, AlertCircle, Clock, Save, CheckCircle,
    Settings2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const CandidateRegister = () => {
    const { driveId } = useParams();
    const navigate = useNavigate();
    const [isWhatsAppSame, setIsWhatsAppSame] = useState(false);
    const [drive, setDrive] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [progress, setProgress] = useState(0);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [formData, setFormData] = useState({});

    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [driveExpired, setDriveExpired] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otp, setOtp] = useState('');



    // Education levels
    const educationLevels = [
        'Undergraduate', 'Postgraduate'
    ];

    const studyYears = ['1st', '2nd', '3rd', '4th'];
    const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const states = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    const technicalSkillsOptions = [
        'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'HTML/CSS',
        'SQL', 'MongoDB', 'Git', 'AWS', 'Docker', 'Machine Learning', 'Data Analysis'
    ];

    const getFieldIcon = (fieldId, type) => {
        const iconMap = {
            fullName: <User className="w-4 h-4 mr-2" />,
            name: <User className="w-4 h-4 mr-2" />,
            email: <Mail className="w-4 h-4 mr-2" />,
            personalEmail: <Mail className="w-4 h-4 mr-2" />,
            phone: <Phone className="w-4 h-4 mr-2" />,
            whatsapp: <Phone className="text-green-500 w-4 h-4 mr-2" />,
            educationLevel: <GraduationCap className="w-4 h-4 mr-2" />,
            university: <School className="w-4 h-4 mr-2" />,
            workExperience: <Briefcase className="w-4 h-4 mr-2" />,
            currentCompany: <Briefcase className="w-4 h-4 mr-2" />,
            currentRole: <User className="w-4 h-4 mr-2" />,
            noticePeriod: <Clock className="w-4 h-4 mr-2" />,
            city: <MapPin className="w-4 h-4 mr-2" />,
            state: <MapPin className="w-4 h-4 mr-2" />
        };
        if (iconMap[fieldId]) return iconMap[fieldId];
        if (type === 'select') return <BookOpen className="w-4 h-4 mr-2" />;
        return <AlertCircle className="w-4 h-4 mr-2" />;
    };

    const getFormSections = () => {
        if (!drive?.formSchema || !Array.isArray(drive.formSchema)) return [];
        const sections = [
            { id: 'personal', title: 'Personal Details', subtitle: 'Basic information', icon: User },
            { id: 'academic', title: 'Academic Profile', subtitle: 'Your education details', icon: GraduationCap },
            { id: 'professional', title: 'Professional History', subtitle: 'Experience and roles', icon: Briefcase },
            { id: 'skills', title: 'Skills & Extras', subtitle: 'Showcase your abilities', icon: Code },
            { id: 'custom', title: 'Additional Details', subtitle: 'Specific drive questions', icon: Settings2 }
        ];

        const mapped = sections.map(s => {
            const fields = drive.formSchema.filter(f => {
                if (s.id === 'custom') {
                    // Custom section gets fields explicitly marked as 'custom' OR fields with NO section
                    return f.section === 'custom' || !f.section || !sections.some(sec => sec.id === f.section);
                }
                return f.section === s.id;
            });
            return { ...s, fields };
        });

        return mapped.filter(s => s.fields && s.fields.length > 0);
    };

    const formSections = getFormSections();
    // totalSteps = Dynamic Sections + 1 (Hardcoded Skills Step) + 1 (Review Step)
    const totalSteps = formSections.length + 2;

    useEffect(() => {
        const fetchDrive = async () => {
            try {
                const res = await api.get(`/drives/${driveId}`);
                setDrive(res.data);

                // Check if drive has expired
                if (res.data.endTime && new Date(res.data.endTime) < new Date()) {
                    setDriveExpired(true);
                    return;
                }

                // Try to load saved draft first
                const savedDraft = localStorage.getItem(`candidate_draft_${driveId}`);
                if (savedDraft) {
                    try {
                        const parsed = JSON.parse(savedDraft);
                        // Ensure university is always set from drive if draft is missing it
                        const mergedData = {
                            ...parsed.formData,
                            university: parsed.formData.university || res.data.university
                        };
                        setFormData(prev => ({ ...prev, ...mergedData }));
                        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                    } catch (e) {
                        console.error('Failed to parse draft', e);
                        // Fallback to university pre-fill
                        setFormData(prev => ({ ...prev, university: res.data.university }));
                    }
                } else {
                    // Pre-fill university from drive only if no draft exists
                    setFormData(prev => ({ ...prev, university: res.data.university }));
                }

                setIsInitialLoadComplete(true);
            } catch (err) {
                console.error('Fetch Drive Error:', err);
                const status = err.response?.status;
                if (status === 404) {
                    setError('Assessment Drive not found. Please check the URL.');
                } else if (status === 403) {
                    setError('You do not have permission to access this drive.');
                } else {
                    setError(err.response?.data?.msg || 'Unable to load registration form. Please try again later.');
                }
                setIsInitialLoadComplete(true); // Allow error screen to show
            }
        };
        fetchDrive();
    }, [driveId]);

    // Auto-save effect
    useEffect(() => {
        // Only save if initial load is complete and we are not in submitted state
        if (isInitialLoadComplete && driveId && !submitted) {
            localStorage.setItem(`candidate_draft_${driveId}`, JSON.stringify({
                formData,
                currentStep
            }));
        }
    }, [formData, currentStep, driveId, submitted, isInitialLoadComplete]);

    useEffect(() => {
        if (!drive?.formSchema) return;
        // Calculate progress based on schema-required fields
        const requiredFields = drive.formSchema
            .filter(f => f.required)
            .map(f => f.fieldId);
        
        // Add technical skills if it's considered mandatory (it is in our logic)
        requiredFields.push('technicalSkills');

        if (requiredFields.length === 0) {
            setProgress(0);
            return;
        }

        const filledFields = requiredFields.filter(field => {
            const val = formData[field];
            if (Array.isArray(val)) return val.length > 0;
            return val && val.toString().trim() !== '';
        });
        
        setProgress(Math.round((filledFields.length / requiredFields.length) * 100));
    }, [formData, drive?.formSchema]);

    const validateUrl = (url) => {
        if (!url) return true; // Empty URL is valid
        // More permissive URL validation - just check if it starts with http/https or is a valid format
        const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
        return urlPattern.test(url);
    };

    const handleWhatsAppSyncToggle = (checked) => {
        setIsWhatsAppSame(checked);
        if (checked) {
            const phoneVal = formData.phone || formData.contact || '';
            setFormData(prev => ({ ...prev, whatsapp: phoneVal }));
            if (errors.whatsapp) setErrors(prev => ({ ...prev, whatsapp: '' }));
        }
    };

    const onChange = e => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Sync WhatsApp if option is enabled
            if (isWhatsAppSame && (name === 'phone' || name === 'contact')) {
                next.whatsapp = value;
            }
            return next;
        });

        // Real-time validation for specific fields
        const fieldError = validateField(name, value);

        // Only show error immediately for certain fields or if an error already exists
        const showInstantly = ['personalEmail', 'phone', 'academicPerformance'].includes(name) || !!errors[name];

        if (showInstantly) {
            setErrors(prev => ({ ...prev, [name]: fieldError }));
        } else if (errors[name] && !fieldError) {
            // Clear error if it's now valid
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateField = (name, value) => {
        if (!drive?.formSchema) return '';
        const field = drive.formSchema.find(f => f.fieldId === name);
        if (!field) {
            // Handle hardcoded fields like technicalSkills
            if (name === 'technicalSkills' && (!value || value.length === 0)) {
                return 'Please select at least one skill';
            }
            return '';
        }

        if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
            return `${field.label} is required`;
        }

        if (value) {
            switch (field.type) {
                case 'email':
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return 'Invalid email address';
                    }
                    break;
                case 'phone':
                    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s()-]/g, ''))) {
                        return 'Invalid phone number';
                    }
                    break;
                case 'number':
                case 'cgpa':
                    const num = parseFloat(value);
                    if (isNaN(num)) return 'Must be a number';
                    
                    // Specific logic for CGPA
                    if (field.type === 'cgpa' || field.fieldId === 'cgpa') {
                        if (num < 1 || num > 10) return 'CGPA must be between 1 and 10';
                    }

                    if (field.validation) {
                        if (field.validation.min !== undefined && num < field.validation.min) return `Minimum value is ${field.validation.min}`;
                        if (field.validation.max !== undefined && num > field.validation.max) return `Maximum value is ${field.validation.max}`;
                    }
                    break;
                case 'url':
                    if (!validateUrl(value)) return 'Invalid URL format';
                    break;
                case 'text':
                case 'textarea':
                    if (field.validation) {
                        if (field.validation.min !== undefined && value.length < field.validation.min) return `Minimum ${field.validation.min} characters required`;
                        if (field.validation.max !== undefined && value.length > field.validation.max) return `Maximum ${field.validation.max} characters allowed`;
                    }
                    break;
            }
        }
        return '';
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const fieldError = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: fieldError }));
    };

    const validateStep = (step) => {
        // Special handling for hardcoded steps (Skills, Review)
        if (step === totalSteps - 1) { // Skills step
            const error = validateField('technicalSkills', formData.technicalSkills);
            if (error) {
                setErrors({ technicalSkills: error });
                return false;
            }
            return true;
        }
        
        if (step === totalSteps) { // Review step
            return true;
        }

        const section = formSections[step - 1];
        if (!section) return true;

        const newErrors = {};
        section.fields.forEach(field => {
            const error = validateField(field.fieldId, formData[field.fieldId]);
            if (error) newErrors[field.fieldId] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };



    const onSubmit = async e => {
        e.preventDefault();

        // Always validate current step first
        if (!validateStep(currentStep)) return;

        // If not on final step, move to next step
        if (currentStep < totalSteps) {
            nextStep();
            return;
        }

        // If on final step, submit the form
        try {
            // Map frontend fields to backend expectations
            // We explicitly extract core fields to avoid schema pollution from ...formData
            const submissionData = {
                email: formData.email || formData.personalEmail,
                name: formData.fullName || formData.name,
                contact: formData.phone || formData.contact,
                whatsapp: formData.whatsapp || (isWhatsAppSame ? (formData.phone || formData.contact) : ''),
                university: formData.university || drive?.university,
                educationLevel: formData.educationLevel,
                yearOfStudy: formData.yearOfStudy,
                semester: formData.semester ? Number(formData.semester) : undefined,
                expectedGraduationYear: formData.expectedGraduationYear ? Number(formData.expectedGraduationYear) : undefined,
                major: formData.major,
                academicPerformance: formData.academicPerformance || formData.cgpa,
                cgpa: formData.cgpa || formData.academicPerformance,
                backlogs: formData.backlogs,
                workExperience: formData.workExperience ? Number(formData.workExperience) : 0,
                currentCompany: formData.currentCompany,
                currentRole: formData.currentRole,
                noticePeriod: formData.noticePeriod,
                currentCTC: formData.currentCTC ? Number(formData.currentCTC) : undefined,
                expectedCTC: formData.expectedCTC ? Number(formData.expectedCTC) : undefined,
                technicalSkills: formData.technicalSkills || [],
                portfolioLink: formData.portfolioLink,
                linkedinProfile: formData.linkedinProfile,
                responses: { ...formData }, // Full map for dynamic fields
                driveId
            };

            // Fail-safe validation for CGPA range to avoid server 400 on legacy drives without schema validation
            if (submissionData.cgpa !== undefined && submissionData.cgpa !== null) {
                const cg = Number(submissionData.cgpa);
                if (isNaN(cg) || cg < 1 || cg > 10) {
                    setErrors(prev => ({ ...prev, cgpa: 'CGPA must be between 1 and 10' }));
                    setError('Please correct CGPA (1-10).');
                    return;
                }
                submissionData.cgpa = cg;
            }

            await api.post('/candidates/register', submissionData);

            // Clear local draft on success
            localStorage.removeItem(`candidate_draft_${driveId}`);

            setSubmitted(true);
            // Trigger celebration
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#E11D48', '#be123c', '#10b981']
            });
        } catch (err) {
            console.error('Registration error:', err);
            const serverMsg = err.response?.data?.msg;
            const serverErrors = err.response?.data?.errors;

            if (serverErrors && Array.isArray(serverErrors)) {
                // Map backend validation errors back to frontend fields if possible
                const newFieldErrors = {};
                serverErrors.forEach(e => {
                    const field = e.path || e.param || e; // Support both array/object formats
                    const msg = typeof e === 'string' ? e : e.msg;
                    
                    // Map backend field names to frontend if different
                    const fieldMap = {
                        'email': 'email',
                        'personalEmail': 'email',
                        'phone': 'phone',
                        'contact': 'phone'
                    };
                    const frontendField = fieldMap[field] || field;
                    newFieldErrors[frontendField] = msg;
                });
                
                setErrors(prev => ({ ...prev, ...newFieldErrors }));
                setError(`Please fix the errors in the form.`);
                
                // If there's a specific field we can jump to, we could, 
                // but for now just show a summary toast
                const combinedErrors = serverErrors.map(e => e.msg).join(', ');
                setError(`Please fix the errors: ${combinedErrors}`); // This is temporary, will be localized
            } else {
                setError(serverMsg || 'Registration Failed. Please try again.');
            }
            
            // Auto-clear the error message after 5 seconds so it doesn't stay forever
            setTimeout(() => setError(''), 5000);
        }
    };

    const renderStepHeader = () => {
        if (currentStep === totalSteps) {
            return (
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Shield className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Review & Confirm</h2>
                        <p className="text-white/80 text-sm">Final verification</p>
                    </div>
                </div>
            );
        }

        if (currentStep === totalSteps - 1) {
            return (
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Code className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Technical Skills</h2>
                        <p className="text-white/80 text-sm">Showcase your abilities</p>
                    </div>
                </div>
            );
        }

        const section = formSections[currentStep - 1];
        if (!section) return null;
        const Icon = section.icon || AlertCircle;

        return (
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Icon className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">{section?.title || 'Form Section'}</h2>
                    <p className="text-white/80 text-sm">{section?.subtitle || 'Please fill in the details'}</p>
                </div>
            </div>
        );
    };

    const renderField = (field) => {
        const { fieldId, label, type, required, options, placeholder } = field;
        const icon = getFieldIcon(fieldId, type);
        const isTouched = formData[fieldId] !== undefined && formData[fieldId] !== '';
        const isValid = isTouched && !errors[fieldId];

        const commonProps = {
            name: fieldId,
            value: formData[fieldId] || '',
            onChange,
            onBlur: handleBlur,
            className: `w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-[13px] font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:border-[#E11D48] focus:ring-4 focus:ring-[#E11D48]/10 transition-all duration-300 shadow-sm ${errors[fieldId] ? 'border-red-400' : 'hover:border-slate-300'}`,
            placeholder: placeholder || `Enter your ${label.toLowerCase()}`,
            required
        };

        return (
            <div key={fieldId} className="space-y-2.5 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                        <span className="text-[#E11D48]">{icon}</span>
                        {label} {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {isValid && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500">
                            <CheckCircle size={14} />
                        </motion.div>
                    )}
                </div>
                {type === 'select' ? (
                    <div className="relative">
                        <select {...commonProps} className={`${commonProps.className} appearance-none pr-10 cursor-pointer`}>
                            <option value="">Select {label}</option>
                            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight className="rotate-90" size={16} />
                        </div>
                    </div>
                ) : (
                    <input 
                        type={type === 'phone' ? 'tel' : (type || 'text')} 
                        {...commonProps} 
                        readOnly={fieldId === 'whatsapp' && isWhatsAppSame}
                        className={`${commonProps.className} ${fieldId === 'whatsapp' && isWhatsAppSame ? 'bg-gray-50 opacity-70 cursor-not-allowed border-dashed' : ''}`}
                    />
                )}
                {errors[fieldId] && (
                    <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center ml-1 animate-in shake-2">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                        {errors[fieldId]}
                    </p>
                )}
                {fieldId === 'whatsapp' && (
                    <div className="flex items-center space-x-2 ml-1 mt-1">
                        <input
                            type="checkbox"
                            id="waSync"
                            checked={isWhatsAppSame}
                            onChange={(e) => handleWhatsAppSyncToggle(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#E11D48] focus:ring-[#E11D48] cursor-pointer"
                        />
                        <label htmlFor="waSync" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-700 transition-colors">
                            Same as contact number
                        </label>
                    </div>
                )}
            </div>
        );
    };

    const renderReviewStep = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-4">
                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/50 mb-6">
                    <p className="text-[10px] font-bold text-[#E11D48] uppercase tracking-[0.2em] flex items-center">
                        <Shield className="w-3 h-3 mr-2" />
                        Final Data Verification
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1 italic">Please ensure all your details are correct before submitting your application.</p>
                </div>

                <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {formSections.map(section => (
                        <div key={section.id} className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                {React.createElement(section.icon, { className: "w-3.5 h-3.5 mr-2 opacity-70" })}
                                {section.title}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {section.fields.map(field => (
                                    <div key={field.fieldId} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-rose-100 transition-colors">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{field.label}</p>
                                        <p className="text-sm font-bold text-slate-800 break-words">{formData[field.fieldId] || <span className="text-slate-300 italic">Not provided</span>}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-3 pb-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                            <Code className="w-3.5 h-3.5 mr-2 opacity-70" />
                            Skills & Portfolio
                        </h4>
                        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-rose-100 transition-colors">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(formData.technicalSkills || []).map(skill => (
                                    <span key={skill} className="px-2.5 py-1 bg-rose-50 text-[#E11D48] text-[10px] font-black uppercase rounded-lg border border-rose-100">{skill}</span>
                                ))}
                                {(!formData.technicalSkills || formData.technicalSkills.length === 0) && <span className="text-slate-300 italic text-sm">No skills selected</span>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Portfolio</p>
                                    <p className="text-xs font-medium text-rose-600 truncate">{formData.portfolioLink || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">LinkedIn</p>
                                    <p className="text-xs font-medium text-rose-600 truncate">{formData.linkedinProfile || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStep = () => {
        if (currentStep === totalSteps) {
            return renderReviewStep();
        }

        if (currentStep === totalSteps - 1) {
            return (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 flex-1">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-800 flex items-center">
                                <Code className="w-4 h-4 mr-2 text-[#E11D48]" />
                                Technical Skills *
                            </label>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {formData.technicalSkills?.length || 0} selected
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                            {(drive?.skillsConfig || technicalSkillsOptions).map(skill => (
                                <button
                                    key={skill}
                                    type="button"
                                    onClick={() => {
                                        const current = formData.technicalSkills || [];
                                        const updated = current.includes(skill)
                                            ? current.filter(s => s !== skill)
                                            : [...current, skill];
                                        setFormData({ ...formData, technicalSkills: updated });
                                        if (errors.technicalSkills) setErrors(prev => ({ ...prev, technicalSkills: '' }));
                                    }}
                                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.technicalSkills?.includes(skill)
                                            ? 'bg-rose-50 border-[#E11D48] text-[#E11D48] shadow-md shadow-rose-100'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                    }`}
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>
                        {errors.technicalSkills && <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.technicalSkills}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-2 group">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center ml-1">
                                <Link2 className="w-4 h-4 mr-2 text-[#E11D48]" />
                                Portfolio/GitHub
                            </label>
                            <input
                                name="portfolioLink"
                                value={formData.portfolioLink || ''}
                                onChange={onChange}
                                onBlur={handleBlur}
                                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#E11D48] focus:ring-4 focus:ring-[#E11D48]/10 transition-all duration-300"
                                placeholder="https://github.com/..."
                            />
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center ml-1">
                                <Linkedin className="w-4 h-4 mr-2 text-[#E11D48]" />
                                LinkedIn Profile
                            </label>
                            <input
                                name="linkedinProfile"
                                value={formData.linkedinProfile || ''}
                                onChange={onChange}
                                onBlur={handleBlur}
                                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#E11D48] focus:ring-4 focus:ring-[#E11D48]/10 transition-all duration-300"
                                placeholder="https://linkedin.com/..."
                            />
                        </div>
                    </div>
                </div>
            );
        }

        const section = formSections[currentStep - 1];
        if (!section) return null;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {section.fields.map(field => renderField(field))}
                </div>
            </div>
        );
    };

    if (driveExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md border border-slate-200">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Clock className="text-orange-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Registration Closed</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-2">
                        The registration period for <strong className="text-slate-700">{drive?.name || 'this drive'}</strong> has ended.
                    </p>
                    <p className="text-slate-400 text-xs mt-4">
                        If you believe this is an error, please contact the administrator.
                    </p>
                </div>
            </div>
        );
    }

    // Error screen is now only for major initialization errors (like drive not found)
    // and not for transient submission errors.
    if (error && !isInitialLoadComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-[#E11D48] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Registration Successful!</h2>
                    <p className="text-gray-600 mb-6">
                        Thank you for registering for <strong>{drive?.name}</strong>.
                        Your application has been received. You will be notified via email if you are shortlisted.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4 font-sans overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#E11D48]/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-tl from-[#E11D48]/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-6 md:mb-12 relative z-20">
                    <div className="text-center mb-4 md:mb-6">
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">Candidate Registration</h1>
                        <p className="text-sm md:text-base text-gray-600">Professional Application Portal</p>
                    </div>

                    {/* Integrated Error Message (for transient submission errors) */}
                    {error && isInitialLoadComplete && (
                        <div className="max-w-md mx-auto mb-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3 shadow-sm">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                                <button onClick={() => setError('')} className="ml-auto hover:bg-red-100 p-1 rounded-full transition-colors">
                                    <CheckCircle size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress Indicators */}
                    <div className="flex justify-center items-center space-x-1 sm:space-x-2 md:space-x-3 mb-6 md:mb-8 overflow-x-auto py-2 custom-scrollbar no-scrollbar">
                        {Array.from({ length: totalSteps }).map((_, i) => {
                            const step = i + 1;
                            return (
                                <div key={step} className="flex items-center shrink-0">
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-500 ${step === currentStep
                                        ? 'bg-[#E11D48] text-white shadow-lg shadow-[#E11D48]/30 scale-110'
                                        : step < currentStep
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step < currentStep ? <CheckCircle size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" /> : step}
                                    </div>
                                    {step < totalSteps && <div className={`w-4 sm:w-8 md:w-16 h-1 mx-0.5 sm:mx-1 md:mx-2 transition-all duration-500 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-sm text-gray-600">
                        Step {currentStep} of {totalSteps} - {progress}% Complete
                    </div>
                </div>

                {/* Card Stack Container */}
                <div className="relative min-h-[500px] md:h-[600px] perspective-1000 mb-8 md:mb-0">
                    {/* Background Cards - Hidden on small mobile to save space */}
                    <div className="hidden sm:block">
                        {[1, 2, 3].map((offset) => (
                            <div
                                key={offset}
                                className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-gray-100 transform transition-all duration-700"
                                style={{
                                    transform: `translateY(${offset * 20}px) translateZ(${-offset * 100}px) scale(${1 - offset * 0.05})`,
                                    opacity: currentStep + offset <= totalSteps ? 1 - offset * 0.3 : 0,
                                    zIndex: 10 - offset,
                                    pointerEvents: 'none'
                                }}
                            >
                                {currentStep + offset <= totalSteps && (
                                    <div className="p-8 h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                                <span className="text-gray-400 font-bold text-xl">{currentStep + offset}</span>
                                            </div>
                                            <p className="text-gray-400">Upcoming Step</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Active Card */}
                    <div
                        className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-gray-100 transform transition-all duration-700 hover:shadow-3xl flex flex-col"
                        style={{
                            transform: 'translateY(0px) translateZ(0px) scale(1)',
                            zIndex: 20,
                            position: window.innerWidth < 640 ? 'relative' : 'absolute'
                        }}
                    >
                        <form onSubmit={onSubmit} className="h-full flex flex-col">
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-[#E11D48] to-[#be123c] px-4 md:px-8 py-4 md:py-6 rounded-t-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10">
                                    {renderStepHeader()}
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="flex-1 px-4 md:px-8 py-4 md:py-6 overflow-y-auto min-h-[400px] sm:min-h-[350px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="h-full flex flex-col"
                                    >
                                        {renderStep()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Card Footer */}
                            <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 rounded-b-3xl border-t border-gray-100">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto">
                                        {currentStep > 1 && (
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="flex-1 md:flex-none group flex items-center justify-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#E11D48]/50 hover:shadow-lg transition-all duration-200"
                                            >
                                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-[#E11D48] transition-colors" />
                                                <span className="text-xs md:text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Previous</span>
                                            </button>
                                        )}
                                        {isInitialLoadComplete && (
                                            <div className="hidden md:flex items-center space-x-2 text-gray-400 px-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Auto-saving</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full md:w-auto">
                                        <button
                                            type="submit"
                                            className="w-full md:w-auto group flex items-center justify-center space-x-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#E11D48] to-[#be123c] text-white rounded-xl hover:from-[#be123c] hover:to-[#E11D48] hover:shadow-xl hover:shadow-[#E11D48]/30 transition-all duration-200 transform hover:scale-105"
                                        >
                                            <span className="text-xs md:text-sm font-bold">
                                                {currentStep < totalSteps ? 'Next Step' : 'Submit Application'}
                                            </span>
                                            {currentStep < totalSteps ? (
                                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
                                            ) : (
                                                <Shield className="w-4 h-4 md:w-5 md:h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CandidateRegister;
