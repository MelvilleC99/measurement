// Reject.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { RejectFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './Reject.css';

interface RejectProps {
    onClose: () => void;
    onSubmit: (rejectData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
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
    const [operationsList, setOperationsList] = useState<{ id: string; name: string; }[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch reject reasons from downtimeCategories
                const reasonsQuery = query(
                    collection(db, 'downtimeCategories'),
                    where('name', '==', 'Reject')
                );
                const reasonsSnapshot = await getDocs(reasonsQuery);
                const fetchedReasons = reasonsSnapshot.docs.flatMap(doc =>
                    doc.data().reasons || []
                );
                setReasonsList(fetchedReasons);

                // Fetch operations from productHierarchy
                const operationsSnapshot = await getDocs(collection(db, 'productHierarchy'));
                const fetchedOperations: { id: string; name: string; }[] = [];

                operationsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.subCategories && Array.isArray(data.subCategories)) {
                        data.subCategories.forEach((subCategory: any) => {
                            if (subCategory.operations && Array.isArray(subCategory.operations)) {
                                subCategory.operations.forEach((operation: any) => {
                                    if (operation.name) {
                                        fetchedOperations.push({
                                            id: `${doc.id}-${operation.name}`,
                                            name: operation.name
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                setOperationsList(fetchedOperations);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load reasons and operations');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason || !selectedQc || count < 1 || !qcPassword) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            // Verify QC credentials
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedQc),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials');
                return;
            }

            setIsConfirmModalOpen(true);
        } catch (err) {
            console.error('Error verifying QC:', err);
            setError('Failed to verify QC credentials');
        }
    };

    const handleConfirm = async () => {
        try {
            const rejectData: RejectFormData = {
                reason,
                operation,
                comments,
                qcId: selectedQc,
                count,
                recordedAsProduced: false,
                productionLineId,
                supervisorId
            };

            await onSubmit(rejectData);

            // Reset form
            setReason('');
            setOperation('');
            setComments('');
            setSelectedQc('');
            setQcPassword('');
            setCount(1);
            setIsConfirmModalOpen(false);

            onClose();
        } catch (err) {
            console.error('Error submitting reject:', err);
            setError('Failed to submit reject');
        }
    };

    if (isLoading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="loading-state">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log Reject</h2>
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="error-dismiss">×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="reject-form">
                    <label>
                        Reason:
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        >
                            <option value="">Select Reason</option>
                            {reasonsList.map((r, index) => (
                                <option key={index} value={r}>{r}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Operation:
                        <select
                            value={operation}
                            onChange={(e) => setOperation(e.target.value)}
                        >
                            <option value="">Select Operation</option>
                            {operationsList.map((op) => (
                                <option key={op.id} value={op.name}>
                                    {op.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Count:
                        <input
                            type="number"
                            min="1"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
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
                                <option key={qc.id} value={qc.employeeNumber || qc.id}>
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
                            placeholder="Enter additional comments..."
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
                        <div className="confirmation-content">
                            <h3>Confirm Reject</h3>
                            <div className="confirmation-details">
                                <p><strong>Reason:</strong> {reason}</p>
                                <p><strong>Count:</strong> {count}</p>
                                {operation && (
                                    <p><strong>Operation:</strong> {operation}</p>
                                )}
                            </div>
                            <div className="confirmation-buttons">
                                <button onClick={handleConfirm} className="confirm-button">
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reject;