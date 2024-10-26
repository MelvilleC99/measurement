// src/common/production/downtime/hr/Late.tsx

import React, { useState, useEffect } from 'react';
import './Late.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { LateFormData, SupportFunction } from '../../../../types';

interface LateProps {
    onClose: () => void;
    onSubmit: (lateData: LateFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

const Late: React.FC<LateProps> = ({ onClose, onSubmit, productionLineId, supervisorId }) => {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [date, setDate] = useState<Date>(new Date());
    const [time, setTime] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!employeeId || !reason || !time) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    // Handle confirmation
    const handleConfirm = async () => {
        const lateData: LateFormData = {
            employeeId,
            reason,
            date,
            time,
            productionLineId,
            supervisorId
        };

        try {
            await onSubmit(lateData);
            setEmployeeId('');
            setReason('');
            setTime('');
            setIsConfirmModalOpen(false);
            alert('Late arrival logged successfully.');
        } catch (err) {
            console.error('Error submitting late arrival:', err);
            setError('Failed to log late arrival.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log Late Arrival</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="late-form">
                    <label>
                        Employee ID:
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Date:
                        <input
                            type="date"
                            value={date.toISOString().split('T')[0]}
                            onChange={(e) => setDate(new Date(e.target.value))}
                            required
                        />
                    </label>
                    <label>
                        Time:
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Reason:
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit" className="submit-button">Log Late Arrival</button>
                        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                    </div>
                </form>

                {/* Confirm Modal */}
                {isConfirmModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Late Arrival</h3>
                            <p>Please confirm your late arrival logging.</p>
                            <div className="modal-buttons">
                                <button onClick={handleConfirm} className="submit-button">Confirm</button>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="cancel-button">Cancel</button>
                            </div>
                            {error && <p className="error-message">{error}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Late;