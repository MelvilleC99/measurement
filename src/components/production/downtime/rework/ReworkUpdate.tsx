import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkRecord, ReworkUpdateProps } from '../types';
import { RejectFormData } from '../types';
import StandardList, { ListItemData } from '../../../StandardDesign/list/StandardList';
import StandardCard from '../../../StandardDesign/card/StandardCard';
import './ReworkUpdate.css';

const ReworkUpdate: React.FC<ReworkUpdateProps> = ({
                                                       onClose,
                                                       onUpdate,
                                                       lineId,
                                                       supervisorId,
                                                       sessionId
                                                   }) => {
    const [reworks, setReworks] = useState<ReworkRecord[]>([]);
    const [selectedRework, setSelectedRework] = useState<ReworkRecord | null>(null);
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'complete' | 'reject'>('complete');

    useEffect(() => {
        fetchReworks();
    }, [sessionId]);

    const fetchReworks = async () => {
        try {
            setIsLoading(true);
            const reworksQuery = query(
                collection(db, 'reworks'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'open')
            );

            const snapshot = await getDocs(reworksQuery);
            const fetchedReworks = snapshot.docs.map(doc => {
                const data = doc.data();
                const reworkRef = doc.id.slice(-4);
                return {
                    id: doc.id,
                    itemId: reworkRef,
                    count: data.count || 0,
                    reason: data.reason || '',
                    operation: data.operation || '',
                    qcId: data.qcId || '',
                    productionLineId: data.productionLineId || '',
                    supervisorId: data.supervisorId || '',
                    sessionId: data.sessionId || '',
                    styleNumber: data.styleNumber || '',
                    status: data.status || 'open',
                    comments: data.comments || '',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    refNumber: reworkRef
                } as ReworkRecord;
            });

            setReworks(fetchedReworks);
        } catch (err) {
            console.error('Error fetching reworks:', err);
            setError('Failed to load reworks');
        } finally {
            setIsLoading(false);
        }
    };

    const formatReworksForList = (reworks: ReworkRecord[]): ListItemData[] => {
        return reworks.map(rework => ({
            id: rework.id,
            title: `#${rework.itemId}`,
            subtitle: rework.reason,
            status: rework.status,
            metadata: {
                styleNumber: rework.styleNumber,
                count: rework.count,
                operation: rework.operation
            }
        }));
    };

    const renderReworkItem = (item: ListItemData) => (
        <div className="list-row">
            <div className="ref-cell">{item.title}</div>
            <div className="style-cell">{item.metadata?.styleNumber}</div>
            <div className="reason-cell">{item.subtitle}</div>
            <div className="operation-cell">{item.metadata?.operation || '-'}</div>
            <div className="count-cell">{item.metadata?.count}</div>
        </div>
    );

    const handleListItemClick = (item: ListItemData) => {
        const rework = reworks.find(r => r.id === item.id);
        if (rework) {
            setSelectedRework(rework);
            setIsConfirmModalOpen(false);
            setError('');
        }
    };

    const handleAction = (type: 'complete' | 'reject') => {
        if (!selectedRework) {
            setError('No rework selected');
            return;
        }
        setActionType(type);
        setIsConfirmModalOpen(true);
        setError('');
    };

    const handleConfirm = async () => {
        if (!selectedRework) return;

        try {
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedRework.qcId),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials');
                return;
            }

            const timestamp = serverTimestamp();

            if (actionType === 'complete') {
                await updateDoc(doc(db, 'reworks', selectedRework.id), {
                    status: 'closed',
                    closedAt: timestamp,
                    closedBy: selectedRework.qcId,
                    updatedAt: timestamp
                });
            } else {
                const rejectData: RejectFormData = {
                    reason: selectedRework.reason,
                    operation: selectedRework.operation,
                    comments: `Converted from Rework #${selectedRework.itemId}. ${selectedRework.comments}`,
                    qcId: selectedRework.qcId,
                    count: selectedRework.count,
                    recordedAsProduced: false,
                    productionLineId: selectedRework.productionLineId,
                    supervisorId: selectedRework.supervisorId,
                    sessionId: selectedRework.sessionId,
                    styleNumber: selectedRework.styleNumber,
                    status: 'open'
                };

                await Promise.all([
                    addDoc(collection(db, 'rejects'), {
                        ...rejectData,
                        createdAt: timestamp,
                        updatedAt: timestamp
                    }),
                    updateDoc(doc(db, 'reworks', selectedRework.id), {
                        status: 'rejected',
                        closedAt: timestamp,
                        closedBy: selectedRework.qcId,
                        updatedAt: timestamp
                    })
                ]);
            }

            await fetchReworks();
            if (onUpdate) {
                onUpdate();
            }

            setSelectedRework(null);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            setError('');
        } catch (err) {
            console.error('Error updating rework:', err);
            setError('Failed to update rework');
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
                title={selectedRework ? 'Rework Details' : 'Manage Reworks'}
                onClose={selectedRework ? () => setSelectedRework(null) : onClose}
            >
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                {!selectedRework ? (
                    <StandardList
                        items={formatReworksForList(reworks)}
                        onItemClick={handleListItemClick}
                        renderItemContent={renderReworkItem}
                        emptyMessage="No active reworks to display"
                    />
                ) : (
                    <div className="selected-item-view">
                        {!isConfirmModalOpen ? (
                            <>
                                <div className="details-grid">
                                    <p><strong>Reference #:</strong> {selectedRework.itemId}</p>
                                    <p><strong>Style Number:</strong> {selectedRework.styleNumber}</p>
                                    <p><strong>Reason:</strong> {selectedRework.reason}</p>
                                    <p><strong>Count:</strong> {selectedRework.count}</p>
                                    {selectedRework.operation && (
                                        <p><strong>Operation:</strong> {selectedRework.operation}</p>
                                    )}
                                    {selectedRework.comments && (
                                        <p><strong>Comments:</strong> {selectedRework.comments}</p>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <button
                                        onClick={() => handleAction('complete')}
                                        className="btn-complete"
                                    >
                                        Mark as Complete
                                    </button>
                                    <button
                                        onClick={() => handleAction('reject')}
                                        className="btn-reject"
                                    >
                                        Convert to Reject
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="details-grid">
                                    <h3>
                                        Confirm {actionType === 'complete' ? 'Complete' : 'Convert to Reject'}
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

export default ReworkUpdate;