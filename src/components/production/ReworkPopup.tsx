import React, { useState } from 'react';
import './ReworkPopup.css';

interface ReworkItem {
    count: number;
    reason: string;
    operation: string;
}

interface ReworkPopupProps {
    onClose: () => void;
    onSubmit: (data: Omit<ReworkItem, 'docId' | 'startTime' | 'status' | 'endTime'>) => void;
    downtimeCategories: { categoryName: string; reasons: string[] }[];
    operations: string[]; // For now, operations are manual input
    qcs: { id: string; name: string; surname: string; password: string }[];
}

const ReworkPopup: React.FC<ReworkPopupProps> = ({
                                                     onClose,
                                                     onSubmit,
                                                     downtimeCategories,
                                                     operations,
                                                     qcs,
                                                 }) => {
    const [count, setCount] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [operation, setOperation] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Extract Rework Reasons from Downtime Categories
    const reworkCategory = downtimeCategories.find(dc => dc.categoryName.toLowerCase() === 'rework');
    const reworkReasons = reworkCategory ? reworkCategory.reasons : [];

    const handleSubmit = () => {
        if (!reason || !operation) {
            setErrorMessage('Please provide reason and operation.');
            return;
        }

        onSubmit({
            count,
            reason,
            operation,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Record Rework</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <label>
                    Count:
                    <input
                        type="number"
                        min="1"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                    />
                </label>
                <label>
                    Reason for Rework:
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Select a Reason</option>
                        {reworkReasons.map((r, index) => (
                            <option key={index} value={r}>{r}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Operation:
                    <input
                        type="text"
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                    />
                </label>
                <button className="submit-button" onClick={handleSubmit}>Submit</button>
                <button className="cancel-button" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default ReworkPopup;
