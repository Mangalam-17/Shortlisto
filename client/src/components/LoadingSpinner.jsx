import React from 'react';

const LoadingSpinner = ({ 
    size = 'md', 
    color = 'primary', 
    text = 'Loading...', 
    fullScreen = false,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const colorClasses = {
        primary: 'border-blue-600 border-t-transparent',
        secondary: 'border-gray-600 border-t-transparent',
        white: 'border-white border-t-transparent',
        success: 'border-green-600 border-t-transparent',
        warning: 'border-yellow-600 border-t-transparent',
        danger: 'border-red-600 border-t-transparent'
    };

    const spinner = (
        <div className={`flex flex-col items-center space-y-4 ${className}`}>
            <div className={`animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]}`}></div>
            {text && (
                <p className={`text-sm ${
                    color === 'white' ? 'text-white' : 'text-gray-600'
                } animate-pulse`}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
