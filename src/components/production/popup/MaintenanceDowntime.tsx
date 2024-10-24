// src/components/production/popup/MaintenanceDowntime.tsx
import React, { useState } from 'react';
import PasswordConfirmation from './PasswordConfirmation';
import CommentsInput from './CommentsInput';
import './MaintenanceDowntime.css';

interface DowntimeCard {
    docId: string;
    category: string;
    reason: string;
    mechanicConfirmed?: boolean;
    supervisorApproved?: boolean;
    failureReason?: string;
    endTime?: Date;
    comments?: string;
}

interface MaintenanceDowntimeProps {
    onClose: () => void;
    onSubmit: (data: DowntimeCard) => void;
}

const MaintenanceDowntime: React.FC<MaintenanceDowntimeProps> = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState<string>('');
    const [downtimeCard, setDowntimeCard] = useState<DowntimeCard | null>(null);
    const [errors, setErrors] = useState<string>('');
    const [failureReason, setFailureReason] = useState<string>('');

    const handleLogDowntime = () => {
        if (!reason) {
            setErrors('Please select a reason.');
            return;
        }
        // Create downtime card logic
        const newDowntimeCard: DowntimeCard = {
            docId: 'manualDocId789', // Replace with actual ID generation logic
            category: 'Maintenance',
            reason,
            // Initialize other fields as needed
        };
        setDowntimeCard(newDowntimeCard);
        setErrors('');
        onSubmit(newDowntimeCard); // Notify parent or handle accordingly
    };

    const handleMechanicConfirmation = (password: string) => {
        const validPassword = 'password123'; // Replace with actual validation
        if (password !== validPassword) {
            alert('Invalid mechanic password.');
            return;
        }
        // Record mechanic confirmation
        setDowntimeCard(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                mechanicConfirmed: true,
            };
        });
    };

    const handleSupervisorApproval = (password: string, reason: string) => {
        const validPassword = 'password123'; // Replace with actual validation
        if (password !== validPassword) {
            alert('Invalid supervisor password.');
            return;
        }
        // Record supervisor approval and failure reason
        setDowntimeCard(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                supervisorApproved: true,
                failureReason: reason,
            };
        });
    };

    const handleCloseOut = (comments: string) => {
        if (downtimeCard) {
            const updatedCard: DowntimeCard = {
                ...downtimeCard,
                endTime: new Date(),
                comments,
            };
            onSubmit(updatedCard); // Notify parent or handle accordingly
            onClose();
        }
    };

    return (
        <div>
            {!downtimeCard && (
                <>
                    <h3>Select Reason for Maintenance Downtime</h3>
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Select a Reason</option>
                        <option value="Maintenance Reason A">Maintenance Reason A</option>
                        <option value="Maintenance Reason B">Maintenance Reason B</option>
                        {/* Add more reasons as needed */}
                    </select>
                    {errors && <p className="error">{errors}</p>}
                    <button onClick={handleLogDowntime}>Log Downtime</button>
                </>
            )}
            {downtimeCard && (
                <>
                    <h3>Maintenance Downtime Logged</h3>
                    <p><strong>Doc ID:</strong> {downtimeCard.docId}</p>
                    <p><strong>Category:</strong> {downtimeCard.category}</p>
                    <p><strong>Reason:</strong> {downtimeCard.reason}</p>

                    {!downtimeCard.mechanicConfirmed && (
                        <PasswordConfirmation
                            item="Mechanic Confirm Receipt"
                            onConfirm={(password) => handleMechanicConfirmation(password)}
                        />
                    )}

                    {downtimeCard.mechanicConfirmed && !downtimeCard.supervisorApproved && (
                        <>
                            <PasswordConfirmation
                                item="Supervisor Approve Resolution"
                                onConfirm={(password) => handleSupervisorApproval(password, failureReason)}
                            />
                            <label>
                                Confirm Reason for Failure:
                                <input
                                    type="text"
                                    value={failureReason}
                                    onChange={(e) => setFailureReason(e.target.value)}
                                    placeholder="Enter failure reason"
                                />
                            </label>
                        </>
                    )}

                    {downtimeCard.supervisorApproved && (
                        <CommentsInput onSubmit={handleCloseOut} />
                    )}
                </>
            )}
        </div>
    );
};

export default MaintenanceDowntime;