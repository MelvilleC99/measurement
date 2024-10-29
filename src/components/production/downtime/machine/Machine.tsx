// src/components/production/downtime/machine/Machine.tsx

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupportFunction} from '../../../../types';
import './Machine.css';

interface MachineProps {
    onClose: () => void;
    onSubmit: (data: MachineFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;

}

interface MachineFormData {
    reason: string;
    machineNumber: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
    mechanicId?: string; // Assuming mechanicId is optional
}

interface MachineItem {
    id: string;
    assetNumber: string;
}

const Machine: React.FC<MachineProps> = ({ onClose, onSubmit, productionLineId, supervisorId }) => {
    const [reason, setReason] = useState<string>('');
    const [machineNumber, setMachineNumber] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [machinesList, setMachinesList] = useState<MachineItem[]>([]);
    const [mechanicId, setMechanicId] = useState<string>(''); // New state for mechanicId
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchReasonsAndMachines = async () => {
            try {
                // Fetch reasons from downtimeCategories where name is 'Machine'
                const reasonsSnapshot = await getDocs(collection(db, 'downtimeCategories'));
                const machineDoc = reasonsSnapshot.docs.find((doc) => doc.data().name === 'Machine');
                const reasonsData = machineDoc?.data().reasons || [];
                setReasonsList(reasonsData);

                // Fetch machines from machines collection
                const machinesSnapshot = await getDocs(collection(db, 'machines'));
                const machinesData = machinesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    assetNumber: doc.data().assetNumber,
                }));
                setMachinesList(machinesData);
            } catch (error) {
                console.error('Error fetching reasons and machines:', error);
                setError('Failed to load reasons and machines.');
            }
        };

        fetchReasonsAndMachines();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reason || !machineNumber || !mechanicId) {
            setError('Please fill in all required fields.');
            return;
        }

        const machineFormData: MachineFormData = {
            reason,
            machineNumber,
            comments,
            productionLineId,
            supervisorId,
            mechanicId, // Include mechanicId
        };

        try {
            await onSubmit(machineFormData); // Using onSubmit prop
            alert('Machine downtime logged successfully.');
            onClose();
        } catch (err) {
            console.error('Error logging downtime:', err);
            setError('Failed to log downtime.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Machine Downtime</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="machine-log-form">
                    <label>
                        Reason:
                        <select value={reason} onChange={(e) => setReason(e.target.value)} required>
                            <option value="">Select Reason</option>
                            {reasonsList.map((r, index) => (
                                <option key={index} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Machine Number:
                        <select
                            value={machineNumber}
                            onChange={(e) => setMachineNumber(e.target.value)}
                            required
                        >
                            <option value="">Select Machine</option>
                            {machinesList.map((machine) => (
                                <option key={machine.id} value={machine.assetNumber}>
                                    {machine.assetNumber}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Mechanic Assigned:
                        <select
                            value={mechanicId}
                            onChange={(e) => setMechanicId(e.target.value)}
                            required
                        >
                            <option value="">Select Mechanic</option>
                            {/* Assuming you have a list of mechanics */}
                            {/* Replace this with actual mechanics data if available */}
                            {/* For example: */}
                            {/* {mechanicsList.map(mechanic => (
                                <option key={mechanic.id} value={mechanic.id}>
                                    {mechanic.name}
                                </option>
                            ))} */}
                            {/* Placeholder options */}
                            <option value="mechanic1">Mechanic 1</option>
                            <option value="mechanic2">Mechanic 2</option>
                        </select>
                    </label>
                    <label>
                        Comments:
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter comments..."
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit" className="submit-button">
                            Confirm
                        </button>
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Machine;