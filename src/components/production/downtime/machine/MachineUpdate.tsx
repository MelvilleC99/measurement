// src/components/production/downtime/machine/MachineUpdate.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import './MachineUpdate.css';

interface MachineUpdateProps {
    userRole: 'Supervisor' | 'Mechanic';
    userId: string;
}

interface Downtime {
    id: string;
    reason: string;
    machineNumber: string;
    comments: string;
    status: string;
    mechanicId?: string;
    supervisorId?: string;
}

const MachineUpdate: React.FC<MachineUpdateProps> = ({ userRole, userId }) => {
    const [downtimes, setDowntimes] = useState<Downtime[]>([]);
    const [selectedDowntime, setSelectedDowntime] = useState<Downtime | null>(null);
    const [additionalComments, setAdditionalComments] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchDowntimes = async () => {
            try {
                const downtimesQuery = query(
                    collection(db, 'downtimes'),
                    where('status', '==', 'Open'),
                    where('type', '==', 'Machine')
                );
                const snapshot = await getDocs(downtimesQuery);
                const downtimesData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Downtime[];
                setDowntimes(downtimesData);
            } catch (error) {
                console.error('Error fetching downtimes:', error);
                setError('Failed to load downtimes.');
            }
        };

        fetchDowntimes();
    }, []);

    const handleSelectDowntime = (downtime: Downtime) => {
        setSelectedDowntime(downtime);
        setAdditionalComments('');
        setPassword('');
        setError('');
    };

    const handleAcknowledgeReceipt = async () => {
        if (userRole !== 'Mechanic') {
            setError('Only mechanics can acknowledge receipt.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }
        // Implement password verification here

        try {
            await updateDoc(doc(db, 'downtimes', selectedDowntime!.id), {
                mechanicId: userId,
                mechanicAcknowledgedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            alert('Receipt acknowledged.');
            setSelectedDowntime(null);
            // Refresh downtimes
            const downtimesQuery = query(
                collection(db, 'downtimes'),
                where('status', '==', 'Open'),
                where('type', '==', 'Machine')
            );
            const snapshot = await getDocs(downtimesQuery);
            const downtimesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Downtime[];
            setDowntimes(downtimesData);
        } catch (error) {
            console.error('Error acknowledging receipt:', error);
            setError('Failed to acknowledge receipt.');
        }
    };

    const handleResolveDowntime = async () => {
        if (userRole !== 'Supervisor') {
            setError('Only supervisors can resolve downtime.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }
        // Implement password verification here

        try {
            await updateDoc(doc(db, 'downtimes', selectedDowntime!.id), {
                status: 'Closed',
                supervisorId: userId,
                additionalComments,
                resolvedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            alert('Downtime resolved.');
            setSelectedDowntime(null);
            // Refresh downtimes
            const downtimesQuery = query(
                collection(db, 'downtimes'),
                where('status', '==', 'Open'),
                where('type', '==', 'Machine')
            );
            const snapshot = await getDocs(downtimesQuery);
            const downtimesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Downtime[];
            setDowntimes(downtimesData);
        } catch (error) {
            console.error('Error resolving downtime:', error);
            setError('Failed to resolve downtime.');
        }
    };

    return (
        <div className="machine-update-container">
            <h2>Active Machine Downtimes</h2>
            {error && <p className="error-message">{error}</p>}
            {selectedDowntime ? (
                <div className="downtime-details">
                    <h3>Downtime Details</h3>
                    <p>
                        <strong>Reason:</strong> {selectedDowntime.reason}
                    </p>
                    <p>
                        <strong>Machine Number:</strong> {selectedDowntime.machineNumber}
                    </p>
                    <p>
                        <strong>Comments:</strong> {selectedDowntime.comments}
                    </p>
                    {userRole === 'Supervisor' && (
                        <label>
                            Additional Comments:
                            <textarea
                                value={additionalComments}
                                onChange={(e) => setAdditionalComments(e.target.value)}
                                placeholder="Enter additional comments..."
                            />
                        </label>
                    )}
                    <label>
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    <div className="action-buttons">
                        {userRole === 'Mechanic' && !selectedDowntime.mechanicId && (
                            <button onClick={handleAcknowledgeReceipt} className="acknowledge-button">
                                Acknowledge Receipt
                            </button>
                        )}
                        {userRole === 'Supervisor' && (
                            <button onClick={handleResolveDowntime} className="resolve-button">
                                Downtime Resolved
                            </button>
                        )}
                        <button onClick={() => setSelectedDowntime(null)} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="downtime-list">
                    {downtimes.length === 0 ? (
                        <p>No active downtimes.</p>
                    ) : (
                        downtimes.map((downtime) => (
                            <div
                                key={downtime.id}
                                className="downtime-card"
                                onClick={() => handleSelectDowntime(downtime)}
                            >
                                <p>
                                    <strong>Reason:</strong> {downtime.reason}
                                </p>
                                <p>
                                    <strong>Machine Number:</strong> {downtime.machineNumber}
                                </p>
                                <p>
                                    <strong>Status:</strong> {downtime.status}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MachineUpdate;