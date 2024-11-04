import React from 'react';
import './StandardCard.css';

interface StandardCardProps {
    title: string;
    onClose?: () => void;
    children: React.ReactNode;
    className?: string;
}

const StandardCard: React.FC<StandardCardProps> = ({
                                                       title,
                                                       onClose,
                                                       children,
                                                       className = ''
                                                   }) => {
    return (
        <div className={`standard-card ${className}`}>
            <div className="standard-card-header">
                <h2 className="standard-card-title">{title}</h2>
                {onClose && (
                    <button
                        className="standard-card-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                )}
            </div>
            <div className="standard-card-content">
                {children}
            </div>
        </div>
    );
};

export default StandardCard;