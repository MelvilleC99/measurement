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
    selectedDowntime: Downtime | null;
    onClose: () => void;
    onAcknowledgeReceipt: () => void;
    mechanics: Mechanic[];
}

interface Downtime {
    id: string;
    reason: string;
    machineNumber: string;
    comments: string;
    status: string; // Open or Closed
    mechanicAcknowledged?: boolean; // Tracks mechanic acknowledgment
    mechanicId?: string;
    supervisorId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    mechanicAcknowledgedAt?: Timestamp;
    resolvedAt?: Timestamp;
    productionLineId?: string;
    mechanicName?: string;
}

interface Mechanic {
    employeeNumber: string;
    name: string;
    surname: string;
    password: string;
}

interface Supervisor {
    employeeNumber: string;
    name: string;
    surname: string;
    password: string;
}

const MachineUpdate: React.FC<MachineUpdateProps> = ({ userRole, userId, selectedDowntime, onClose, onAcknowledgeReceipt, mechanics }) => {
    const [selectedMechanic, setSelectedMechanic] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [additionalComments, setAdditionalComments] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

    useEffect(() => {
        if (selectedDowntime) {
            setSelectedMechanic('');
            setSelectedSupervisor('');
            setAdditionalComments('');
            setPassword('');
            setError('');
        }
    }, [selectedDowntime]);

    useEffect(() => {
        // Fetch supervisors from the database
        const fetchSupervisors = async () => {
            try {
                const supervisorQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Supervisor')
                );
                const snapshot = await getDocs(supervisorQuery);
                if (!snapshot.empty) {
                    const fetchedSupervisors = snapshot.docs.map(doc => ({
                        employeeNumber: doc.data().employeeNumber,
                        name: doc.data().name,
                        surname: doc.data().surname,
                        password: doc.data().password,
                    }));
                    setSupervisors(fetchedSupervisors as Supervisor[]);
                }
            } catch (error) {
                console.error('Failed to fetch supervisors:', error);
            }
        };

        fetchSupervisors();
    }, []);

    // Mechanic acknowledges receipt of the downtime
    const handleAcknowledgeReceipt = async () => {
        if (userRole !== 'Mechanic') {
            setError('Only mechanics can acknowledge receipt.');
            return;
        }
        if (!selectedMechanic || !password) {
            setError('Please select a mechanic and enter your password.');
            return;
        }
        if (!selectedDowntime) {
            setError('No downtime selected.');
            return;
        }

        try {
            const trimmedEmployeeNumber = selectedMechanic.trim();
            const trimmedPassword = password.trim();

            // Query for the mechanic based on employee number and password
            const mechanicQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', trimmedEmployeeNumber),
                where('password', '==', trimmedPassword),
                where('role', '==', 'Mechanic'),
                where('hasPassword', '==', true)
            );

            const mechanicSnapshot = await getDocs(mechanicQuery);

            if (mechanicSnapshot.empty) {
                setError('Incorrect password. Please try again.');
                return;
            }

            const mechanic = mechanicSnapshot.docs[0].data() as Mechanic;

            // Update the downtime to indicate that it has been acknowledged by the mechanic
            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                mechanicId: userId,
                mechanicName: `${mechanic.name} ${mechanic.surname}`,
                mechanicAcknowledged: true,
                mechanicAcknowledgedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            alert('Receipt acknowledged.');
            onAcknowledgeReceipt();
        } catch (error) {
            setError('Failed to acknowledge receipt.');
        }
    };

    // Supervisor resolves the downtime
    const handleResolveDowntime = async () => {
        if (userRole !== 'Supervisor') {
            setError('Only supervisors can resolve downtime.');
            return;
        }
        if (!selectedSupervisor || !password) {
            setError('Please select a supervisor and enter your password.');
            return;
        }
        if (!selectedDowntime) {
            setError('No downtime selected.');
            return;
        }

        try {
            const trimmedEmployeeNumber = selectedSupervisor.trim();
            const trimmedPassword = password.trim();

            // Query for the supervisor based on employee number and password
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', trimmedEmployeeNumber),
                where('password', '==', trimmedPassword),
                where('role', '==', 'Supervisor'),
                where('hasPassword', '==', true)
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);

            if (supervisorSnapshot.empty) {
                setError('Incorrect password. Please try again.');
                return;
            }

            // Update the downtime to show it has been resolved by the supervisor
            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                status: 'Closed',
                supervisorId: userId,
                additionalComments,
                resolvedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            alert('Downtime resolved.');
            onClose();
        } catch (error) {
            setError('Failed to resolve downtime.');
        }
    };

    return (
        <div className="machine-update-container">
            <h2>Machine Downtime</h2>
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
                    {selectedDowntime.mechanicAcknowledged && (
                        <p>
                            <strong>Mechanic Assigned:</strong> {selectedDowntime.mechanicName || 'N/A'}
                        </p>
                    )}
                    {selectedDowntime.status === 'Open' && !selectedDowntime.mechanicAcknowledged && userRole === 'Mechanic' && (
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
                    {selectedDowntime.status === 'Open' && selectedDowntime.mechanicAcknowledged && userRole === 'Supervisor' && (
                        <>
                            <p><strong>Status:</strong> Acknowledged by Mechanic</p>
                            <label>
                                Machine Repaired? Select Supervisor:
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
            ) : (
                <p>Please select a downtime to view details.</p>
            )}
        </div>
    );
};

export default MachineUpdate;
