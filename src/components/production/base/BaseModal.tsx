// src/components/production/base/BaseModal.tsx

import React, { ReactNode } from 'react';
import './BaseModal.css';

export interface BaseModalProps {
    title: string;
    children: ReactNode;
    onClose: () => void;
    errorMessage?: string;
    showSubmit?: boolean;
    onSubmit?: () => void;
    submitLabel?: string;
    className?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
                                                 title,
                                                 children,
                                                 onClose,
                                                 errorMessage,
                                                 showSubmit = true,
                                                 onSubmit,
                                                 submitLabel = "Submit",
                                                 className = ""
                                             }) => {
    return (
        <div className="modal-overlay">
            <div className={`modal-content ${className}`}>
                <h2>{title}</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}

                {children}

                <div className="button-container">
                    {showSubmit && onSubmit && (
                        <button className="submit-button" onClick={onSubmit}>
                            {submitLabel}
                        </button>
                    )}
                    <button className="cancel-button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BaseModal;