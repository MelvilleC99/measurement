import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    TextField,
    Button,
    Alert,
    IconButton,
    Select,
    MenuItem,
    Typography,
    Card,
    CardContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    updateDoc,
    doc,
    Timestamp,
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../../../firebase';

interface MachineUpdateProps {
    userRole: 'Supervisor' | 'Mechanic';
    userId: string;
    selectedDowntime: {
        id: string;
        reason: string;
        machineNumber: string;
        comments: string;
        status: string;
        mechanicAcknowledged: boolean;
        mechanicId?: string;
        mechanicName?: string;
        supervisorId?: string;
        createdAt: any;
        updatedAt: any;
    };
    onClose: () => void;
    onAcknowledgeReceipt: () => void;
    mechanics: {
        employeeNumber: string;
        name: string;
        surname: string;
        password: string;
    }[];
}

const MachineUpdate: React.FC<MachineUpdateProps> = ({
                                                         userRole,
                                                         userId,
                                                         selectedDowntime,
                                                         onClose,
                                                         onAcknowledgeReceipt,
                                                         mechanics
                                                     }) => {
    const [selectedMechanic, setSelectedMechanic] = useState('');
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [additionalComments, setAdditionalComments] = useState('');
    const [updatedReason, setUpdatedReason] = useState(selectedDowntime.reason);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [duration, setDuration] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [reasonsList, setReasonsList] = useState<string[]>([]);
    const [showSupervisorVerification, setShowSupervisorVerification] = useState(false);

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const reasonsSnapshot = await getDocs(collection(db, 'downtimeCategories'));
                const machineDoc = reasonsSnapshot.docs.find((doc) => doc.data().name === 'Machine');
                const reasonsData = machineDoc?.data().reasons || [];
                setReasonsList(reasonsData);
            } catch (error) {
                console.error('Error fetching reasons:', error);
                setError('Failed to load reasons.');
            }
        };

        fetchReasons();
    }, []);

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const supervisorsQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Supervisor')
                );
                const snapshot = await getDocs(supervisorsQuery);
                const fetchedSupervisors = snapshot.docs.map(doc => ({
                    employeeNumber: doc.data().employeeNumber,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    password: doc.data().password,
                }));
                setSupervisors(fetchedSupervisors);
            } catch (err) {
                console.error('Error fetching supervisors:', err);
                setError('Failed to load supervisors');
            }
        };

        fetchSupervisors();
    }, []);

    useEffect(() => {
        setSelectedMechanic('');
        setSelectedSupervisor('');
        setAdditionalComments('');
        setUpdatedReason(selectedDowntime.reason);
        setPassword('');
        setError('');
    }, [selectedDowntime]);

    useEffect(() => {
        const updateDuration = () => {
            const now = new Date();
            const start = selectedDowntime.createdAt.toDate();
            const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
            const minutes = Math.floor(diff / 60);
            const seconds = diff % 60;
            setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateDuration();
        const intervalId = setInterval(updateDuration, 1000);

        return () => clearInterval(intervalId);
    }, [selectedDowntime.createdAt]);

    const handleAcknowledgeReceipt = async () => {
        if (!selectedMechanic || !password) {
            setError('Please select a mechanic and enter your password.');
            return;
        }

        setIsProcessing(true);
        try {
            const mechanicQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedMechanic.trim()),
                where('password', '==', password.trim()),
                where('role', '==', 'Mechanic')
            );

            const mechanicSnapshot = await getDocs(mechanicQuery);

            if (mechanicSnapshot.empty) {
                setError('Incorrect password. Please try again.');
                return;
            }

            const mechanic = mechanicSnapshot.docs[0].data();

            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                mechanicId: selectedMechanic,
                mechanicName: `${mechanic.name} ${mechanic.surname}`,
                mechanicAcknowledged: true,
                mechanicAcknowledgedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            onAcknowledgeReceipt();
            onClose();
        } catch (error) {
            console.error('Error acknowledging receipt:', error);
            setError('Failed to acknowledge receipt.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResolveDowntime = async () => {
        if (!selectedSupervisor || !password) {
            setError('Please select a supervisor and enter password');
            return;
        }

        setIsProcessing(true);
        try {
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedSupervisor.trim()),
                where('password', '==', password.trim()),
                where('role', '==', 'Supervisor')
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);

            if (supervisorSnapshot.empty) {
                setError('Invalid supervisor credentials');
                setIsProcessing(false);
                return;
            }

            await updateDoc(doc(db, 'machineDowntimes', selectedDowntime.id), {
                status: 'Closed',
                supervisorId: selectedSupervisor,
                reason: updatedReason,
                additionalComments: additionalComments.trim(),
                resolvedAt: Timestamp.now(),
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onClose();
        } catch (error) {
            console.error('Error resolving downtime:', error);
            setError('Failed to resolve downtime.');
        } finally {
            setIsProcessing(false);
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
                Machine Downtime Details
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {/* Details Card */}
                    <Card sx={{ bgcolor: 'grey.50' }}>
                        <CardContent sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 2
                        }}>
                            <Box>
                                <Typography color="text.secondary" variant="body2">
                                    Machine Number
                                </Typography>
                                <Typography variant="body1">
                                    {selectedDowntime.machineNumber}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography color="text.secondary" variant="body2">
                                    Duration
                                </Typography>
                                <Typography variant="body1">{duration}</Typography>
                            </Box>

                            <Box>
                                <Typography color="text.secondary" variant="body2">
                                    Initial Reason
                                </Typography>
                                <Typography variant="body1">
                                    {selectedDowntime.reason}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography color="text.secondary" variant="body2">
                                    Status
                                </Typography>
                                <Typography variant="body1">
                                    {selectedDowntime.mechanicAcknowledged ? 'Acknowledged' : 'Open'}
                                </Typography>
                            </Box>

                            {selectedDowntime.mechanicName && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography color="text.secondary" variant="body2">
                                        Assigned Mechanic
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedDowntime.mechanicName}
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography color="text.secondary" variant="body2">
                                    Initial Comments
                                </Typography>
                                <Typography variant="body1">
                                    {selectedDowntime.comments || 'No comments provided'}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Mechanic Acknowledgment Form */}
                    {!selectedDowntime.mechanicAcknowledged && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Select
                                value={selectedMechanic}
                                onChange={(e) => setSelectedMechanic(e.target.value)}
                                displayEmpty
                                required
                                sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                            >
                                <MenuItem value="" disabled>
                                    Select mechanic
                                </MenuItem>
                                {mechanics.map((mechanic) => (
                                    <MenuItem
                                        key={mechanic.employeeNumber}
                                        value={mechanic.employeeNumber}
                                    >
                                        {mechanic.name} {mechanic.surname}
                                    </MenuItem>
                                ))}
                            </Select>

                            <TextField
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& input': { py: 1.5, px: 1.5 }
                                    }
                                }}
                            />

                            <Button
                                onClick={handleAcknowledgeReceipt}
                                variant="contained"
                                disabled={isProcessing}
                                fullWidth
                                sx={{ py: 1.5, textTransform: 'none' }}
                            >
                                {isProcessing ? "Processing..." : "Acknowledge Receipt"}
                            </Button>
                        </Box>
                    )}

                    {/* Resolution Form */}
                    {selectedDowntime.mechanicAcknowledged &&
                        selectedDowntime.status === 'Open' &&
                        userRole === 'Supervisor' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Select
                                    value={updatedReason}
                                    onChange={(e) => setUpdatedReason(e.target.value)}
                                    displayEmpty
                                    required
                                    sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                                >
                                    <MenuItem value="" disabled>
                                        Select final reason
                                    </MenuItem>
                                    {reasonsList.map((reason, index) => (
                                        <MenuItem key={index} value={reason}>
                                            {reason}
                                        </MenuItem>
                                    ))}
                                </Select>

                                <TextField
                                    value={additionalComments}
                                    onChange={(e) => setAdditionalComments(e.target.value)}
                                    placeholder="Add resolution comments"
                                    multiline
                                    rows={2}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& textarea': { p: 1.5 }
                                        }
                                    }}
                                />

                                <Button
                                    onClick={() => setShowSupervisorVerification(true)}
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    sx={{ py: 1.5, textTransform: 'none' }}
                                >
                                    Complete Resolution
                                </Button>
                            </Box>
                        )}

                    {/* Supervisor Verification Dialog */}
                    {showSupervisorVerification && (
                        <Dialog
                            open={true}
                            onClose={() => setShowSupervisorVerification(false)}
                            maxWidth="xs"
                            fullWidth
                            PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
                        >
                            <DialogTitle>
                                Supervisor Verification
                            </DialogTitle>
                            <DialogContent>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                                    <Select
                                        value={selectedSupervisor}
                                        onChange={(e) => setSelectedSupervisor(e.target.value)}
                                        displayEmpty
                                        required
                                        sx={{ '& .MuiSelect-select': { py: 1.5 } }}
                                    >
                                        <MenuItem value="" disabled>
                                            Select supervisor
                                        </MenuItem>
                                        {supervisors.map((supervisor) => (
                                            <MenuItem
                                                key={supervisor.employeeNumber}
                                                value={supervisor.employeeNumber}
                                            >
                                                {supervisor.name} {supervisor.surname}
                                            </MenuItem>
                                        ))}
                                    </Select>

                                    <TextField
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& input': { py: 1.5, px: 1.5 }
                                            }
                                        }}
                                    />
                                </Box>
                            </DialogContent>
                            <DialogActions sx={{ p: 2, gap: 1 }}>
                                <Button
                                    onClick={() => setShowSupervisorVerification(false)}
                                    variant="outlined"
                                    sx={{ minWidth: 100, textTransform: 'none' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleResolveDowntime}
                                    variant="contained"
                                    disabled={isProcessing}
                                    sx={{ minWidth: 100, textTransform: 'none' }}
                                >
                                    {isProcessing ? "Processing..." : "Confirm"}
                                </Button>
                            </DialogActions>
                        </Dialog>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ minWidth: 100, textTransform: 'none' }}
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MachineUpdate;