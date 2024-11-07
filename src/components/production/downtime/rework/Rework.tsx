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
    IconButton,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './Rework.css';

interface ReworkProps {
    onClose: () => void;
    onSubmit: (reworkData: ReworkFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    qcs: SupportFunction[];
}

const Rework: React.FC<ReworkProps> = ({
                                           onClose,
                                           onSubmit,
                                           productionLineId,
                                           supervisorId,
                                           sessionId,
                                           qcs
                                       }) => {
    const [reason, setReason] = useState<string>('');
    const [operation, setOperation] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [count, setCount] = useState<number>(1);
    const [selectedQc, setSelectedQc] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [operationsList, setOperationsList] = useState<{ id: string; name: string; }[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [styleNumber, setStyleNumber] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch active session to get the current styleId
                const sessionDoc = await getDoc(doc(db, 'activeSessions', sessionId));
                const styleId = sessionDoc.data()?.styleId;

                if (!styleId) {
                    throw new Error('Style ID not found in the active session');
                }

                // Fetch the specific style details
                const styleDoc = await getDoc(doc(db, 'styles', styleId));
                const styleNumber = styleDoc.data()?.styleNumber || '';
                setStyleNumber(styleNumber);

                if (!styleNumber) {
                    throw new Error('Style number not found');
                }

                // Fetch rework reasons
                const reasonsQuery = query(
                    collection(db, 'downtimeCategories'),
                    where('name', '==', 'Rework')
                );
                const reasonsSnapshot = await getDocs(reasonsQuery);
                const fetchedReasons = reasonsSnapshot.docs.flatMap(doc =>
                    doc.data().reasons || []
                );
                setReasonsList(fetchedReasons);

                // Fetch operations based on productCategory from productHierarchy
                const productCategory = styleDoc.data()?.productCategory;
                if (!productCategory) {
                    throw new Error('Product category not found in the style');
                }

                const operationsSnapshot = await getDocs(collection(db, 'productHierarchy'));
                const fetchedOperations: { id: string; name: string; }[] = [];

                operationsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.name === productCategory && data.subCategories) {
                        data.subCategories.forEach((subCategory: any) => {
                            if (subCategory.operations) {
                                subCategory.operations.forEach((operation: any) => {
                                    fetchedOperations.push({
                                        id: `${doc.id}-${operation.name}`,
                                        name: operation.name
                                    });
                                });
                            }
                        });
                    }
                });

                setOperationsList(fetchedOperations);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isSubmitting) return;
        if (!reason || !operation || !selectedQc || count < 1 || !qcPassword) {
            setError('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            // Verify QC credentials
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedQc),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials');
                setIsSubmitting(false);
                return;
            }

            const reworkData: ReworkFormData = {
                reason,
                operation,
                comments,
                qcId: selectedQc,
                count,
                productionLineId,
                supervisorId,
                sessionId,
                styleNumber,  // Ensure we include the style number here
                status: 'open'
            };

            await onSubmit(reworkData);

            // Reset form and close
            setReason('');
            setOperation('');
            setComments('');
            setSelectedQc('');
            setQcPassword('');
            setCount(1);
            onClose();
        } catch (err) {
            console.error('Error submitting rework:', err);
            setError('Failed to submit rework');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <Dialog open={true} maxWidth="sm" fullWidth>
                <DialogContent>
                    <Box display="flex" justifyContent="center" p={3}>
                        <div className="loading-spinner">Loading...</div>
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: '500px',
                    m: 2
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1
            }}>
                <Typography variant="h6" component="h2">
                    Log Rework
                </Typography>
                <IconButton onClick={onClose} size="small" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: 3, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Current Style: {styleNumber}
                </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <Select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            displayEmpty
                            required
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                Select reason for rework *
                            </MenuItem>
                            {reasonsList.map((r, index) => (
                                <MenuItem key={index} value={r}>{r}</MenuItem>
                            ))}
                        </Select>

                        <Select
                            value={operation}
                            onChange={(e) => setOperation(e.target.value)}
                            displayEmpty
                            required
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                Select operation *
                            </MenuItem>
                            {operationsList.map((op) => (
                                <MenuItem key={op.id} value={op.name}>{op.name}</MenuItem>
                            ))}
                        </Select>

                        <TextField
                            type="number"
                            label="Count *"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                            required
                            fullWidth
                            inputProps={{ min: 1 }}
                        />

                        <Select
                            value={selectedQc}
                            onChange={(e) => setSelectedQc(e.target.value)}
                            displayEmpty
                            required
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                Select Quality Controller *
                            </MenuItem>
                            {qcs.map((qc) => (
                                <MenuItem key={qc.id} value={qc.employeeNumber || qc.id}>
                                    {qc.name} {qc.surname}
                                </MenuItem>
                            ))}
                        </Select>

                        <TextField
                            type="password"
                            label="QC Password *"
                            value={qcPassword}
                            onChange={(e) => setQcPassword(e.target.value)}
                            required
                            fullWidth
                        />

                        <TextField
                            multiline
                            rows={4}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add comments (optional)"
                            fullWidth
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, gap: 1 }}>
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
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default Rework;
