import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * PaginationFooter - Scalable pagination controls with page size control.
 */
const PaginationFooter = ({ pagination, onPageChange, onLimitChange }) => {
    const { page, totalPages, total, limit } = pagination;

    if (total === 0) return null;

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    const getPages = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            
            const startRange = Math.max(2, page - 1);
            const endRange = Math.min(totalPages - 1, page + 1);
            
            for (let i = startRange; i <= endRange; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (page < totalPages - 2) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="px-6 py-5 border-t border-white/8 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Bottom Left: Info & Page Size */}
                <div className="flex items-center space-x-4 order-2 sm:order-1">
                    <div className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/8">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            <span className="text-white/60">{start}–{end}</span> of <span className="text-rose-400 font-black">{total}</span>
                        </span>
                    </div>

                    <div className="flex items-center bg-white/[0.03] rounded-xl border border-white/8 overflow-hidden">
                        {[10, 20, 50, 100].map((val, idx) => (
                            <button
                                key={val}
                                onClick={() => onLimitChange(val)}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${
                                    limit === val 
                                    ? 'bg-rose-600 text-white shadow-inner' 
                                    : 'text-white/40 hover:text-rose-400 hover:bg-white/5'
                                } ${idx < 3 ? 'border-r border-white/8' : ''}`}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bottom Right: Page Navigation */}
                <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={page === 1}
                        className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 active:scale-90"
                    >
                        <ChevronsLeft size={15} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 active:scale-90"
                    >
                        <ChevronLeft size={15} strokeWidth={2.5} />
                    </button>

                    <div className="flex items-center gap-1 mx-1">
                        {getPages().map((p, i) => (
                            <button
                                key={i}
                                onClick={() => typeof p === 'number' && onPageChange(p)}
                                disabled={p === '...' || p === page}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tight transition-all duration-200 ${
                                    p === page 
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-600/20 scale-105' 
                                    : p === '...' 
                                    ? 'text-white/20 cursor-default' 
                                    : 'text-white/40 hover:bg-white/5 hover:text-rose-400 active:scale-90'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 active:scale-90"
                    >
                        <ChevronRight size={15} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={page === totalPages}
                        className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 active:scale-90"
                    >
                        <ChevronsRight size={15} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaginationFooter;
