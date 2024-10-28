import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkFormData, ReworkProps } from '../types';
import './Rework.css';

const Rework: React.FC<ReworkProps> = ({ onClose, onSubmit, productionLineId, supervisorId, qcs }) => {
    const [reason, setReason] = useState<string>('');
    const [operation, setOperation] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [operationsList, setOperationsList] = useState<string[]>([]);
    const [selectedQc, setSelectedQc] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [count, setCount] = useState<number>(1);

    useEffect(() => {
        const fetchReasonsAndOperations = async () => {
            try {
                // Fetch reasons from downtimeCategories for "Rework"
                const reasonsSnapshot = await getDocs(query(collection(db, 'downtimeCategories'), where('name', '==', 'Rework')));
                const fetchedReasons: string[] = reasonsSnapshot.docs.flatMap(doc => doc.data().reasons || []);
                setReasonsList(fetchedReasons);

                // Fetch operations from productHierarchy
                const productHierarchySnapshot = await getDocs(collection(db, 'productHierarchy'));
                const fetchedOperations: string[] = [];

                productHierarchySnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Check if document has subCategories
                    if (data.subCategories && Array.isArray(data.subCategories)) {
                        data.subCategories.forEach((subCategory: any) => {
                            // Extract operations from each subCategory
                            if (subCategory.operations && Array.isArray(subCategory.operations)) {
                                subCategory.operations.forEach((operation: any) => {
                                    if (operation.name) {
                                        fetchedOperations.push(operation.name);
                                    }
                                });
                            }
                        });
                    }
                });

                setOperationsList(fetchedOperations);
            } catch (err) {
                console.error('Error fetching reasons and operations:', err);
                setError('Failed to load reasons and operations.');
            }
        };

        fetchReasonsAndOperations();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason || !operation || !selectedQc || !qcPassword || count < 1) {
            setError('Please fill in all required fields correctly.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const handleConfirm = async () => {
        try {
            // Updated QC verification query with correct field names
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedQc),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')  // Match exact role case
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials. Please check the QC ID and password.');
                console.log('Debug - Selected QC:', selectedQc); // Debug log
                return;
            }

            // Prepare rework data
            const reworkData: ReworkFormData = {
                reason,
                operation,
                comments,
                qcId: selectedQc,
                count,
                productionLineId,
                supervisorId
            };

            // Call onSubmit prop with reworkData
            await onSubmit(reworkData);

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
            console.error('Error submitting rework:', err);
            setError('Failed to submit rework. Please try again.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="rework-modal">
                <h2>Log Rework</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="rework-form">
                    <label>
                        Reason:
                        <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                            <option value="">Select Reason</option>
                            {reasonsList.map((r, index) => (
                                <option key={index} value={r}>{r}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Operation:
                        <select value={operation} onChange={(e) => setOperation(e.target.value)} required>
                            <option value="">Select Operation</option>
                            {operationsList.map((op, index) => (
                                <option key={index} value={op}>{op}</option>
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
                        Comments:
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter comments..."
                        />
                    </label>

                    <label>
                        Select QC:
                        <select value={selectedQc} onChange={(e) => setSelectedQc(e.target.value)} required>
                            <option value="">Select QC</option>
                            {qcs.map((qc) => (
                                <option key={qc.id} value={qc.employeeNumber || qc.id}>{qc.name} {qc.surname}</option>
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

                    <div className="form-buttons">
                        <button type="submit" className="confirm-button">Confirm</button>
                        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                    </div>
                </form>

                {isConfirmModalOpen && (
                    <div className="modal-overlay">
                        <div className="confirmation-modal">
                            <h3>Confirm Rework</h3>
                            <p>Are you sure you want to log this rework?</p>
                            <div className="modal-buttons">
                                <button onClick={handleConfirm} className="confirm-button">Yes, Confirm</button>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="cancel-button">No, Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Rework;