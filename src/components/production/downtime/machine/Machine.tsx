// Machine.tsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
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
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchReasonsAndMachines = async () => {
            try {
                const reasonsSnapshot = await getDocs(collection(db, 'downtimeCategories'));
                const machineDoc = reasonsSnapshot.docs.find((doc) => doc.data().name === 'Machine');
                const reasonsData = machineDoc?.data().reasons || [];
                setReasonsList(reasonsData);

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

        if (!reason || !machineNumber) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            const machineFormData: MachineFormData = {
                reason,
                machineNumber,
                comments,
                productionLineId,
                supervisorId,
            };

            console.log('Submitting Machine Downtime:', machineFormData); // Debugging

            // Create machine downtime document
            const docRef = await addDoc(collection(db, 'machineDowntimes'), {
                ...machineFormData,
                createdAt: Timestamp.now(),
                status: 'Open',
                mechanicAcknowledged: false,
                mechanicId: null,
                mechanicName: null,
                mechanicAcknowledgedAt: null,
                resolvedAt: null,
                updatedAt: Timestamp.now()
            });

            console.log('Downtime Document Created with ID:', docRef.id); // Debugging

            await onSubmit(machineFormData);
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