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
import { StyleChangeoverRecord } from '../types';
import './StyleChangeUpdate.css';

interface StyleChangeUpdateProps {
    userRole: 'Supervisor' | 'Mechanic' | 'QC';
    userId: string;
    selectedChangeover: StyleChangeoverRecord;
}

interface StyleChangeover {
    id: string;
    currentStyle: string;
    nextStyle: string;
    target: string;
    status: string;
    progressSteps: {
        machineSetupComplete: boolean;
        peopleAllocated: boolean;
        firstUnitOffLine: boolean;
        qcApproved: boolean;
    };
    completedBy?: {
        [key in keyof StyleChangeover['progressSteps']]?: {
            userId: string;
            timestamp: Timestamp;
        };
    };
}

interface User {
    employeeNumber: string;
    name: string;
    surname: string;
    role: string;
    password: string;
}

const StyleChangeUpdate: React.FC<StyleChangeUpdateProps> = ({ userRole, userId }) => {
    const [styleChangeovers, setStyleChangeovers] = useState<StyleChangeover[]>([]);
    const [selectedChangeover, setSelectedChangeover] = useState<StyleChangeover | null>(null);
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [stepToComplete, setStepToComplete] = useState<keyof StyleChangeover['progressSteps'] | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');

    useEffect(() => {
        const fetchStyleChangeovers = async () => {
            try {
                const changeoversQuery = query(
                    collection(db, 'styleChangeovers'),
                    where('status', '==', 'In Progress'),
                );
                const snapshot = await getDocs(changeoversQuery);
                const changeoversData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as StyleChangeover[];
                setStyleChangeovers(changeoversData);
            } catch (error) {
                console.error('Error fetching style changeovers:', error);
                setError('Failed to load style changeovers.');
            }
        };

        fetchStyleChangeovers();
    }, []);

    const fetchUsers = async (role: string) => {
        try {
            const usersQuery = query(
                collection(db, 'supportFunctions'),
                where('role', '==', role)
            );
            const snapshot = await getDocs(usersQuery);
            if (!snapshot.empty) {
                const usersData = snapshot.docs.map((doc) => doc.data() as User);
                setUsers(usersData);
            } else {
                setError('No users found for the selected role.');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to load users.');
        }
    };

    const handleSelectChangeover = (changeover: StyleChangeover) => {
        setSelectedChangeover(changeover);
        setPassword('');
        setError('');
        setStepToComplete(null);
    };

    const handleCompleteStep = async () => {
        if (!selectedUser) {
            setError('Please select a user.');
            return;
        }

        if (!password) {
            setError('Please enter your password.');
            return;
        }

        const user = users.find((user) => user.employeeNumber === selectedUser);
        if (!user || user.password !== password) {
            setError('Invalid password. Please try again.');
            return;
        }

        if (!selectedChangeover || !stepToComplete) {
            setError('No step selected to complete.');
            return;
        }

        // Verify user's role permissions
        if (
            (stepToComplete === 'qcApproved' && user.role !== 'QC') ||
            (stepToComplete !== 'qcApproved' && user.role !== 'Supervisor')
        ) {
            setError('You do not have permission to complete this step.');
            return;
        }

        try {
            await updateDoc(doc(db, 'styleChangeovers', selectedChangeover.id), {
                [`progressSteps.${stepToComplete}`]: true,
                [`completedBy.${stepToComplete}`]: {
                    userId: user.employeeNumber,
                    timestamp: Timestamp.now(),
                },
                updatedAt: Timestamp.now(),
            });

            // Check if all steps are completed
            const updatedChangeover = {
                ...selectedChangeover,
                progressSteps: {
                    ...selectedChangeover.progressSteps,
                    [stepToComplete]: true,
                },
                completedBy: {
                    ...selectedChangeover.completedBy,
                    [stepToComplete]: {
                        userId: user.employeeNumber,
                        timestamp: Timestamp.now(),
                    },
                },
            };
            const allStepsCompleted = Object.values(updatedChangeover.progressSteps).every(
                (value) => value
            );
            if (allStepsCompleted) {
                // Close the style changeover
                await updateDoc(doc(db, 'styleChangeovers', selectedChangeover.id), {
                    status: 'Closed',
                    closedAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                setSelectedChangeover(null);
            } else {
                setSelectedChangeover(updatedChangeover);
            }

            // Refresh style changeovers
            const changeoversQuery = query(
                collection(db, 'styleChangeovers'),
                where('status', '==', 'In Progress')
            );
            const snapshot = await getDocs(changeoversQuery);
            const changeoversData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as StyleChangeover[];
            setStyleChangeovers(changeoversData);
            setStepToComplete(null);
            setPassword('');
            setSelectedUser('');
        } catch (error) {
            console.error('Error completing step:', error);
            setError('Failed to complete step.');
        }
    };

    const promptPasswordAndCompleteStep = async (step: keyof StyleChangeover['progressSteps']) => {
        setStepToComplete(step);
        setPassword('');
        setError('');

        if (step === 'qcApproved') {
            await fetchUsers('QC');
        } else {
            await fetchUsers('Supervisor');
        }
    };

    const handleCancelPasswordPrompt = () => {
        setStepToComplete(null);
        setPassword('');
        setError('');
        setSelectedUser('');
    };

    return (
        <div className="style-change-update-container">
            <h2>Active Style Changeovers</h2>
            {error && <p className="error-message">{error}</p>}
            {selectedChangeover ? (
                <div className="changeover-details">
                    <h3>Style Changeover Details</h3>
                    <p>
                        <strong>Current Style:</strong> {selectedChangeover.currentStyle}
                    </p>
                    <p>
                        <strong>Next Style:</strong> {selectedChangeover.nextStyle}
                    </p>
                    <p>
                        <strong>Target:</strong> {selectedChangeover.target}
                    </p>
                    <div className="progress-steps">
                        {(['machineSetupComplete', 'peopleAllocated', 'firstUnitOffLine', 'qcApproved'] as Array<
                            keyof StyleChangeover['progressSteps']
                        >).map((step) => (
                            <div key={step} className="progress-step">
                                <p>
                                    <strong>{step.replace(/([A-Z])/g, ' $1')}</strong>:{' '}
                                    {selectedChangeover.progressSteps[step] ? 'Complete' : 'Incomplete'}
                                </p>
                                {!selectedChangeover.progressSteps[step] && (
                                    <button
                                        onClick={() => promptPasswordAndCompleteStep(step)}
                                        className="complete-step-button"
                                        style={{ backgroundColor: 'red' }}
                                    >
                                        Complete
                                    </button>
                                )}
                                {selectedChangeover.progressSteps[step] && (
                                    <button
                                        className="complete-step-button"
                                        style={{ backgroundColor: 'green' }}
                                        disabled
                                    >
                                        Completed
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {stepToComplete && (
                        <div className="password-prompt">
                            <label>
                                Select User:
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                >
                                    <option value="">Select User</option>
                                    {users.map((user) => (
                                        <option key={user.employeeNumber} value={user.employeeNumber}>
                                            {user.name} {user.surname}
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
                            <button onClick={handleCompleteStep} className="confirm-button">
                                Confirm
                            </button>
                            <button onClick={handleCancelPasswordPrompt} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    )}
                    <button onClick={() => setSelectedChangeover(null)} className="cancel-button">
                        Cancel
                    </button>
                </div>
            ) : (
                <div className="changeover-list">
                    {styleChangeovers.length === 0 ? (
                        <p>No active style changeovers.</p>
                    ) : (
                        styleChangeovers.map((changeover) => (
                            <div
                                key={changeover.id}
                                className={`changeover-card ${changeover.status === 'Closed' ? 'completed' : ''}`}
                                onClick={() => handleSelectChangeover(changeover)}
                            >
                                <p>
                                    <strong>Current Style:</strong> {changeover.currentStyle}
                                </p>
                                <p>
                                    <strong>Next Style:</strong> {changeover.nextStyle}
                                </p>
                                <p>
                                    <strong>Status:</strong> {changeover.status}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default StyleChangeUpdate;
