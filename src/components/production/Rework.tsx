import React, { useState } from 'react';
import './Rework.css';

interface ReworkProps {
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

const Rework: React.FC<ReworkProps> = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason);
            onClose(); // Close the popup after submission
        } else {
            alert('Please provide a reason for rework.');
        }
    };

    return (
        <div className="rework-modal-overlay">
            <div className="rework-modal-content">
                <h2>Rework Details</h2>
                <label>
                    Reason for Rework:
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason for rework..."
                    />
                </label>
                <label>
                    Book Back to Line: <span>(Placeholder)</span>
                </label>
                <div className="rework-modal-buttons">
                    <button onClick={handleSubmit}>Submit</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default Rework;
