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
    Typography,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';

// Types
interface RejectFormData {
    reason: string;
    operation: string;
    comments: string;
    qcId: string;
    count: number;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    styleNumber: string;
    status: 'Open' | 'Closed';
    recordedAsProduced: boolean;
}

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber?: string;
    role: string;
}

interface Operation {
    id: string;
    name: string;
}

interface RejectProps {
    onClose: () => void;
    onSubmit: (rejectData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    qcs: SupportFunction[];
}

const Reject: React.FC<RejectProps> = ({
                                           onClose,
                                           onSubmit,
                                           productionLineId,
                                           supervisorId,
                                           sessionId,
                                           qcs
                                       }) => {
    const [formData, setFormData] = useState<Partial<RejectFormData>>({
        reason: '',
        operation: '',
        comments: '',
        count: 1,
        qcId: '',
        status: 'Open',
        recordedAsProduced: false
    });
    const [qcPassword, setQcPassword] = useState<string>('');
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [operationsList, setOperationsList] = useState<Operation[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [styleNumber, setStyleNumber] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('Loading...');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Step 1: Fetch session and style details
                setLoadingMessage('Fetching style details...');
                const sessionDoc = await getDoc(doc(db, 'activeSessions', sessionId));
                const styleId = sessionDoc.data()?.styleId;

                if (!styleId) {
                    throw new Error('Style ID not found in the active session');
                }

                // Step 2: Get style information
                const styleDoc = await getDoc(doc(db, 'styles', styleId));
                const styleData = styleDoc.data();
                const currentStyleNumber = styleData?.styleNumber || '';

                setStyleNumber(currentStyleNumber);

                if (!currentStyleNumber) {
                    throw new Error('Style details incomplete or missing');
                }

                // Step 3: Fetch reject reasons
                setLoadingMessage('Loading reject reasons...');
                const reasonsQuery = query(
                    collection(db, 'downtimeCategories'),
                    where('name', '==', 'Reject')
                );
                const reasonsSnapshot = await getDocs(reasonsQuery);
                const fetchedReasons = reasonsSnapshot.docs.flatMap(doc =>
                    doc.data().reasons || []
                );
                setReasonsList(fetchedReasons);

                // Step 4: Fetch operations from product hierarchy
                setLoadingMessage('Loading operations...');
                const hierarchySnapshot = await getDocs(collection(db, 'productHierarchy'));
                const fetchedOperations: Operation[] = [];

                hierarchySnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    console.log('Product Hierarchy doc:', data);

                    if (data.name === "Shirt") {
                        if (data.subCategories && Array.isArray(data.subCategories)) {
                            data.subCategories.forEach((subCategory: any) => {
                                console.log('Processing subcategory:', subCategory);

                                if (subCategory.operations && Array.isArray(subCategory.operations)) {
                                    subCategory.operations.forEach((operation: any) => {
                                        console.log('Found operation:', operation);

                                        if (!fetchedOperations.some(op => op.name === operation.name)) {
                                            fetchedOperations.push({
                                                id: operation.id || `${subCategory.id}-${operation.name}`,
                                                name: operation.name
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                });

                console.log('Final operations list:', fetchedOperations);

                if (fetchedOperations.length === 0) {
                    console.warn('No operations found in the product hierarchy');
                }

                setOperationsList(fetchedOperations);

            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [sessionId]);

    const handleInputChange = (field: keyof RejectFormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError('');
    };

    const validateForm = (): boolean => {
        if (!formData.reason) {
            setError('Please select a reason for rejection');
            return false;
        }
        if (!formData.qcId) {
            setError('Please select a Quality Controller');
            return false;
        }
        if (!qcPassword) {
            setError('QC password is required');
            return false;
        }
        if (!formData.count || formData.count < 1) {
            setError('Count must be at least 1');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isSubmitting || !validateForm()) return;

        setIsSubmitting(true);

        try {
            // Verify QC credentials
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', formData.qcId),
                where('password', '==', qcPassword),
                where('role', '==', 'QC')
            ));

            if (qcSnapshot.empty) {
                setError('Invalid QC credentials');
                setIsSubmitting(false);
                return;
            }

            const rejectData: RejectFormData = {
                reason: formData.reason!,
                operation: formData.operation || '',
                comments: formData.comments || '',
                qcId: formData.qcId!,
                count: formData.count!,
                productionLineId,
                supervisorId,
                sessionId,
                styleNumber,
                status: 'Open',
                recordedAsProduced: false
            };

            await onSubmit(rejectData);
            onClose();

        } catch (err) {
            console.error('Error submitting reject:', err);
            setError('Failed to submit reject. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <Dialog open={true} maxWidth="sm" fullWidth>
                <DialogContent>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={3}>
                        <CircularProgress />
                        <Typography>{loadingMessage}</Typography>
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
                    Log Reject
                </Typography>
                <IconButton
                    onClick={onClose}
                    size="small"
                    aria-label="close"
                >
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
                        {error && (
                            <Alert
                                severity="error"
                                sx={{ mb: 2 }}
                                onClose={() => setError('')}
                            >
                                {error}
                            </Alert>
                        )}

                        <Select
                            value={formData.reason}
                            onChange={(e) => handleInputChange('reason', e.target.value)}
                            displayEmpty
                            required
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                Select reason for rejection *
                            </MenuItem>
                            {reasonsList.map((reason, index) => (
                                <MenuItem key={index} value={reason}>
                                    {reason}
                                </MenuItem>
                            ))}
                        </Select>

                        <Select
                            value={formData.operation}
                            onChange={(e) => handleInputChange('operation', e.target.value)}
                            displayEmpty
                            sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                        >
                            <MenuItem value="" disabled>
                                Select operation (optional)
                            </MenuItem>
                            {operationsList.map((op) => (
                                <MenuItem key={op.id} value={op.name}>
                                    {op.name}
                                </MenuItem>
                            ))}
                        </Select>

                        <TextField
                            type="number"
                            label="Count *"
                            value={formData.count}
                            onChange={(e) => handleInputChange('count', parseInt(e.target.value) || 1)}
                            required
                            fullWidth
                            inputProps={{ min: 1 }}
                        />

                        <Select
                            value={formData.qcId}
                            onChange={(e) => handleInputChange('qcId', e.target.value)}
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
                            value={formData.comments}
                            onChange={(e) => handleInputChange('comments', e.target.value)}
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

export default Reject;