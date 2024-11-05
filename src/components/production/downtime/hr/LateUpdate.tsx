// Updated LateUpdate component
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { LateFormData } from '../types';
import StandardList, { ListItemData } from '../../../StandardDesign/list/StandardList';
import StandardCard from '../../../StandardDesign/card/StandardCard';
import './LateUpdate.css';

interface LateUpdateProps {
    onClose: () => void;
    onUpdate: () => void;
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface LateRecord {
    id: string;
    date: Date;
    employeeId: string;
    employeeNumber: string;
    name: string;
    surname: string;
    status: 'late';
    updatedAt: Timestamp;
    updatedBy?: string;
    comments?: string;
    time: string;
    reason?: string;
}

const LateUpdate: React.FC<LateUpdateProps> = ({
                                                   onClose,
                                                   onUpdate,
                                                   sessionId,
                                                   lineId,
                                                   supervisorId
                                               }) => {
    const [lateRecords, setLateRecords] = useState<LateRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<LateRecord | null>(null);
    const [supervisorPassword, setSupervisorPassword] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent' | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchLateRecords();
    }, [sessionId]);

    const fetchLateRecords = async () => {
        try {
            setIsLoading(true);
            const lateQuery = query(
                collection(db, 'attendance'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'late')
            );
            const snapshot = await getDocs(lateQuery);
            const records: LateRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date.toDate()
            } as LateRecord));

            setLateRecords(records);
        } catch (err) {
            console.error('Error fetching late records:', err);
            setError('Failed to load late records');
        } finally {
            setIsLoading(false);
        }
    };

    const formatLateRecordsForList = (records: LateRecord[]): ListItemData[] => {
        return records.map(record => ({
            id: record.id,
            title: record.name,
            subtitle: 'Late',
            metadata: {
                employeeNumber: record.employeeNumber,
                name: record.name,
                surname: record.surname
            }
        }));
    };

    const renderLateRecordItem = (item: ListItemData) => {
        const {
            metadata: {
                employeeNumber = 'N/A',
                name = 'N/A',
                surname = 'N/A'
            } = {}
        } = item;

        return (
            <div className="list-row">
                <div className="list-cell"><strong>Employee #:</strong> {employeeNumber}</div>
                <div className="list-cell"><strong>Name:</strong> {name}</div>
                <div className="list-cell"><strong>Surname:</strong> {surname}</div>
                <div className="list-cell"><strong>Status:</strong> Late</div>
            </div>
        );
    };

    const handleListItemClick = (item: ListItemData) => {
        const record = lateRecords.find(r => r.id === item.id);
        if (record) {
            setSelectedRecord(record);
            setComments('');
            setSelectedStatus(null);
            setError('');
        }
    };

    const verifySupervisor = async (): Promise<boolean> => {
        try {
            const supervisorSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('id', '==', supervisorId),
                where('password', '==', supervisorPassword),
                where('role', '==', 'Supervisor')
            ));

            return !supervisorSnapshot.empty;
        } catch (err) {
            console.error('Error verifying supervisor:', err);
            return false;
        }
    };

    const handleStatusUpdate = (status: 'present' | 'absent') => {
        if (!selectedRecord) {
            setError('No record selected');
            return;
        }
        setSelectedStatus(status);
        setIsConfirmModalOpen(true);
    };

    const addAbsentRecord = async () => {
        if (!selectedRecord) return;

        try {
            const absentData = {
                employeeId: selectedRecord.employeeId,
                reason: selectedRecord.reason || '',
                startDate: selectedRecord.date,
                endDate: selectedRecord.date,
                productionLineId: lineId,
                supervisorId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                status: 'open',
                employeeNumber: selectedRecord.employeeNumber,
                name: selectedRecord.name,
                surname: selectedRecord.surname,
                comments: comments || ''
            };

            await addDoc(collection(db, 'absent'), absentData);
        } catch (err) {
            console.error('Error creating absent record:', err);
            throw err;
        }
    };

    const handleConfirm = async () => {
        try {
            if (!selectedRecord || !selectedStatus) return;

            const isSupervisorVerified = await verifySupervisor();
            if (!isSupervisorVerified) {
                setError('Invalid supervisor password');
                return;
            }

            const recordRef = doc(db, 'attendance', selectedRecord.id);
            const updateData = {
                status: selectedStatus,
                comments: comments || `Marked as ${selectedStatus}`,
                updatedAt: Timestamp.now(),
                updatedBy: supervisorId
            };

            await updateDoc(recordRef, updateData);

            if (selectedStatus === 'absent') {
                await addAbsentRecord();
            }

            setSelectedRecord(null);
            setSupervisorPassword('');
            setComments('');
            setIsConfirmModalOpen(false);
            setSelectedStatus(null);

            await fetchLateRecords();
            onUpdate();
        } catch (err) {
            console.error('Error updating late record:', err);
            setError('Failed to update record');
        }
    };

    const getStatusDisplayText = (status: 'present' | 'absent' | null): string => {
        if (!status) return '';
        return status.charAt(0).toUpperCase() + status.slice(1);
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
                title={selectedRecord ? 'Update Late Record' : 'Update Late Records'}
                onClose={selectedRecord && !isConfirmModalOpen ? () => setSelectedRecord(null) : onClose}
            >
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                {!selectedRecord ? (
                    <StandardList
                        items={formatLateRecordsForList(lateRecords)}
                        onItemClick={handleListItemClick}
                        renderItemContent={renderLateRecordItem}
                        emptyMessage="No late records to display"
                    />
                ) : (
                    <div className="selected-item-view">
                        {!isConfirmModalOpen ? (
                            <>
                                <div className="details-grid">
                                    <p><strong>Name:</strong> {selectedRecord.name} {selectedRecord.surname}</p>
                                    <p><strong>Employee #:</strong> {selectedRecord.employeeNumber}</p>
                                    <p><strong>Date:</strong> {selectedRecord.date.toLocaleDateString()}</p>
                                    <p><strong>Time:</strong> {selectedRecord.time}</p>
                                    {selectedRecord.reason && (
                                        <p><strong>Reason:</strong> {selectedRecord.reason}</p>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <button
                                        onClick={() => handleStatusUpdate('present')}
                                        className="btn-present"
                                    >
                                        Mark as Present
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('absent')}
                                        className="btn-absent"
                                    >
                                        Mark as Absent
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="details-grid">
                                    <h3>
                                        Confirm Status Update: {getStatusDisplayText(selectedStatus)}
                                    </h3>
                                    <div className="confirmation-inputs">
                                        <input
                                            type="password"
                                            value={supervisorPassword}
                                            onChange={(e) => setSupervisorPassword(e.target.value)}
                                            placeholder="Enter Supervisor Password"
                                            className="supervisor-password-input"
                                            autoFocus
                                        />
                                        <textarea
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Add comments (optional)"
                                            className="comments-input"
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
                                            setSupervisorPassword('');
                                            setComments('');
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

export default LateUpdate;
