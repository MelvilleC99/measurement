import React, { useState, useEffect } from 'react';
import './Late.css';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    addDoc,
    Timestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { LateFormData, LateProps } from '../types'; // Corrected path
import {  Downtime } from '../types/Downtime'; // Corrected path
import { Employee, SupportFunction } from '../../../../types';

const Late: React.FC<LateProps> = ({ onClose, onSubmit, productionLineId, supervisorId }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [status, setStatus] = useState<'arrived' | 'absent'>('arrived');
    const [comments, setComments] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const supportFunctionsSnap = await getDocs(collection(db, 'supportFunctions'));
                const fetchedEmployees = supportFunctionsSnap.docs
                    .filter(doc => doc.data().role !== 'Supervisor')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Employee[];
                setEmployees(fetchedEmployees);
            } catch (err) {
                console.error('Error fetching employees:', err);
                setError('Failed to fetch employees.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedEmployeeId || !date || !time) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            if (status === 'arrived') {
                const lateQuery = query(
                    collection(db, 'downtime'),
                    where('employeeId', '==', selectedEmployeeId),
                    where('type', '==', 'late'),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );
                const lateSnap = await getDocs(lateQuery);
                if (!lateSnap.empty) {
                    const lateDoc = lateSnap.docs[0];
                    await updateDoc(doc(db, 'downtime', lateDoc.id), {
                        status: 'arrived',
                        comments: comments || '',
                        confirmedAt: Timestamp.now()
                    });
                } else {
                    setError('No late entry found for this employee.');
                    return;
                }
            } else if (status === 'absent') {
                const lateQuery = query(
                    collection(db, 'downtime'),
                    where('employeeId', '==', selectedEmployeeId),
                    where('type', '==', 'late'),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );
                const lateSnap = await getDocs(lateQuery);
                if (!lateSnap.empty) {
                    const lateDoc = lateSnap.docs[0];
                    const lateData = lateDoc.data() as Downtime;

                    const absentData = {
                        employeeId: lateData.employeeId || '',
                        reason: reason || '',
                        startDate: convertTimestampToDate(lateData.startTime),
                        endDate: new Date(),
                        productionLineId: lateData.productionLineId || '',
                        supervisorId: supervisorId,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                        type: 'absent' as const,
                        category: lateData.category || 'Absence',
                        status: 'Closed' as const,
                        startTime: lateData.startTime || Timestamp.now(),
                        comments: lateData.comments || '',
                    };

                    await addDoc(collection(db, 'absent'), absentData);
                    await updateDoc(doc(db, 'downtime', lateDoc.id), {
                        status: 'absent',
                        movedToAbsentAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                } else {
                    setError('No late entry found for this employee.');
                    return;
                }
            }

            setSelectedEmployeeId('');
            setReason('');
            setDate('');
            setTime('');
            setComments('');
            setStatus('arrived');
            alert('Late status updated successfully.');
            onClose();
        } catch (err) {
            console.error('Error updating late status:', err);
            setError('Failed to update late status.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Log Late Arrival</h2>
                {error && <p className="error-message">{error}</p>}
                {isLoading ? (
                    <p>Loading...</p>
                ) : (
                    <form onSubmit={handleSubmit} className="late-form">
                        <label>
                            Employee Number:
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                required
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.employeeNumber}>
                                        {emp.name} {emp.surname} ({emp.employeeNumber})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Reason:
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter reason (optional)..."
                            />
                        </label>
                        <label>
                            Date:
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </label>
                        <label>
                            Time:
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
                        </label>
                        {status === 'arrived' && (
                            <label>
                                Comments:
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Enter comments (optional)..."
                                />
                            </label>
                        )}
                        <label>
                            Status:
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'arrived' | 'absent')}
                                required
                            >
                                <option value="arrived">Arrived</option>
                                <option value="absent">Absent</option>
                            </select>
                        </label>
                        <div className="form-buttons">
                            <button type="submit" className="submit-button">Submit</button>
                            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const convertTimestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};

export default Late;