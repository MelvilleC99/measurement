// Machine.tsx
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    Button,
    Alert,
    Box,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';

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

const Machine: React.FC<MachineProps> = ({
                                             onClose,
                                             onSubmit,
                                             productionLineId,
                                             supervisorId
                                         }) => {
    const [reason, setReason] = useState<string>('');
    const [machineNumber, setMachineNumber] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [machinesList, setMachinesList] = useState<MachineItem[]>([]);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);

        if (!reason || !machineNumber) {
            setError('Please fill in all required fields.');
            setIsSubmitting(false);
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

            await onSubmit(machineFormData);
            onClose();
        } catch (err) {
            console.error('Error logging downtime:', err);
            setError('Failed to log downtime.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Machine Downtime
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <Select
                            value={machineNumber}
                            onChange={(e) => setMachineNumber(e.target.value)}
                            displayEmpty
                            required
                            sx={{
                                borderRadius: 1,
                                '& .MuiSelect-select': { py: 1.5 }
                            }}
                        >
                            <MenuItem value="" disabled>
                                Select machine
                            </MenuItem>
                            {machinesList.map((machine) => (
                                <MenuItem key={machine.id} value={machine.assetNumber}>
                                    {machine.assetNumber}
                                </MenuItem>
                            ))}
                        </Select>

                        <Select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            displayEmpty
                            required
                            sx={{
                                borderRadius: 1,
                                '& .MuiSelect-select': { py: 1.5 }
                            }}
                        >
                            <MenuItem value="" disabled>
                                Select reason for downtime
                            </MenuItem>
                            {reasonsList.map((r, index) => (
                                <MenuItem key={index} value={r}>{r}</MenuItem>
                            ))}
                        </Select>

                        <TextField
                            multiline
                            rows={4}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add comments"
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderRadius: 1
                                    },
                                    '& textarea': {
                                        p: 1.5
                                    }
                                }
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        sx={{ minWidth: 100, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ minWidth: 100, textTransform: 'none' }}
                    >
                        {isSubmitting ? "Logging..." : "Submit"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default Machine;