// src/components/StandardDesign/DTcapture/DTcapture.tsx

import React, { ReactNode, ButtonHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

// Types and Interfaces
interface DTModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    currentStyle?: string;
    children: ReactNode;
}

interface DTFormFieldProps {
    label: string;
    required?: boolean;
    children: ReactNode;
    error?: string;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    children: ReactNode;
}

// Components
export const DTModal: React.FC<DTModalProps> = ({
                                                    isOpen,
                                                    onClose,
                                                    title,
                                                    currentStyle,
                                                    children
                                                }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[500px]">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {currentStyle && (
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Current Style:</span>
                        <span className="ml-2 font-medium text-gray-900">{currentStyle}</span>
                    </div>
                )}

                <div className="px-6 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const DTFormField: React.FC<DTFormFieldProps> = ({
                                                            label,
                                                            required,
                                                            children,
                                                            error
                                                        }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
);

// Form Elements
export const Input = ({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full h-10 px-3 border rounded-md bg-white 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   disabled:bg-gray-50 text-sm ${className}`}
        {...props}
    />
);

export const Select = ({
                           className = '',
                           children,
                           ...props
                       }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) => (
    <select
        className={`w-full h-10 px-3 border rounded-md bg-white 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   disabled:bg-gray-50 text-sm ${className}`}
        {...props}
    >
        {children}
    </select>
);

export const TextArea = ({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        className={`w-full px-3 py-2 border rounded-md resize-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   disabled:bg-gray-50 text-sm ${className}`}
        rows={3}
        {...props}
    />
);

export const Button = {
    Primary: ({ className = '', children, ...props }: ButtonProps) => (
        <button
            className={`px-4 py-2 text-sm font-medium text-white 
                       bg-blue-600 rounded-md hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-blue-500 ${className}`}
            {...props}
        >
            {children}
        </button>
    ),
    Secondary: ({ className = '', children, ...props }: ButtonProps) => (
        <button
            className={`px-4 py-2 text-sm font-medium text-gray-700 
                       bg-white border border-gray-300 rounded-md 
                       hover:bg-gray-50 focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-blue-500 ${className}`}
            {...props}
        >
            {children}
        </button>
    )
};

// Combined exports
export const FormElements = {
    Input,
    Select,
    TextArea,
    Button
};

// No default export needed since we're exporting components individually