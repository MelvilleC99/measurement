import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    TextField,
    Button,
    Alert,
    IconButton,
    Select,
    MenuItem,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    updateDoc,
    doc,
    Timestamp,
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupportFunction } from '../../../../types';
import { SupplyRecord } from '../types';

interface SupplyUpdateProps {
    selectedDowntime: SupplyRecord;
    onClose: () => void;
}

const SupplyUpdate: React.FC<SupplyUpdateProps> = ({
                                                       selectedDowntime,
                                                       onClose
                                                   }) => {
    const [additionalComments, setAdditionalComments] = useState<string>('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [duration, setDuration] = useState<string>('');

    useEffect(() => {
        // Calculate duration
        const updateDuration = () => {
            const now = new Date();
            const start = selectedDowntime.startTime.toDate();
            const diff = Math.floor((now.getTime() - start.getTime()) / 1000); // difference in seconds
            const minutes = Math.floor(diff / 60);
            const seconds = diff % 60;
            setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateDuration();
        const intervalId = setInterval(updateDuration, 1000);

        return () => clearInterval(intervalId);
    }, [selectedDowntime.startTime]);

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const supportFunctionsRef = collection(db, 'supportFunctions');
                const q = query(
                    supportFunctionsRef,
                    where('role', '==', 'Supervisor'),
                    where('hasPassword', '==', true)
                );
                const querySnapshot = await getDocs(q);
                const supervisorsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction));
                setSupervisors(supervisorsList);
            } catch (err) {
                console.error('Error in fetchSupervisors:', err);
                setError('Failed to fetch supervisors');
            }
        };

        fetchSupervisors();
    }, []);

    const handleResolveClick = () => {
        setShowPasswordModal(true);
        setError('');
    };

    const handlePasswordSubmit = async () => {
        if (!selectedSupervisorId || !password) {
            setError('Please select a supervisor and enter password');
            return;
        }

        try {
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedSupervisorId),
                where('password', '==', password),
                where('role', '==', 'Supervisor'),
                where('hasPassword', '==', true)
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);

            if (supervisorSnapshot.empty) {
                setError('Invalid supervisor credentials');
                return;
            }

            await updateDoc(doc(db, 'supplyDowntime', selectedDowntime.id), {
                status: 'Closed',
                supervisorId: selectedSupervisorId,
                additionalComments,
                resolvedAt: Timestamp.now(),
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onClose();
        } catch (err) {
            console.error('Error in handlePasswordSubmit:', err);
            setError('Failed to resolve downtime');
        }
    };

    const handleClose = () => {
        setShowPasswordModal(false);
        setPassword('');
        setSelectedSupervisorId('');
        setError('');
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
                Supply Downtime Details
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Details Section */}
                    <Box sx={{
                        bgcolor: 'grey.50',
                        p: 2,
                        borderRadius: 1,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 2
                    }}>
                        <Box>
                            <Typography color="text.secondary" variant="body2">
                                Reason
                            </Typography>
                            <Typography>{selectedDowntime.reason}</Typography>
                        </Box>

                        <Box>
                            <Typography color="text.secondary" variant="body2">
                                Duration
                            </Typography>
                            <Typography>{duration}</Typography>
                        </Box>

                        <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography color="text.secondary" variant="body2">
                                Initial Comments
                            </Typography>
                            <Typography>{selectedDowntime.comments}</Typography>
                        </Box>
                    </Box>

                    {/* Comments Section */}
                    <TextField
                        multiline
                        rows={2}
                        value={additionalComments}
                        onChange={(e) => setAdditionalComments(e.target.value)}
                        placeholder="Add resolution comments"
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

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                        <Button
                            onClick={handleResolveClick}
                            variant="contained"
                            sx={{
                                minWidth: 200,
                                py: 1.5,
                                textTransform: 'none',
                                fontSize: '1rem'
                            }}
                        >
                            Resolve Downtime
                        </Button>
                    </Box>
                </Box>
            </DialogContent>

            {/* Supervisor Verification Modal */}
            {showPasswordModal && (
                <Dialog
                    open={true}
                    onClose={handleClose}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
                >
                    <DialogTitle sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        Supervisor Verification
                        <IconButton onClick={handleClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                            {error && <Alert severity="error">{error}</Alert>}

                            <Select
                                value={selectedSupervisorId}
                                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                                displayEmpty
                                fullWidth
                                sx={{
                                    borderRadius: 1,
                                    '& .MuiSelect-select': { py: 1.5 }
                                }}
                            >
                                <MenuItem value="" disabled>
                                    Select supervisor
                                </MenuItem>
                                {supervisors.map((supervisor) => (
                                    <MenuItem
                                        key={supervisor.id}
                                        value={supervisor.employeeNumber}
                                    >
                                        {`${supervisor.name} ${supervisor.surname}`}
                                    </MenuItem>
                                ))}
                            </Select>

                            <TextField
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        '& input': { py: 1.5, px: 1.5 }
                                    }
                                }}
                            />

                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                                <Button
                                    onClick={handleClose}
                                    variant="outlined"
                                    sx={{ minWidth: 100, textTransform: 'none' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handlePasswordSubmit}
                                    variant="contained"
                                    sx={{ minWidth: 100, textTransform: 'none' }}
                                >
                                    Confirm
                                </Button>
                            </Box>
                        </Box>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
};

export default SupplyUpdate;