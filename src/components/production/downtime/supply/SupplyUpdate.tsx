import React, { useState, useEffect } from 'react';
import {
    updateDoc,
    doc,
    Timestamp,
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupportFunction } from '../../../../types';
import { SupplyRecord } from '../types';
import './SupplyUpdate.css';

interface SupplyUpdateProps {
    selectedDowntime: SupplyRecord;
    onClose: () => void;
}

const SupplyUpdate: React.FC<SupplyUpdateProps> = ({
                                                       selectedDowntime,
                                                       onClose
                                                   }) => {
    const [additionalComments, setAdditionalComments] = useState<string>('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                console.log('Starting supervisor fetch...');

                const supportFunctionsRef = collection(db, 'supportFunctions');
                const q = query(
                    supportFunctionsRef,
                    where('role', '==', 'Supervisor'),
                    where('hasPassword', '==', true)  // Updated to match your document structure
                );

                const querySnapshot = await getDocs(q);
                console.log('Query snapshot received:', querySnapshot.size, 'documents');

                const supervisorsList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Supervisor data:', data);
                    return {
                        id: doc.id,
                        ...data
                    } as SupportFunction;
                });

                console.log('Processed supervisors list:', supervisorsList);
                setSupervisors(supervisorsList);
            } catch (err) {
                console.error('Error in fetchSupervisors:', err);
                setError('Failed to fetch supervisors');
            }
        };

        fetchSupervisors();
    }, []);

    const handleResolveClick = () => {
        setShowPasswordModal(true);
        setError('');
    };

    const handlePasswordSubmit = async () => {
        if (!selectedSupervisorId || !password) {
            setError('Please select a supervisor and enter password');
            return;
        }

        try {
            console.log('Verifying supervisor:', selectedSupervisorId);

            // Updated query to match your document structure
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedSupervisorId),
                where('password', '==', password),
                where('role', '==', 'Supervisor'),
                where('hasPassword', '==', true)
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);
            console.log('Verification result:', {
                empty: supervisorSnapshot.empty,
                size: supervisorSnapshot.size
            });

            if (supervisorSnapshot.empty) {
                setError('Invalid supervisor credentials');
                return;
            }

            await updateDoc(doc(db, 'supplyDowntime', selectedDowntime.id), {
                status: 'Closed',
                supervisorId: selectedSupervisorId,
                additionalComments,
                resolvedAt: Timestamp.now(),
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onClose();
        } catch (err) {
            console.error('Error in handlePasswordSubmit:', err);
            setError('Failed to resolve downtime');
        }
    };

    const handleClose = () => {
        setShowPasswordModal(false);
        setPassword('');
        setSelectedSupervisorId('');
        setError('');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="supply-update">
                    <div className="modal-header">
                        <h2>Supply Downtime Details</h2>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>

                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="label">Reason:</span>
                            <span className="value">{selectedDowntime.reason}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Comments:</span>
                            <span className="value">{selectedDowntime.comments}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Start Time:</span>
                            <span className="value">
                                {selectedDowntime.startTime.toDate().toLocaleTimeString()}
                            </span>
                        </div>
                    </div>

                    <div className="resolution-form">
                        <label className="form-label">Additional Comments:</label>
                        <textarea
                            value={additionalComments}
                            onChange={(e) => setAdditionalComments(e.target.value)}
                            className="form-textarea"
                            placeholder="Enter any additional comments..."
                            rows={4}
                        />
                    </div>

                    <div className="action-buttons">
                        <button onClick={handleResolveClick} className="resolve-button">
                            Resolve Downtime
                        </button>
                    </div>
                </div>
            </div>

            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal-content password-modal">
                        <div className="modal-header">
                            <h3>Supervisor Verification</h3>
                            <button className="close-button" onClick={handleClose}>×</button>
                        </div>
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Select Supervisor:</label>
                            <select
                                value={selectedSupervisorId}
                                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                                className="form-input"
                                required
                            >
                                <option value="">Select Supervisor</option>
                                {supervisors.map((supervisor) => (
                                    <option
                                        key={supervisor.id}
                                        value={supervisor.employeeNumber}
                                    >
                                        {`${supervisor.name} ${supervisor.surname}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password:</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                                placeholder="Enter supervisor password"
                            />
                        </div>

                        <div className="action-buttons">
                            <button onClick={handlePasswordSubmit} className="confirm-button">
                                Confirm
                            </button>
                            <button onClick={handleClose} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplyUpdate;