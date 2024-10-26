// src/common/production/downtime/hr/Absent.tsx

import React, { useState, useEffect } from 'react';
import './Absent.css';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { AbsentFormData, SupportFunction } from '../../../../types';

interface AbsentProps {
    onClose: () => void;
    onSubmit: (absentData: AbsentFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

const Absent: React.FC<AbsentProps> = ({ onClose, onSubmit, productionLineId, supervisorId }) => {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!employeeId || !reason || !startDate || !endDate) {
            setError('Please fill in all required fields.');
            return;
        }

        if (endDate < startDate) {
            setError('End date cannot be before start date.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    // Handle confirmation
    const handleConfirm = async () => {
        const absentData: AbsentFormData = {
            employeeId,
            reason,
            startDate,
            endDate,
            productionLineId,
            supervisorId
        };

        try {
            await onSubmit(absentData);
            setEmployeeId('');
            setReason('');
            setStartDate(new Date());
            setEndDate(new Date());
            setIsConfirmModalOpen(false);
            alert('Absence logged successfully.');
        } catch (err) {
            console.error('Error submitting absence:', err);
            setError('Failed to log absence.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log Absence</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="absent-form">
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
                        Start Date:
                        <input
                            type="date"
                            value={startDate.toISOString().split('T')[0]}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                            required
                        />
                    </label>
                    <label>
                        End Date:
                        <input
                            type="date"
                            value={endDate.toISOString().split('T')[0]}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                            min={startDate.toISOString().split('T')[0]}
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
                        <button type="submit" className="submit-button">
                            Log Absence
                        </button>
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>

                {/* Confirm Modal */}
                {isConfirmModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Absence</h3>
                            <p>Please confirm absence details:</p>
                            <div className="confirmation-details">
                                <p>Employee ID: {employeeId}</p>
                                <p>Start Date: {startDate.toLocaleDateString()}</p>
                                <p>End Date: {endDate.toLocaleDateString()}</p>
                                <p>Reason: {reason}</p>
                            </div>
                            <div className="modal-buttons">
                                <button onClick={handleConfirm} className="submit-button">
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                            </div>
                            {error && <p className="error-message">{error}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Absent;