import React, { useState } from 'react';
import './RejectPopup.css';

interface Reject {
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
}

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    password: string;
}

interface DowntimeCategory {
    categoryName: string;
    reasons: string[];
}

interface RejectPopupProps {
    onClose: () => void;
    onSubmit: (data: Omit<Reject, 'docId'>) => void;
    downtimeCategories: DowntimeCategory[];
    qcs: SupportFunction[];
}

const RejectPopup: React.FC<RejectPopupProps> = ({
                                                     onClose,
                                                     onSubmit,
                                                     downtimeCategories,
                                                     qcs,
                                                 }) => {
    const [count, setCount] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [recordedAsProduced, setRecordedAsProduced] = useState<boolean>(false);
    const [selectedQcId, setSelectedQcId] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Extract Reject Reasons from Downtime Categories
    const rejectCategory = downtimeCategories.find(dc => dc.categoryName.toLowerCase() === 'reject');
    const rejectReasons = rejectCategory ? rejectCategory.reasons : [];

    const handleSubmit = () => {
        if (!reason || !selectedQcId || !qcPassword) {
            setErrorMessage('Please fill all required fields.');
            return;
        }

        const qc = qcs.find(q => q.id === selectedQcId && q.password === qcPassword);
        if (!qc) {
            setErrorMessage('Invalid QC credentials.');
            return;
        }

        onSubmit({
            count,
            reason,
            recordedAsProduced,
            qcApprovedBy: `${qc.name} ${qc.surname}`,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Record Reject</h2>
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
                    Reason for Reject:
                    <select value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Select a Reason</option>
                        {rejectReasons.map((r, index) => (
                            <option key={index} value={r}>{r}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Recorded as Produced:
                    <input
                        type="checkbox"
                        checked={recordedAsProduced}
                        onChange={(e) => setRecordedAsProduced(e.target.checked)}
                    />
                </label>
                <label>
                    Select QC:
                    <select
                        value={selectedQcId}
                        onChange={(e) => setSelectedQcId(e.target.value)}
                    >
                        <option value="">Select a QC</option>
                        {qcs.map(qc => (
                            <option key={qc.id} value={qc.id}>
                                {qc.name} {qc.surname}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    QC Password:
                    <input
                        type="password"
                        value={qcPassword}
                        onChange={(e) => setQcPassword(e.target.value)}
                    />
                </label>
                <button className="submit-button" onClick={handleSubmit}>Submit</button>
                <button className="cancel-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default RejectPopup;
