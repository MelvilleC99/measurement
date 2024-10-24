// src/components/production/popup/SupplyDowntime.tsx
import React, { useState } from 'react';
import PasswordConfirmation from './PasswordConfirmation';
import CommentsInput from './CommentsInput';
import './SupplyDowntime.css';

interface DowntimeCard {
    docId: string;
    category: string;
    reason: string;
    endTime?: Date;
    comments?: string;
}

interface SupplyDowntimeProps {
    onClose: () => void;
    onSubmit: (data: DowntimeCard) => void;
}

const SupplyDowntime: React.FC<SupplyDowntimeProps> = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState<string>('');
    const [downtimeCard, setDowntimeCard] = useState<DowntimeCard | null>(null);
    const [errors, setErrors] = useState<string>('');

    const handleLogDowntime = () => {
        if (!reason) {
            setErrors('Please select a reason.');
            return;
        }
        // Create downtime card logic
        const newDowntimeCard: DowntimeCard = {
            docId: 'manualDocId456', // Replace with actual ID generation logic
            category: 'Supply',
            reason,
            // Initialize other fields as needed
        };
        setDowntimeCard(newDowntimeCard);
        setErrors('');
        onSubmit(newDowntimeCard); // Notify parent or handle accordingly
    };

    const handleCloseOut = (password: string, comments: string) => {
        const validPassword = 'password123'; // Replace with actual validation
        if (password !== validPassword) {
            alert('Invalid supervisor password.');
            return;
        }

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
                    <h3>Select Reason for Supply Downtime</h3>
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Select a Reason</option>
                        <option value="Supply Reason 1">Supply Reason 1</option>
                        <option value="Supply Reason 2">Supply Reason 2</option>
                        {/* Add more reasons as needed */}
                    </select>
                    {errors && <p className="error">{errors}</p>}
                    <button onClick={handleLogDowntime}>Log Downtime</button>
                </>
            )}
            {downtimeCard && (
                <>
                    <h3>Supply Downtime Logged</h3>
                    <p><strong>Doc ID:</strong> {downtimeCard.docId}</p>
                    <p><strong>Category:</strong> {downtimeCard.category}</p>
                    <p><strong>Reason:</strong> {downtimeCard.reason}</p>

                    <PasswordConfirmation
                        item="Close Out Supply Downtime"
                        onConfirm={(password) => handleCloseOut(password, '')}
                    />
                    <CommentsInput onSubmit={(comments) => handleCloseOut('', comments)} />
                </>
            )}
        </div>
    );
};

export default SupplyDowntime;