// LateUpdate.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { LateFormData } from '../types';
import './LateUpdate.css';

interface LateUpdateProps {
    onClose: () => void;
    onUpdate: () => void;
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface LateRecord extends Omit<LateFormData, 'date'> {
    id: string;
    date: Date;
    employeeId: string;
    employeeNumber: string;
    name: string;
    surname: string;
    status: 'open'
    updatedAt: Timestamp;
    updatedBy?: string;
    comments?: string;
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

    const handleRecordSelect = (record: LateRecord) => {
        setSelectedRecord(record);
        setComments('');
        setSelectedStatus(null);
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

            // If marked as absent, create an absent record
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
                <div className="modal-header">
                    <h2>Update Late Records</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="error-dismiss">×</button>
                    </div>
                )}

                {!selectedRecord ? (
                    <div className="late-records-list">
                        {lateRecords.length === 0 ? (
                            <div className="no-records">No late records to display</div>
                        ) : (
                            lateRecords.map(record => (
                                <div
                                    key={record.id}
                                    className="late-record-item"
                                    onClick={() => handleRecordSelect(record)}
                                >
                                    <div className="record-header">
                                        <h3>{record.name} {record.surname}</h3>
                                        <span className="employee-number">
                                            {record.employeeNumber}
                                        </span>
                                    </div>
                                    <div className="record-details">
                                        <p>Date: {record.date.toLocaleDateString()}</p>
                                        <p>Time: {record.time}</p>
                                        {record.reason && (
                                            <p>Reason: {record.reason}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="update-section">
                        <div className="selected-record-info">
                            <h3>{selectedRecord.name} {selectedRecord.surname}</h3>
                            <p>Employee #: {selectedRecord.employeeNumber}</p>
                            <p>Date: {selectedRecord.date.toLocaleDateString()}</p>
                            <p>Time: {selectedRecord.time}</p>
                            {selectedRecord.reason && (
                                <p>Reason: {selectedRecord.reason}</p>
                            )}
                        </div>

                        <div className="update-actions">
                            <button
                                onClick={() => handleStatusUpdate('present')}
                                className="present-button"
                            >
                                Mark as Present
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('absent')}
                                className="absent-button"
                            >
                                Mark as Absent
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="back-button"
                        >
                            Back to List
                        </button>
                    </div>
                )}

                {isConfirmModalOpen && selectedRecord && selectedStatus && (
                    <div className="confirmation-modal">
                        <div className="confirmation-content">
                            <h3>Confirm Update</h3>

                            <div className="confirmation-details">
                                <p>
                                    <strong>Employee:</strong> {selectedRecord.name} {selectedRecord.surname}
                                </p>
                                <p>
                                    <strong>New Status:</strong>{' '}
                                    {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                                </p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="supervisorPassword">
                                    Supervisor Password:
                                </label>
                                <input
                                    id="supervisorPassword"
                                    type="password"
                                    value={supervisorPassword}
                                    onChange={(e) => setSupervisorPassword(e.target.value)}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="comments">Comments:</label>
                                <textarea
                                    id="comments"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Add any comments..."
                                    className="form-textarea"
                                />
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

export default LateUpdate;