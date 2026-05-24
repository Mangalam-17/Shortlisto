/**
 * Dark Editorial Theme tokens
 * Shared across all admin pages for consistency
 */

// Page wrapper
export const page = 'space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12';

// Header card (top of each page)
export const headerCard = 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.03] border border-white/8 rounded-2xl p-6 relative overflow-hidden';

// Section card (tables, forms)
export const card = 'bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden';

// Card header bar
export const cardHeader = 'px-6 py-4 border-b border-white/8 bg-white/[0.02] flex items-center justify-between';

// Table
export const table = 'min-w-full divide-y divide-white/5';
export const thead = 'bg-white/[0.02]';
export const th = 'px-6 py-4 text-left text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap';
export const tbody = 'divide-y divide-white/5';
export const tr = 'group hover:bg-white/[0.03] transition-all duration-200 cursor-default';
export const td = 'px-6 py-4';

// Text
export const heading = 'text-2xl font-black text-white tracking-tight';
export const subheading = 'text-[10px] font-black text-[#F43F5E] mt-1.5 uppercase tracking-widest flex items-center';
export const label = 'text-[10px] font-black text-white/30 uppercase tracking-[0.2em]';
export const muted = 'text-white/30';

// Inputs
export const input = 'w-full bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#E11D48]/60 focus:ring-2 focus:ring-[#E11D48]/20 transition-all px-4 py-3';
export const select = 'bg-white/5 border border-white/8 rounded-xl text-[13px] text-white focus:outline-none focus:border-[#E11D48]/60 transition-all px-4 py-3 appearance-none cursor-pointer';
export const textarea = 'w-full bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#E11D48]/60 focus:ring-2 focus:ring-[#E11D48]/20 transition-all px-4 py-3';

// Buttons
export const btnPrimary = 'flex items-center space-x-2 bg-white text-black px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all font-bold text-[12px] active:scale-95';
export const btnSecondary = 'flex items-center space-x-2 bg-white/8 border border-white/10 text-white/70 px-5 py-2.5 rounded-xl hover:bg-white/12 hover:text-white transition-all font-bold text-[12px] active:scale-95';
export const btnDanger = 'flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-2.5 rounded-xl hover:bg-red-500/20 transition-all font-bold text-[12px] active:scale-95';
export const btnIndigo = 'flex items-center space-x-2 bg-[#E11D48] text-white px-5 py-2.5 rounded-xl hover:bg-[#BE123C] transition-all font-bold text-[12px] shadow-lg shadow-[#E11D48]/20 active:scale-95';
export const btnIcon = 'p-2.5 text-white/30 hover:text-white hover:bg-white/8 rounded-xl transition-all active:scale-90 border border-transparent hover:border-white/10';
export const btnIconDanger = 'p-2.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-500/20';

// Modal backdrop
export const modalBackdrop = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
export const modalOverlay = 'absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200';
export const modal = 'bg-[#111] rounded-2xl border border-white/10 w-full shadow-2xl animate-in zoom-in-95 duration-200 relative z-10';
export const modalHeader = 'px-8 py-6 border-b border-white/8 flex justify-between items-center';
export const modalFooter = 'px-8 py-5 border-t border-white/8 flex justify-end gap-3';

// Status badges
export const badgeLive = 'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
export const badgeScheduled = 'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[#E11D48]/15 text-[#F43F5E] border border-[#E11D48]/20';
export const badgeEnded = 'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/30 border border-white/8';
export const badgeSuccess = 'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
export const badgeDanger = 'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20';

// Stat card
export const statCard = 'bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/12 transition-all duration-300 relative overflow-hidden group';

// Empty state
export const emptyState = 'py-24 text-center';
export const emptyIcon = 'w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/8 text-white/15';

// Glow orbs for header cards
export const glowOrbs = (
    <>
        <div className="absolute top-0 right-0 w-full h-full opacity-100 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#E11D48]/10 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#F43F5E]/8 rounded-full blur-[80px]"></div>
        </div>
    </>
);
