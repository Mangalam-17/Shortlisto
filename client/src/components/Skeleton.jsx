import React from 'react';

const Skeleton = ({ className = '', variant = 'text' }) => {
    const baseClass = "animate-pulse bg-white/[0.03] rounded";

    const variants = {
        text: "h-4 w-3/4 mb-2",
        title: "h-6 w-1/2 mb-4",
        circle: "rounded-full aspect-square",
        rect: "w-full aspect-video",
        card: "h-32 w-full",
    };

    return (
        <div className={`${baseClass} ${variants[variant] || ''} ${className}`} />
    );
};

export const CardSkeleton = () => (
    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/8 space-y-3">
        <div className="flex justify-between items-start">
            <Skeleton variant="title" className="w-24 h-4" />
            <Skeleton variant="circle" className="w-10 h-10" />
        </div>
        <Skeleton variant="title" className="w-16 h-8" />
        <Skeleton variant="text" className="w-20 h-3" />
    </div>
);

export const TableRowSkeleton = ({ columns = 5 }) => (
    <tr className="border-b border-white/5">
        <td colSpan={columns} className="px-6 py-4">
            <div className="flex items-center space-x-4">
                <Skeleton variant="circle" className="w-9 h-9" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/3 h-3" />
                    <Skeleton variant="text" className="w-1/4 h-2" />
                </div>
                <div className="hidden md:flex space-x-8">
                    <Skeleton variant="text" className="w-24 h-3" />
                    <Skeleton variant="text" className="w-32 h-3" />
                    <Skeleton variant="text" className="w-16 h-3" />
                </div>
            </div>
        </td>
    </tr>
);

export default Skeleton;
