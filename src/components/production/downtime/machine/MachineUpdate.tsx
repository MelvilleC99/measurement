import React, { useState, useEffect } from 'react';
import {
    updateDoc,
    doc,
    Timestamp,
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import './MachineUpdate.css';

interface MachineUpdateProps {
    userRole: 'Supervisor' | 'Mechanic';
    userId: string;
    selectedDowntime: {
        id: string;
        reason: string;
        machineNumber: string;
        comments: string;
        status: string;
        mechanicAcknowledged: boolean;
        mechanicId?: string;
        mechanicName?: string;
        supervisorId?: string;
        createdAt: any;
        updatedAt: any;
    };
    onClose: () => void;
    onAcknowledgeReceipt: () => void;
    mechanics: {
        employeeNumber: string;
        name: string;
        surname: string;
        password: string;
    }[];
}

const MachineUpdate: React.FC<MachineUpdateProps> = ({
                                                         userRole,
                                                         userId,
                                                         selectedDowntime,
                                                         onClose,
                                                         onAcknowledgeReceipt,
                                                         mechanics
                                                     }) => {
    const [selectedMechanic, setSelectedMechanic] = useState('');
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [additionalComments, setAdditionalComments] = useState('');
    const [updatedReason, setUpdatedReason] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [supervisors, setSupervisors] = useState<any[]>([]);

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const supervisorsQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Supervisor')
                );
                const snapshot = await getDocs(supervisorsQuery);
                const fetchedSupervisors = snapshot.docs.map(doc => ({
                    employeeNumber: doc.data().employeeNumber,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    password: doc.data().password,
                }));
                setSupervisors(fetchedSupervisors);
            } catch (err) {
                console.error('Error fetching supervisors:', err);
                setError('Failed to load supervisors');
            }
        };

        fetchSupervisors();
    }, []);

    useEffect(() => {
        setSelectedMechanic('');
        setSelectedSupervisor('');
        setAdditionalComments('');
        setUpdatedReason(selectedDowntime.reason);
        setPassword('');
        setError('');
    }, [selectedDowntime]);

    const handleAcknowledgeReceipt = async () => {
        if (!selectedMechanic || !password) {
            setError('Please select a mechanic and enter your password.');
            return;
        }

        try {
            const mechanicQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedMechanic.trim()),
                where('password', '==', password.trim()),
                where('role', '==', 'Mechanic')
            );

            const mechanicSnapshot = await getDocs(mechanicQuery);

            if (mechanicSnapshot.empty) {
                setError('Incorrect password. Please try again.');
                return;
            }

            const mechanic = mechanicSnapshot.docs[0].data();

            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                mechanicId: selectedMechanic,
                mechanicName: `${mechanic.name} ${mechanic.surname}`,
                mechanicAcknowledged: true,
                mechanicAcknowledgedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            onAcknowledgeReceipt();
            onClose();
        } catch (error) {
            console.error('Error acknowledging receipt:', error);
            setError('Failed to acknowledge receipt.');
        }
    };

    const handleResolveDowntime = async () => {
        if (!selectedSupervisor || !password || !updatedReason.trim()) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedSupervisor.trim()),
                where('password', '==', password.trim()),
                where('role', '==', 'Supervisor')
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);

            if (supervisorSnapshot.empty) {
                setError('Incorrect password. Please try again.');
                return;
            }

            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                status: 'Closed',
                supervisorId: selectedSupervisor,
                reason: updatedReason.trim(),
                additionalComments: additionalComments.trim(),
                resolvedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            onClose();
        } catch (error) {
            console.error('Error resolving downtime:', error);
            setError('Failed to resolve downtime.');
        }
    };

    return (
        <div className="machine-update-container">
            <h2>Machine Downtime</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="downtime-details">
                <h3>Downtime Details</h3>
                <p><strong>Machine Number:</strong> {selectedDowntime.machineNumber}</p>
                <p><strong>Initial Reason:</strong> {selectedDowntime.reason}</p>
                <p><strong>Comments:</strong> {selectedDowntime.comments}</p>
                {selectedDowntime.mechanicName && (
                    <p><strong>Mechanic Assigned:</strong> {selectedDowntime.mechanicName}</p>
                )}

                {/* Mechanic acknowledgment form */}
                {!selectedDowntime.mechanicAcknowledged && (
                    <>
                        <label>
                            Select Mechanic:
                            <select
                                value={selectedMechanic}
                                onChange={(e) => setSelectedMechanic(e.target.value)}
                                required
                            >
                                <option value="">Select a mechanic</option>
                                {mechanics.map((mechanic) => (
                                    <option key={mechanic.employeeNumber} value={mechanic.employeeNumber}>
                                        {mechanic.name} {mechanic.surname}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Password:
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </label>
                        <button onClick={handleAcknowledgeReceipt} className="acknowledge-button">
                            Acknowledge Receipt
                        </button>
                    </>
                )}

                {/* Supervisor resolution form */}
                {selectedDowntime.mechanicAcknowledged &&
                    selectedDowntime.status === 'Open' &&
                    userRole === 'Supervisor' && (
                        <>
                            <p><strong>Status:</strong> Acknowledged by Mechanic</p>
                            <label>
                                Select Supervisor:
                                <select
                                    value={selectedSupervisor}
                                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                                    required
                                >
                                    <option value="">Select a supervisor</option>
                                    {supervisors.map((supervisor) => (
                                        <option key={supervisor.employeeNumber} value={supervisor.employeeNumber}>
                                            {supervisor.name} {supervisor.surname}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Confirm/Update Final Reason:
                                <textarea
                                    value={updatedReason}
                                    onChange={(e) => setUpdatedReason(e.target.value)}
                                    placeholder="Confirm or update the reason for downtime"
                                    required
                                />
                            </label>

                            <label>
                                Additional Comments:
                                <textarea
                                    value={additionalComments}
                                    onChange={(e) => setAdditionalComments(e.target.value)}
                                    placeholder="Enter additional comments..."
                                />
                            </label>

                            <label>
                                Password:
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </label>

                            <button onClick={handleResolveDowntime} className="resolve-button">
                                Downtime Resolved
                            </button>
                        </>
                    )}

                <button onClick={onClose} className="cancel-button">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default MachineUpdate;