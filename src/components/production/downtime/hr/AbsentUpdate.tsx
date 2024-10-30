// AbsentUpdate.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import './AbsentUpdate.css';

interface AbsentUpdateProps {
    onClose: () => void;
    onUpdate: () => void;
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface AbsentRecord {
    id: string;
    employeeId: string;
    employeeNumber: string;
    name: string;
    surname: string;
    reason?: string;
    startDate: Date;
    endDate: Date;
    returned: boolean;
    returnDate?: Date;
    productionLineId: string;
    supervisorId: string;
    comments?: string;
    updatedAt: Timestamp;
    updatedBy?: string;
    sessionId: string;
}

const AbsentUpdate: React.FC<AbsentUpdateProps> = ({
                                                       onClose,
                                                       onUpdate,
                                                       sessionId,
                                                       lineId,
                                                       supervisorId
                                                   }) => {
    const [absentRecords, setAbsentRecords] = useState<AbsentRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<AbsentRecord | null>(null);
    const [supervisorPassword, setSupervisorPassword] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        fetchAbsentRecords();
    }, [sessionId]);

    const fetchAbsentRecords = async () => {
        try {
            setIsLoading(true);
            const absentQuery = query(
                collection(db, 'absent'),
                where('sessionId', '==', sessionId),
                where('returned', '==', false)
            );
            const snapshot = await getDocs(absentQuery);
            const records: AbsentRecord[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    employeeId: data.employeeId,
                    employeeNumber: data.employeeNumber,
                    name: data.name,
                    surname: data.surname,
                    reason: data.reason,
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate.toDate(),
                    returned: data.returned,
                    returnDate: data.returnDate?.toDate(),
                    productionLineId: data.productionLineId,
                    supervisorId: data.supervisorId,
                    comments: data.comments,
                    updatedAt: data.updatedAt,
                    updatedBy: data.updatedBy,
                    sessionId: data.sessionId
                };
            });

            setAbsentRecords(records);
        } catch (err) {
            console.error('Error fetching absent records:', err);
            setError('Failed to load absent records');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecordSelect = (record: AbsentRecord) => {
        setSelectedRecord(record);
        setComments('');
        setReturnDate(new Date().toISOString().split('T')[0]);
    };

    const validateDates = (returnDateStr: string, record: AbsentRecord): boolean => {
        const returnDateObj = new Date(returnDateStr);
        return returnDateObj >= record.startDate;
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

    const handleMarkReturned = () => {
        if (!selectedRecord) {
            setError('No record selected');
            return;
        }

        if (!returnDate) {
            setError('Please select a return date');
            return;
        }

        if (!validateDates(returnDate, selectedRecord)) {
            setError('Return date cannot be before start date');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const handleConfirm = async () => {
        try {
            if (!selectedRecord || !returnDate) return;

            const isSupervisorVerified = await verifySupervisor();
            if (!isSupervisorVerified) {
                setError('Invalid supervisor password');
                return;
            }

            const recordRef = doc(db, 'absent', selectedRecord.id);
            const updateData = {
                returned: true,
                returnDate: Timestamp.fromDate(new Date(returnDate)),
                comments: comments || 'Marked as returned',
                updatedAt: Timestamp.now(),
                updatedBy: supervisorId
            };

            await updateDoc(recordRef, updateData);

            setSelectedRecord(null);
            setSupervisorPassword('');
            setComments('');
            setReturnDate(new Date().toISOString().split('T')[0]);
            setIsConfirmModalOpen(false);

            await fetchAbsentRecords();
            onUpdate();
        } catch (err) {
            console.error('Error updating absent record:', err);
            setError('Failed to update record');
        }
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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
                    <h2>Update Absent Records</h2>
                    <button
                        onClick={onClose}
                        className="close-button"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button
                            onClick={() => setError('')}
                            className="error-dismiss"
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {!selectedRecord ? (
                    <div className="absent-records-list">
                        {absentRecords.length === 0 ? (
                            <div className="no-records">No absent records to display</div>
                        ) : (
                            absentRecords.map(record => (
                                <div
                                    key={record.id}
                                    className="absent-record-item"
                                    onClick={() => handleRecordSelect(record)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="record-header">
                                        <h3>{record.name} {record.surname}</h3>
                                        <span className="employee-number">
                                            {record.employeeNumber}
                                        </span>
                                    </div>
                                    <div className="record-details">
                                        <p>Start Date: {formatDate(record.startDate)}</p>
                                        <p>Expected Return: {formatDate(record.endDate)}</p>
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
                            <p>Start Date: {formatDate(selectedRecord.startDate)}</p>
                            <p>Expected Return: {formatDate(selectedRecord.endDate)}</p>
                            {selectedRecord.reason && (
                                <p>Reason: {selectedRecord.reason}</p>
                            )}
                        </div>

                        <div className="return-form">
                            <div className="form-group">
                                <label htmlFor="returnDate">Return Date:</label>
                                <input
                                    id="returnDate"
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    min={selectedRecord.startDate.toISOString().split('T')[0]}
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
                                    placeholder="Add any comments about the return..."
                                    className="form-textarea"
                                />
                            </div>

                            <button
                                onClick={handleMarkReturned}
                                className="return-button"
                            >
                                Mark as Returned
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

                {isConfirmModalOpen && selectedRecord && (
                    <div className="confirmation-modal">
                        <div className="confirmation-content">
                            <h3>Confirm Return</h3>

                            <div className="confirmation-details">
                                <p>
                                    <strong>Employee:</strong> {selectedRecord.name} {selectedRecord.surname}
                                </p>
                                <p>
                                    <strong>Return Date:</strong> {formatDate(new Date(returnDate))}
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

                            <div className="confirmation-buttons">
                                <button
                                    onClick={handleConfirm}
                                    className="confirm-button"
                                >
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

export default AbsentUpdate;