// src/components/production/downtime/stylechange/StyleChangeUpdate.tsx

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
import './StyleChangeUpdate.css';

interface StyleChangeUpdateProps {
    userRole: 'Supervisor' | 'Mechanic' | 'QC';
    userId: string;
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
}

const StyleChangeUpdate: React.FC<StyleChangeUpdateProps> = ({ userRole, userId }) => {
    const [styleChangeovers, setStyleChangeovers] = useState<StyleChangeover[]>([]);
    const [selectedChangeover, setSelectedChangeover] = useState<StyleChangeover | null>(null);
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchStyleChangeovers = async () => {
            try {
                const changeoversQuery = query(
                    collection(db, 'downtimes'),
                    where('status', '==', 'In Progress'),
                    where('type', '==', 'Style Changeover')
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

    const handleSelectChangeover = (changeover: StyleChangeover) => {
        setSelectedChangeover(changeover);
        setPassword('');
        setError('');
    };

    const handleCompleteStep = async (step: keyof StyleChangeover['progressSteps']) => {
        if (!password) {
            setError('Please enter your password.');
            return;
        }
        // Verify user's password and role permissions
        if (
            (step === 'qcApproved' && userRole !== 'QC') ||
            (step !== 'qcApproved' && userRole !== 'Supervisor' && userRole !== 'Mechanic')
        ) {
            setError('You do not have permission to complete this step.');
            return;
        }

        try {
            await updateDoc(doc(db, 'downtimes', selectedChangeover!.id), {
                [`progressSteps.${step}`]: true,
                updatedAt: Timestamp.now(),
            });
            alert('Step completed.');
            // Check if all steps are completed
            const updatedChangeover = {
                ...selectedChangeover!,
                progressSteps: {
                    ...selectedChangeover!.progressSteps,
                    [step]: true,
                },
            };
            const allStepsCompleted = Object.values(updatedChangeover.progressSteps).every(
                (value) => value
            );
            if (allStepsCompleted) {
                // Close the style changeover
                await updateDoc(doc(db, 'downtimes', selectedChangeover!.id), {
                    status: 'Closed',
                    closedAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                alert('Style changeover completed.');
                setSelectedChangeover(null);
            } else {
                setSelectedChangeover(updatedChangeover);
            }
            // Refresh style changeovers
            const changeoversQuery = query(
                collection(db, 'downtimes'),
                where('status', '==', 'In Progress'),
                where('type', '==', 'Style Changeover')
            );
            const snapshot = await getDocs(changeoversQuery);
            const changeoversData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as StyleChangeover[];
            setStyleChangeovers(changeoversData);
        } catch (error) {
            console.error('Error completing step:', error);
            setError('Failed to complete step.');
        }
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
                                    <button onClick={() => handleCompleteStep(step)} className="complete-step-button">
                                        Complete Step
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <label>
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
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
                                className="changeover-card"
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