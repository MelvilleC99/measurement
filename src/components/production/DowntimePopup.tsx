import React, { useState } from 'react';
import './DowntimePopup.css';

interface DowntimeItem {
    docId: string; // Firestore document ID
    category: string;
    reason: string;
    startTime: Date;
    endTime?: Date;
    mechanicReceivedTime?: Date;
    status: 'Open' | 'Mechanic Received' | 'Resolved';
}

interface DowntimePopupProps {
    onClose: () => void;
    onSubmit: (data: Omit<DowntimeItem, 'docId' | 'startTime' | 'status' | 'endTime'>) => void;
    downtimeCategories: { categoryName: string; reasons: string[] }[];
}

const DowntimePopup: React.FC<DowntimePopupProps> = ({
                                                         onClose,
                                                         onSubmit,
                                                         downtimeCategories,
                                                     }) => {
    const [category, setCategory] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleSubmit = () => {
        if (!category || !reason) {
            setErrorMessage('Please select a category and reason.');
            return;
        }

        setErrorMessage(''); // Clear error message on success
        onSubmit({
            category,
            reason,
        });
    };

    const reasonsForCategory = downtimeCategories.find(dc => dc.categoryName === category)?.reasons || [];

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Record Downtime</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <label>
                    Downtime Category:
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setReason(''); // Reset reason when category changes
                        }}
                    >
                        <option value="">Select a Category</option>
                        {downtimeCategories.map((dc, index) => (
                            <option key={index} value={dc.categoryName}>{dc.categoryName}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Reason:
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Select a Reason</option>
                        {reasonsForCategory.map((r, index) => (
                            <option key={index} value={r}>{r}</option>
                        ))}
                    </select>
                </label>
                <button className="submit-button" onClick={handleSubmit}>Submit</button>
                <button className="cancel-button" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default DowntimePopup;
