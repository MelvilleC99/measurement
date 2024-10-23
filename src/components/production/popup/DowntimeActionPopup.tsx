import React, { useState } from 'react';
import './DowntimeActionPopup.css';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase'; // Correct import path for your Firebase config

interface DowntimeItem {
    docId: string; // Firestore document ID
    productionLineId: string;
    supervisorId: string;
    mechanicId?: string;
    startTime: Date;
    mechanicReceivedTime?: Date;
    endTime?: Date;
    category: string;
    reason: string;
    status: 'Open' | 'Mechanic Received' | 'Resolved';
    createdAt: Date;
    updatedAt: Date;
}

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    password: string;
}

interface DowntimeActionPopupProps {
    downtime: DowntimeItem;
    mechanics: SupportFunction[];
    supervisor: SupportFunction | null;
    onClose: () => void;
    onAction: (action: 'mechanicReceived' | 'resolved', mechanicId?: string) => Promise<void>;
}

const DowntimeActionPopup: React.FC<DowntimeActionPopupProps> = ({
                                                                     downtime,
                                                                     mechanics,
                                                                     supervisor,
                                                                     onClose,
                                                                     onAction,
                                                                 }) => {
    const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
    const [mechanicPassword, setMechanicPassword] = useState<string>('');
    const [supervisorPassword, setSupervisorPassword] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleMechanicReceived = async () => {
        if (!selectedMechanicId || !mechanicPassword) {
            setErrorMessage('Please select a mechanic and enter the password.');
            return;
        }

        const mechanic = mechanics.find(m => m.id === selectedMechanicId && m.password === mechanicPassword);
        if (!mechanic) {
            setErrorMessage('Invalid mechanic credentials.');
            return;
        }

        // Perform the action
        setErrorMessage(''); // Clear error message on success
        await onAction('mechanicReceived', selectedMechanicId);
    };

    const handleResolved = async () => {
        if (!supervisorPassword) {
            setErrorMessage('Please enter the supervisor password.');
            return;
        }

        if (supervisorPassword !== supervisor?.password) {
            setErrorMessage('Invalid supervisor password.');
            return;
        }

        // Perform the action
        setErrorMessage(''); // Clear error message on success
        await onAction('resolved');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Downtime Action</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <p><strong>Ref:</strong> {downtime.docId.slice(-4)}</p> {/* Display last 4 digits of docId */}
                <p><strong>Category:</strong> {downtime.category}</p>
                <p><strong>Reason:</strong> {downtime.reason}</p>
                <p><strong>Status:</strong> {downtime.status}</p>
                <p><strong>Duration:</strong> {Math.floor((new Date().getTime() - downtime.startTime.getTime()) / 1000)} seconds</p>

                {downtime.status === 'Open' && downtime.category.toLowerCase() === 'maintenance' && (
                    <>
                        <h3>Mechanic Confirmation</h3>
                        <label>
                            Select Mechanic:
                            <select
                                value={selectedMechanicId}
                                onChange={(e) => setSelectedMechanicId(e.target.value)}
                            >
                                <option value="">Select a Mechanic</option>
                                {mechanics.map(mech => (
                                    <option key={mech.id} value={mech.id}>
                                        {mech.name} {mech.surname}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Mechanic Password:
                            <input
                                type="password"
                                value={mechanicPassword}
                                onChange={(e) => setMechanicPassword(e.target.value)}
                            />
                        </label>
                        <button className="submit-button" onClick={handleMechanicReceived}>Confirm Received</button>
                    </>
                )}

                {(downtime.status === 'Open' && downtime.category.toLowerCase() !== 'maintenance') ||
                downtime.status === 'Mechanic Received' ? (
                    <>
                        <h3>Supervisor Confirmation</h3>
                        <label>
                            Supervisor Password:
                            <input
                                type="password"
                                value={supervisorPassword}
                                onChange={(e) => setSupervisorPassword(e.target.value)}
                            />
                        </label>
                        <button className="submit-button" onClick={handleResolved}>Mark as Resolved</button>
                    </>
                ) : null}

                <button className="cancel-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default DowntimeActionPopup;
