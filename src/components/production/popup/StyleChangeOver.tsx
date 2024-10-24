// src/components/production/popup/StyleChangeOver.tsx
import React, { useState } from 'react';
import PasswordConfirmation from './PasswordConfirmation';
import CommentsInput from './CommentsInput';
import './StyleChangeOver.css';
import { DowntimeCard } from '../../../interfaces/DowntimeCard';

interface StyleChangeOverProps {
    onClose: () => void;
    onSubmit: (data: DowntimeCard) => void;
}

const StyleChangeOver: React.FC<StyleChangeOverProps> = ({ onClose, onSubmit }) => {
    const [step, setStep] = useState<number>(1);
    const [nextStyle, setNextStyle] = useState<string>('');
    const [target, setTarget] = useState<string>('');
    const [downtimeCard, setDowntimeCard] = useState<DowntimeCard | null>(null);
    const [errors, setErrors] = useState<string>('');

    const handleConfirmStyle = () => {
        if (!nextStyle || !target) {
            setErrors('Please provide both next style and target.');
            return;
        }
        // Create downtime card logic
        const newDowntimeCard: DowntimeCard = {
            docId: `manualDocId${Date.now()}`, // Replace with actual ID generation logic
            productionLineId: 'line1', // Replace with actual data
            supervisorId: 'sup1', // Replace with actual data
            category: 'Style Change Over',
            reason: nextStyle,
            status: 'Style Change In Progress',
            createdAt: new Date(),
            updatedAt: new Date(),
            startTime: new Date(),
            // Initialize other fields as needed
        };
        setDowntimeCard(newDowntimeCard);
        setStep(2);
        setErrors('');
        onSubmit(newDowntimeCard); // Notify parent or handle accordingly
    };

    const handleStepConfirmation = async (action: 'mechanicReceived' | 'resolved', mechanicId?: string) => {
        // Depending on your application's logic, handle additional steps here
        // For example, updating the downtime card status
    };

    const handleCloseOut = (comments: string) => {
        if (downtimeCard) {
            const updatedCard: DowntimeCard = {
                ...downtimeCard,
                endTime: new Date(),
                comments,
                status: 'Resolved', // Or another appropriate status
                updatedAt: new Date(),
            };
            onSubmit(updatedCard); // Notify parent or handle accordingly
            onClose();
        }
    };

    return (
        <div>
            {step === 1 && (
                <>
                    <h3>Confirm Next Style and Add Target</h3>
                    <label>
                        Next Style:
                        <input
                            type="text"
                            value={nextStyle}
                            onChange={(e) => setNextStyle(e.target.value)}
                            placeholder="Enter next style"
                        />
                    </label>
                    <label>
                        Target:
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="Enter target"
                        />
                    </label>
                    {errors && <p className="error">{errors}</p>}
                    <button onClick={handleConfirmStyle}>Confirm</button>
                </>
            )}
            {step === 2 && downtimeCard && (
                <>
                    <h3>Downtime Card Created</h3>
                    <p><strong>Doc ID:</strong> {downtimeCard.docId}</p>
                    <p><strong>Category:</strong> {downtimeCard.category}</p>
                    <p><strong>Reason:</strong> {downtimeCard.reason}</p>

                    <PasswordConfirmation
                        item="Mechanic Confirm Receipt"
                        onConfirm={(password) => handleStepConfirmation('mechanicReceived', 'mech1')} // Pass mechanicId as needed
                    />
                    <PasswordConfirmation
                        item="Supervisor Approve Resolution"
                        onConfirm={(password) => handleStepConfirmation('resolved')}
                    />
                </>
            )}
            {step === 3 && downtimeCard && (
                <>
                    <h3>Downtime Completed</h3>
                    <CommentsInput onSubmit={handleCloseOut} />
                </>
            )}
        </div>
    );
};

export default StyleChangeOver;