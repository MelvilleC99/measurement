import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import './Supply.css';

interface SupplyLogProps {
    onClose: () => void;
    onSubmit: (data: SupplyFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

interface SupplyFormData {
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
}

const SupplyLog: React.FC<SupplyLogProps> = ({ onClose, onSubmit, productionLineId, supervisorId }) => {
    const [reason, setReason] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const reasonsSnapshot = await getDocs(collection(db, 'downtimeCategories'));
                const supplyDoc = reasonsSnapshot.docs.find((doc) => doc.data().name === 'Supply');
                const reasonsData = supplyDoc?.data().reasons || [];
                setReasonsList(reasonsData);
            } catch (error) {
                console.error('Error fetching reasons:', error);
                setError('Failed to load reasons.');
            }
        };

        fetchReasons();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason) {
            setError('Please select a reason.');
            return;
        }

        const supplyFormData: SupplyFormData = {
            reason,
            comments,
            productionLineId,
            supervisorId,
        };

        try {
            await addDoc(collection(db, 'supplyDowntime'), {
                ...supplyFormData,
                createdAt: Timestamp.now(),
                startTime: Timestamp.now(),
                status: 'Open' as const,
            });

            alert('Supply downtime logged successfully.');
            onClose();
        } catch (err) {
            console.error('Error logging downtime:', err);
            setError('Failed to log downtime.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Supply Downtime</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="supply-log-form">
                    <label>
                        Reason:
                        <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                            <option value="">Select Reason</option>
                            {reasonsList.map((r, index) => (
                                <option key={index} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Comments:
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter comments..."
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit" className="submit-button">
                            Confirm
                        </button>
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplyLog;
