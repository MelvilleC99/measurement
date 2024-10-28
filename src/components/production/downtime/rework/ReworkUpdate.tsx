import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkItem, RejectFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './ReworkUpdate.css';

interface ReworkUpdateProps {
    onClose: () => void;
}

const ReworkUpdate: React.FC<ReworkUpdateProps> = ({ onClose }) => {
    const [reworks, setReworks] = useState<ReworkItem[]>([]);
    const [selectedRework, setSelectedRework] = useState<ReworkItem | null>(null);
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'complete' | 'reject'>('complete');

    useEffect(() => {
        const fetchReworksAndQCs = async () => {
            try {
                const reworksSnapshot = await getDocs(query(collection(db, 'reworks'), where('status', '==', 'Open')));
                const fetchedReworks: ReworkItem[] = reworksSnapshot.docs.map(doc => ({
                    id: doc.id,
                    refNumber: doc.data().refNumber,
                    count: doc.data().count,
                    reason: doc.data().reason,
                    operation: doc.data().operation,
                    startTime: doc.data().startTime,
                    endTime: doc.data().endTime,
                    status: doc.data().status,
                    productionLineId: doc.data().productionLineId,
                    supervisorId: doc.data().supervisorId,
                    qcId: doc.data().qcId,
                    comments: doc.data().comments,
                    createdAt: doc.data().createdAt,
                    updatedAt: doc.data().updatedAt
                }));

                setReworks(fetchedReworks);

                // Updated QC query to match database structure
                const qcsSnapshot = await getDocs(query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'QC'),
                    where('hasPassword', '==', true)
                ));
                const fetchedQCs: SupportFunction[] = qcsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SupportFunction[];
                setQcs(fetchedQCs);
            } catch (err) {
                console.error('Error fetching reworks or QCs:', err);
                setError('Failed to load reworks or QCs.');
            }
        };

        fetchReworksAndQCs();
    }, []);

    const handleSelectRework = (rework: ReworkItem) => {
        setSelectedRework(rework);
        setError(''); // Clear any previous errors
    };

    const handleAction = (type: 'complete' | 'reject') => {
        if (!selectedRework) {
            setError('No rework selected.');
            return;
        }
        setActionType(type);
        setIsConfirmModalOpen(true);
        setError(''); // Clear any previous errors
    };

    const handleConfirm = async () => {
        if (!selectedRework) return;

        try {
            // Updated QC verification query to match database structure
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedRework.qcId),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials. Please check your password.');
                return;
            }

            if (actionType === 'complete') {
                await updateDoc(doc(db, 'reworks', selectedRework.id), {
                    status: 'Booked In',
                    endTime: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
                alert('Rework marked as complete.');
            } else if (actionType === 'reject') {
                // Create a reject entry
                const rejectData: RejectFormData = {
                    reason: selectedRework.reason,
                    operation: selectedRework.operation,
                    comments: selectedRework.comments,
                    qcId: selectedRework.qcId,
                    count: selectedRework.count,
                    recordedAsProduced: false,
                    productionLineId: selectedRework.productionLineId,
                    supervisorId: selectedRework.supervisorId
                };
                await addDoc(collection(db, 'rejects'), rejectData);

                // Update rework status
                await updateDoc(doc(db, 'reworks', selectedRework.id), {
                    status: 'Rejected',
                    endTime: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
                alert('Rework converted to reject.');
            }

            // Refresh reworks list
            const reworksSnapshot = await getDocs(query(collection(db, 'reworks'), where('status', '==', 'Open')));
            const fetchedReworks: ReworkItem[] = reworksSnapshot.docs.map(doc => ({
                id: doc.id,
                refNumber: doc.data().refNumber,
                count: doc.data().count,
                reason: doc.data().reason,
                operation: doc.data().operation,
                startTime: doc.data().startTime,
                endTime: doc.data().endTime,
                status: doc.data().status,
                productionLineId: doc.data().productionLineId,
                supervisorId: doc.data().supervisorId,
                qcId: doc.data().qcId,
                comments: doc.data().comments,
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt
            }));

            setReworks(fetchedReworks);

            // Reset selections
            setSelectedRework(null);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            setError(''); // Clear any errors on success
        } catch (err) {
            console.error('Error updating rework:', err);
            setError('Failed to update rework. Please try again.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="rework-update-modal">
                <h2>Manage Reworks</h2>
                {error && <p className="error-message">{error}</p>}

                {!selectedRework ? (
                    <div className="rework-list">
                        {reworks.length === 0 ? (
                            <p>No active reworks.</p>
                        ) : (
                            reworks.map(rework => (
                                <div key={rework.id} className="rework-card" onClick={() => handleSelectRework(rework)}>
                                    <p><strong>Ref Number:</strong> {rework.refNumber || rework.id.slice(-4)}</p>
                                    <p><strong>Reason:</strong> {rework.reason}</p>
                                    <p><strong>Operation:</strong> {rework.operation}</p>
                                    <p><strong>Comments:</strong> {rework.comments || 'N/A'}</p>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="rework-actions">
                        <h3>Selected Rework: {selectedRework.refNumber || selectedRework.id.slice(-4)}</h3>
                        <p><strong>Reason:</strong> {selectedRework.reason}</p>
                        <p><strong>Operation:</strong> {selectedRework.operation}</p>
                        <p><strong>Comments:</strong> {selectedRework.comments || 'N/A'}</p>

                        <div className="action-buttons">
                            <button onClick={() => handleAction('complete')} className="complete-button">Rework Complete</button>
                            <button onClick={() => handleAction('reject')} className="reject-button">Convert to Reject</button>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {isConfirmModalOpen && (
                    <div className="modal-overlay">
                        <div className="confirmation-modal">
                            <h3>Confirm Action</h3>
                            <p>Enter QC Password to confirm.</p>
                            <input
                                type="password"
                                value={qcPassword}
                                onChange={(e) => setQcPassword(e.target.value)}
                                placeholder="QC Password"
                            />
                            <div className="modal-buttons">
                                <button onClick={handleConfirm} className="confirm-button">Confirm</button>
                                <button onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setQcPassword('');
                                    setError('');
                                }} className="cancel-button">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                <button onClick={onClose} className="close-modal-button">✕</button>
            </div>
        </div>
    );
};

export default ReworkUpdate;