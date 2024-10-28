import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { RejectFormData } from '../types';
import {SupportFunction }  from '../../../../types'
import './Reject.css';

interface RejectProps {
    onClose: () => void;
    onSubmit: (rejectData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
}

interface Operation {
    id: string;
    name: string;
}

const Reject: React.FC<RejectProps> = ({
                                           onClose,
                                           onSubmit,
                                           productionLineId,
                                           supervisorId,
                                           qcs
                                       }) => {
    const [reason, setReason] = useState<string>('');
    const [operation, setOperation] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [count, setCount] = useState<number>(1);
    const [selectedQc, setSelectedQc] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [operationsList, setOperationsList] = useState<Operation[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchReasonsAndOperations = async () => {
            try {
                // Fetch Reject reasons from downtimeCategories collection
                const reasonsQuery = query(
                    collection(db, 'downtimeCategories'),
                    where('categoryName', '==', 'Reject')
                );
                const reasonsSnapshot = await getDocs(reasonsQuery);
                const fetchedReasons = reasonsSnapshot.docs.flatMap((doc) => doc.data().reasons || []);
                setReasonsList(fetchedReasons);

                // Fetch operations from productHierarchy collection
                const operationsSnapshot = await getDocs(collection(db, 'productHierarchy'));
                const fetchedOperations = operationsSnapshot.docs.flatMap((doc) =>
                    (doc.data().operations || []).map((op: { name: string }) => ({
                        id: doc.id,
                        name: op.name
                    }))
                );
                setOperationsList(fetchedOperations);
            } catch (err) {
                console.error('Error fetching reasons and operations:', err);
                setError('Failed to load reasons and operations data.');
            }
        };

        fetchReasonsAndOperations();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason || !selectedQc || count < 1 || !qcPassword) {
            setError('Please fill in all required fields.');
            return;
        }

        const selectedQC = qcs.find(qc => qc.id === selectedQc && qc.password === qcPassword);
        if (!selectedQC) {
            setError('Invalid QC credentials.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const handleConfirm = async () => {
        const rejectData: RejectFormData = {
            reason,
            operation: operation || '',
            comments,
            qcId: selectedQc,
            count,
            recordedAsProduced: false,
            productionLineId,
            supervisorId
        };

        try {
            await onSubmit(rejectData);
            setReason('');
            setOperation('');
            setComments('');
            setSelectedQc('');
            setCount(1);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            alert('Reject logged successfully.');
        } catch (err) {
            console.error('Error submitting reject:', err);
            setError('Failed to log reject.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log Reject</h2>
                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit} className="reject-form">
                    <label>
                        Reason:
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="">Select Reason</option>
                            {reasonsList.length > 0 ? (
                                reasonsList.map((r, index) => (
                                    <option key={index} value={r}>{r}</option>
                                ))
                            ) : (
                                <option value="">No reasons available</option>
                            )}
                        </select>
                    </label>

                    <label>
                        Operation:
                        <select
                            value={operation}
                            onChange={(e) => setOperation(e.target.value)}
                        >
                            <option value="">Select Operation</option>
                            {operationsList.length > 0 ? (
                                operationsList.map((op) => (
                                    <option key={op.id} value={op.name}>
                                        {op.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">No operations available</option>
                            )}
                        </select>
                    </label>

                    <label>
                        Count:
                        <input
                            type="number"
                            min="1"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value))}
                            required
                        />
                    </label>

                    <label>
                        Quality Controller:
                        <select
                            value={selectedQc}
                            onChange={(e) => setSelectedQc(e.target.value)}
                            required
                        >
                            <option value="">Select QC</option>
                            {qcs.map((qc) => (
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
                            required
                        />
                    </label>

                    <label>
                        Comments:
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter any additional comments..."
                        />
                    </label>

                    <div className="form-buttons">
                        <button type="submit" className="submit-button">
                            Log Reject
                        </button>
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>

                {isConfirmModalOpen && (
                    <div className="confirmation-modal">
                        <div className="modal-content">
                            <h3>Confirm Reject</h3>
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reject;