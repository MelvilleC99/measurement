import React, { useState } from 'react';
import './ActiveReworksPopup.css';

interface ReworkItem {
    docId: string; // Firestore document ID
    count: number;
    reason: string;
    operation: string;
    startTime: Date;
    endTime?: Date;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
}

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    password: string;
}

interface ActiveReworksPopupProps {
    reworks: ReworkItem[];
    qcs: SupportFunction[];
    onClose: () => void;
    onBookIn: (rework: ReworkItem, qcId: string, action: 'bookIn' | 'convertToReject') => void;
}

const ActiveReworksPopup: React.FC<ActiveReworksPopupProps> = ({
                                                                   reworks,
                                                                   qcs,
                                                                   onClose,
                                                                   onBookIn,
                                                               }) => {
    const [selectedRework, setSelectedRework] = useState<ReworkItem | null>(null);
    const [selectedQcId, setSelectedQcId] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleAction = (action: 'bookIn' | 'convertToReject') => {
        if (!selectedRework) {
            setErrorMessage('Please select a rework to process.');
            return;
        }
        if (!selectedQcId || !qcPassword) {
            setErrorMessage('Please select a QC and enter the password.');
            return;
        }

        const qc = qcs.find(q => q.id === selectedQcId && q.password === qcPassword);
        if (!qc) {
            setErrorMessage('Invalid QC credentials.');
            return;
        }

        onBookIn(selectedRework, selectedQcId, action);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Active Reworks</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <label>
                    Select Rework:
                    <select
                        value={selectedRework?.docId || ''}
                        onChange={(e) => {
                            const rework = reworks.find(rw => rw.docId === e.target.value);
                            setSelectedRework(rework || null);
                        }}
                    >
                        <option value="">Select a Rework</option>
                        {reworks.map(rw => (
                            <option key={rw.docId} value={rw.docId}>
                                Ref: {rw.docId.slice(-4)}, Reason: {rw.reason}, Count: {rw.count}
                            </option>
                        ))}
                    </select>
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
                <div className="action-buttons">
                    <button className="submit-button" onClick={() => handleAction('bookIn')}>Book In Rework</button>
                    <button className="submit-button" onClick={() => handleAction('convertToReject')}>Convert to Reject</button>
                </div>
                <button className="cancel-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default ActiveReworksPopup;
