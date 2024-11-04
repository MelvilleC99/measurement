import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { RejectUpdateProps, RejectRecord } from '../types';
import StandardList, { ListItemData } from '../../../StandardDesign/list/StandardList';
import StandardCard from '../../../StandardDesign/card/StandardCard';
import './RejectUpdate.css';

interface RejectItem extends RejectRecord {
    refNumber?: string;
}

const RejectUpdate: React.FC<RejectUpdateProps> = ({
                                                       onClose,
                                                       onUpdate,
                                                       sessionId,
                                                       lineId,
                                                       supervisorId
                                                   }) => {
    const [rejects, setRejects] = useState<RejectItem[]>([]);
    const [selectedReject, setSelectedReject] = useState<RejectItem | null>(null);
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'perfect' | 'close' | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchRejects();
    }, [sessionId]);

    const fetchRejects = async () => {
        try {
            setIsLoading(true);
            const rejectsSnapshot = await getDocs(
                query(
                    collection(db, 'rejects'),
                    where('sessionId', '==', sessionId),
                    where('status', '==', 'open')
                )
            );

            const fetchedRejects = rejectsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                refNumber: doc.id.slice(-4)
            })) as RejectItem[];

            setRejects(fetchedRejects);
        } catch (err) {
            console.error('Error fetching rejects:', err);
            setError('Failed to load rejects');
        } finally {
            setIsLoading(false);
        }
    };

    const formatRejectsForList = (rejects: RejectItem[]): ListItemData[] => {
        return rejects.map(reject => ({
            id: reject.id,
            title: `#${reject.refNumber}`,
            subtitle: reject.reason,
            status: reject.status,
            metadata: {
                count: reject.count,
                operation: reject.operation
            }
        }));
    };

    const handleListItemClick = (item: ListItemData) => {
        const reject = rejects.find(r => r.id === item.id);
        if (reject) {
            setSelectedReject(reject);
            setIsConfirmModalOpen(false);
            setError('');
        }
    };

    const handleAction = (type: 'perfect' | 'close') => {
        if (!selectedReject) {
            setError('No reject selected');
            return;
        }
        setActionType(type);
        setIsConfirmModalOpen(true);
        setError('');
    };

    const verifyQC = async (): Promise<boolean> => {
        try {
            const qcSnapshot = await getDocs(
                query(
                    collection(db, 'supportFunctions'),
                    where('employeeNumber', '==', selectedReject?.qcId),
                    where('password', '==', qcPassword),
                    where('role', '==', 'QC')
                )
            );

            return !qcSnapshot.empty;
        } catch (err) {
            console.error('Error verifying QC:', err);
            return false;
        }
    };

    const handleConfirm = async () => {
        if (!selectedReject || !actionType) return;

        try {
            const isQCVerified = await verifyQC();
            if (!isQCVerified) {
                setError('Invalid QC credentials');
                return;
            }

            const rejectRef = doc(db, 'rejects', selectedReject.id);
            const updateData = {
                status: actionType === 'perfect' ? 'perfect' : 'closed',
                updatedAt: Timestamp.now(),
                updatedBy: selectedReject.qcId,
                comments: selectedReject.comments || `Marked as ${actionType}`,
                closedAt: Timestamp.now(),
                ...(actionType === 'perfect' ? {
                    fixedBy: selectedReject.qcId,
                    fixedAt: Timestamp.now()
                } : {})
            };

            await updateDoc(rejectRef, updateData);

            setSelectedReject(null);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            setActionType(null);

            await fetchRejects();
            onUpdate && onUpdate();
        } catch (err) {
            console.error('Error updating reject:', err);
            setError('Failed to update reject');
        }
    };

    if (isLoading) {
        return (
            <div className="modal-overlay">
                <StandardCard title="Loading">
                    <div className="loading-state">Loading...</div>
                </StandardCard>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <StandardCard
                title={selectedReject ? 'Reject Details' : 'Manage Rejects'}
                onClose={selectedReject ? () => setSelectedReject(null) : onClose}
            >
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                {!selectedReject ? (
                    <StandardList
                        items={formatRejectsForList(rejects)}
                        onItemClick={handleListItemClick}
                        renderItemContent={(item) => (
                            <div className="list-row">
                                <div className="ref-cell">{item.title}</div>
                                <div className="style-cell">{item.metadata?.styleNumber}</div>
                                <div className="reason-cell">{item.subtitle}</div>
                                <div className="operation-cell">{item.metadata?.operation || '-'}</div>
                                <div className="count-cell">{item.metadata?.count}</div>
                            </div>
                        )}
                        emptyMessage="No active rejects to display"
                    />
                ) : (
                    <div className="selected-item-view">
                        {!isConfirmModalOpen ? (
                            <>
                                <div className="details-grid">
                                    <p><strong>Reference #:</strong> {selectedReject.refNumber}</p>
                                    <p><strong>Reason:</strong> {selectedReject.reason}</p>
                                    <p><strong>Count:</strong> {selectedReject.count}</p>
                                    {selectedReject.operation && (
                                        <p><strong>Operation:</strong> {selectedReject.operation}</p>
                                    )}
                                    {selectedReject.comments && (
                                        <p><strong>Comments:</strong> {selectedReject.comments}</p>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <button
                                        onClick={() => handleAction('perfect')}
                                        className="btn-complete"
                                    >
                                        Mark as Perfect
                                    </button>
                                    <button
                                        onClick={() => handleAction('close')}
                                        className="btn-reject"
                                    >
                                        Close (End of Style)
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="details-grid">
                                    <h3>
                                        Confirm {actionType === 'perfect' ? 'Perfect' : 'Close'}
                                    </h3>
                                    <div className="confirmation-inputs">
                                        <input
                                            type="password"
                                            value={qcPassword}
                                            onChange={(e) => setQcPassword(e.target.value)}
                                            placeholder="Enter QC Password"
                                            className="qc-password-input"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="action-buttons">
                                    <button
                                        onClick={handleConfirm}
                                        className="btn-confirm"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsConfirmModalOpen(false);
                                            setQcPassword('');
                                        }}
                                        className="btn-cancel"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </StandardCard>
        </div>
    );
};

export default RejectUpdate;
