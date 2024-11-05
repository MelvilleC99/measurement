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

interface SupplyLogProps {
    onClose: () => void;
    onSubmit: (data: SupplyFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

interface SupplyFormData {
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
}

const SupplyLog: React.FC<SupplyLogProps> = ({
                                                 onClose,
                                                 onSubmit,
                                                 productionLineId,
                                                 supervisorId
                                             }) => {
    const [reason, setReason] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const reasonsSnapshot = await getDocs(collection(db, 'downtimeCategories'));
                const supplyDoc = reasonsSnapshot.docs.find((doc) => doc.data().name === 'Supply');
                const reasonsData = supplyDoc?.data().reasons || [];
                setReasonsList(reasonsData);
            } catch (error) {
                console.error('Error fetching reasons:', error);
                setError('Failed to load reasons.');
            }
        };

        fetchReasons();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!reason) {
            setError('Please select a reason for the downtime.');
            setIsSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, 'supplyDowntime'), {
                reason,
                comments,
                productionLineId,
                supervisorId,
                createdAt: Timestamp.now(),
                startTime: Timestamp.now(),
                status: 'Open' as const,
            });
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
                Log Supply Downtime
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {error && <Alert severity="error">{error}</Alert>}

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

export default SupplyLog;