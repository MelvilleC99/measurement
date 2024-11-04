import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './Rework.css';

interface ReworkProps {
    onClose: () => void;
    onSubmit: (reworkData: ReworkFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    qcs: SupportFunction[];
}

const Rework: React.FC<ReworkProps> = ({
                                           onClose,
                                           onSubmit,
                                           productionLineId,
                                           supervisorId,
                                           sessionId,
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
    const [styleNumber, setStyleNumber] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Get current style number
                const lineDoc = await getDoc(doc(db, 'productionLines', productionLineId));
                setStyleNumber(lineDoc.data()?.currentStyle || '');

                // Get rework reasons
                const reasonsQuery = query(
                    collection(db, 'downtimeCategories'),
                    where('name', '==', 'Rework')
                );
                const reasonsSnapshot = await getDocs(reasonsQuery);
                const fetchedReasons = reasonsSnapshot.docs.flatMap(doc =>
                    doc.data().reasons || []
                );
                setReasonsList(fetchedReasons);

                // Get operations
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
                setError('Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productionLineId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason || !operation || !selectedQc || count < 1 || !qcPassword) {
            setError('Please fill in all required fields');
            return;
        }

        try {
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
            const reworkData: ReworkFormData = {
                reason,
                operation,
                comments,
                qcId: selectedQc,
                count,
                productionLineId,
                supervisorId,
                sessionId,
                styleNumber,
                status: 'open',
            };

            await addDoc(collection(db, 'reworks'), {
                ...reworkData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await onSubmit(reworkData);
            setReason('');
            setOperation('');
            setComments('');
            setSelectedQc('');
            setQcPassword('');
            setCount(1);
            setIsConfirmModalOpen(false);
            onClose();
        } catch (err) {
            console.error('Error submitting rework:', err);
            setError('Failed to submit rework');
            setIsConfirmModalOpen(false);
        }
    };

// ... continuing from Part 1

    if (isLoading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="loading-spinner">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    {/* Header */}
                    <div className="modal-header">
                        <h2>Log Rework</h2>
                        <button
                            onClick={onClose}
                            className="close-button"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>

                    <div className="style-banner">
                        <span>Current Style: {styleNumber}</span>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                            <button onClick={() => setError('')} className="error-dismiss">×</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="compact-form">
                        <div className="form-group">
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                className="form-select"
                            >
                                <option value="">Select Reason *</option>
                                {reasonsList.map((r, index) => (
                                    <option key={index} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <select
                                value={operation}
                                onChange={(e) => setOperation(e.target.value)}
                                required
                                className="form-select"
                            >
                                <option value="">Select Operation *</option>
                                {operationsList.map((op) => (
                                    <option key={op.id} value={op.name}>
                                        {op.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <input
                                type="number"
                                min="1"
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                                required
                                className="form-input"
                                placeholder="Enter Count *"
                            />
                        </div>

                        <div className="form-group">
                            <select
                                value={selectedQc}
                                onChange={(e) => setSelectedQc(e.target.value)}
                                required
                                className="form-select"
                            >
                                <option value="">Select QC *</option>
                                {qcs.map((qc) => (
                                    <option key={qc.id} value={qc.employeeNumber || qc.id}>
                                        {qc.name} {qc.surname}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <input
                                type="password"
                                value={qcPassword}
                                onChange={(e) => setQcPassword(e.target.value)}
                                required
                                className="form-input"
                                placeholder="QC Password *"
                            />
                        </div>

                        <div className="form-group">
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Comments (optional)"
                                rows={3}
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-buttons">
                            <button type="button" onClick={onClose} className="cancel-button">
                                Cancel
                            </button>
                            <button type="submit" className="submit-button">
                                Submit Rework
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="confirmation-modal">
                    <div className="confirmation-content">
                        <h3>Confirm Rework</h3>
                        <div className="confirmation-details">
                            <p><strong>Style:</strong> {styleNumber}</p>
                            <p><strong>Reason:</strong> {reason}</p>
                            <p><strong>Operation:</strong> {operation}</p>
                            <p><strong>Count:</strong> {count}</p>
                        </div>
                        <div className="confirmation-buttons">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button onClick={handleConfirm} className="confirm-button">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Rework;