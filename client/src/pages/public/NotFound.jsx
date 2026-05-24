import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                {/* 404 Illustration Area */}
                <div className="relative">
                    <div className="text-[12rem] font-black text-slate-200 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex items-center justify-center text-[#E11D48] animate-bounce-slow">
                            <AlertCircle size={48} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Page Not Found</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed max-w-[280px] mx-auto">
                        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        <span>Go Back</span>
                    </button>
                    <button 
                        onClick={() => navigate('/admin/login')}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-[#E11D48] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-100"
                    >
                        <Home size={16} />
                        <span>Home Page</span>
                    </button>
                </div>

                {/* Footer Decor */}
                <div className="pt-12 flex justify-center space-x-2 opacity-20">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
