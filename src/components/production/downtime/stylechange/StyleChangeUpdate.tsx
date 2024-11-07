import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    TextField,
    Alert,
    Paper,
    Grid,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

interface StyleChangeUpdateProps {
    userRole: 'Supervisor' | 'Mechanic' | 'QC';
    userId: string;
    selectedChangeover: StyleChangeoverRecord;
}

interface User {
    employeeNumber: string;
    name: string;
    surname: string;
    role: string;
    password: string;
}

const StyleChangeUpdate: React.FC<StyleChangeUpdateProps> = ({
                                                                 userRole,
                                                                 userId,
                                                                 selectedChangeover
                                                             }) => {
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [stepToComplete, setStepToComplete] = useState<keyof StyleChangeoverRecord['progressSteps'] | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [localChangeover, setLocalChangeover] = useState<StyleChangeoverRecord>(selectedChangeover);
    const [comments, setComments] = useState<string>(''); // New state for comments

    useEffect(() => {
        setLocalChangeover(selectedChangeover);
    }, [selectedChangeover]);

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
            setError('Failed to load users.');
        }
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

        setIsProcessing(true);
        try {
            const user = users.find((user) => user.employeeNumber === selectedUser);
            if (!user || user.password !== password) {
                setError('Invalid password. Please try again.');
                setIsProcessing(false);
                return;
            }

            if (!stepToComplete) {
                setError('No step selected to complete.');
                setIsProcessing(false);
                return;
            }

            if (
                (stepToComplete === 'qcApproved' && user.role !== 'QC') ||
                (stepToComplete !== 'qcApproved' && user.role !== 'Supervisor')
            ) {
                setError('You do not have permission to complete this step.');
                setIsProcessing(false);
                return;
            }

            // Optimistically update the local state
            setLocalChangeover(prev => ({
                ...prev,
                progressSteps: {
                    ...prev.progressSteps,
                    [stepToComplete]: true,
                },
                completedBy: {
                    ...prev.completedBy,
                    [stepToComplete]: {
                        userId: user.employeeNumber,
                        timestamp: Timestamp.now(),
                        comments: comments, // Add comments to local state
                    },
                },
            }));

            // Firestore update
            await updateDoc(doc(db, 'styleChangeovers', selectedChangeover.id), {
                [`progressSteps.${stepToComplete}`]: true,
                [`completedBy.${stepToComplete}`]: {
                    userId: user.employeeNumber,
                    timestamp: Timestamp.now(),
                    comments: comments, // Add comments to Firestore
                },
                updatedAt: Timestamp.now(),
            });

            // Check if all steps are complete, and close if they are
            const allStepsCompleted = Object.values({
                ...localChangeover.progressSteps,
                [stepToComplete]: true
            }).every(value => value);

            if (allStepsCompleted) {
                setLocalChangeover(prev => ({
                    ...prev,
                    status: 'Closed',
                }));

                await updateDoc(doc(db, 'styleChangeovers', selectedChangeover.id), {
                    status: 'Closed',
                    closedAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
            }

            setStepToComplete(null);
            setPassword('');
            setSelectedUser('');
            setComments(''); // Clear comments
        } catch (error) {
            setError('Failed to complete step.');
        } finally {
            setIsProcessing(false);
        }
    };

    const promptPasswordAndCompleteStep = async (step: keyof StyleChangeoverRecord['progressSteps']) => {
        setStepToComplete(step);
        setPassword('');
        setError('');
        setSelectedUser('');
        setComments(''); // Reset comments

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
        setComments(''); // Clear comments
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                }}
            >
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <Typography color="text.secondary" variant="body2">
                            Current Style
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {localChangeover.currentStyle}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography color="text.secondary" variant="body2">
                            Next Style
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {localChangeover.nextStyle}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography color="text.secondary" variant="body2">
                            Target
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {localChangeover.target}
                        </Typography>
                    </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(['machineSetupComplete', 'peopleAllocated', 'firstUnitOffLine', 'qcApproved'] as Array<
                        keyof StyleChangeoverRecord['progressSteps']
                    >).map((step) => (
                        <Paper
                            key={step}
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: localChangeover.progressSteps[step] ? 'success.main' : 'divider',
                                borderRadius: 1,
                                bgcolor: localChangeover.progressSteps[step] ? 'success.main' : 'background.paper',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                            elevation={0}
                        >
                            <Typography
                                color={localChangeover.progressSteps[step] ? 'white' : 'text.primary'}
                                sx={{ fontWeight: localChangeover.progressSteps[step] ? 500 : 400 }}
                            >
                                {step.replace(/([A-Z])/g, ' $1')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')}
                            </Typography>

                            {!localChangeover.progressSteps[step] && (
                                <Button
                                    variant="contained"
                                    onClick={() => promptPasswordAndCompleteStep(step)}
                                    sx={{
                                        minWidth: 120,
                                        textTransform: 'none',
                                        borderRadius: 1
                                    }}
                                >
                                    Complete Step
                                </Button>
                            )}
                        </Paper>
                    ))}
                </Box>
            </Paper>

            {stepToComplete && (
                <Dialog
                    open={true}
                    onClose={handleCancelPasswordPrompt}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 2,
                            padding: 3,
                            maxWidth: '700px',
                            width: 'auto'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        Complete Step Verification
                        <IconButton
                            onClick={handleCancelPasswordPrompt}
                            size="small"
                            aria-label="close"
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ padding: '24px' }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            pt: 1
                        }}>
                            {error && <Alert severity="error">{error}</Alert>}

                            <Select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                displayEmpty
                                fullWidth
                            >
                                <MenuItem value="" disabled>
                                    Select User
                                </MenuItem>
                                {users.map((user) => (
                                    <MenuItem
                                        key={user.employeeNumber}
                                        value={user.employeeNumber}
                                    >
                                        {user.name} {user.surname}
                                    </MenuItem>
                                ))}
                            </Select>

                            <TextField
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                fullWidth
                            />

                            <TextField
                                multiline
                                rows={2}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add comments (optional)"
                                fullWidth
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 2, gap: 1 }}>
                        <Button
                            onClick={handleCancelPasswordPrompt}
                            variant="outlined"
                            sx={{ textTransform: 'none' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompleteStep}
                            variant="contained"
                            disabled={isProcessing}
                            sx={{ textTransform: 'none' }}
                        >
                            {isProcessing ? "Processing..." : "Submit"}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default StyleChangeUpdate;
