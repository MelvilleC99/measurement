// src/components/production/productionboard/components/Overtime.tsx

import React, { useState } from 'react';
// import './Overtime.css'; // Removed to prevent import errors

interface OvertimeProps {
    onConfirm: (newTarget: number) => void;
    onCancel: () => void;
}

const Overtime: React.FC<OvertimeProps> = ({ onConfirm, onCancel }) => {
    const [newTarget, setNewTarget] = useState<number>(0);
    const [error, setError] = useState<string>('');

    const handleConfirm = () => {
        if (newTarget > 0) {
            onConfirm(newTarget);
        } else {
            setError('Please enter a valid target greater than 0.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Start Overtime</h2>
                {error && <p className="error-message">{error}</p>}
                <label>
                    Adjusted Target:
                    <input
                        type="number"
                        value={newTarget}
                        onChange={(e) => setNewTarget(parseInt(e.target.value))}
                        min={1}
                        placeholder="Enter new target units per hour"
                    />
                </label>
                <div className="modal-buttons">
                    <button onClick={handleConfirm}>Confirm</button>
                    <button onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default Overtime;
