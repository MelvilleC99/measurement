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
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    Timestamp,
    addDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupportFunction } from '../../../../types';
import LateList from '../../../StandardDesign/list/LateList';
import type { LateListItemData } from '../../../StandardDesign/list/LateList';

interface LateUpdateProps {
    onClose: () => void;
    onUpdate: () => void;
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface LateRecord {
    id: string;
    date: Date;
    employeeId: string;
    employeeNumber: string;
    name: string;
    surname: string;
    status: 'late';
    updatedAt: Timestamp;
    updatedBy?: string;
    comments?: string;
    time: string;
    reason?: string;
}

const LateUpdate: React.FC<LateUpdateProps> = ({
                                                   onClose,
                                                   onUpdate,
                                                   sessionId,
                                                   lineId,
                                                   supervisorId
                                               }) => {
    const [lateRecords, setLateRecords] = useState<LateRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<LateRecord | null>(null);
    const [additionalComments, setAdditionalComments] = useState<string>('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent' | null>(null);

    useEffect(() => {
        fetchLateRecords();
        fetchSupervisors();
    }, [sessionId]);

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

    const fetchLateRecords = async () => {
        try {
            setIsLoading(true);
            const lateQuery = query(
                collection(db, 'attendance'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'late')
            );
            const attendanceSnapshot = await getDocs(lateQuery);

            // Get all employee IDs
            const employeeIds = attendanceSnapshot.docs.map(doc => doc.data().employeeId);

            if (employeeIds.length === 0) {
                setLateRecords([]);
                return;
            }

            // Get employee details from supportFunctions using document IDs
            const employees = await Promise.all(
                employeeIds.map(id => getDoc(doc(db, 'supportFunctions', id)))
            );

            // Create a map of employee details
            const employeeMap = new Map();
            employees.forEach(employeeDoc => {
                if (employeeDoc.exists()) {
                    const data = employeeDoc.data();
                    employeeMap.set(employeeDoc.id, {
                        employeeNumber: data.employeeNumber,
                        name: data.name,
                        surname: data.surname
                    });
                }
            });

            // Combine attendance and employee data
            const records: LateRecord[] = attendanceSnapshot.docs.map(doc => {
                const attendanceData = doc.data();
                const employeeData = employeeMap.get(attendanceData.employeeId) || {};

                return {
                    id: doc.id,
                    employeeId: attendanceData.employeeId,
                    employeeNumber: employeeData.employeeNumber || 'Unknown',
                    name: employeeData.name || 'Unknown',
                    surname: employeeData.surname || 'Unknown',
                    date: attendanceData.date.toDate(),
                    status: 'late',
                    time: attendanceData.time,
                    reason: attendanceData.reason,
                    updatedAt: attendanceData.updatedAt,
                    updatedBy: attendanceData.updatedBy,
                    comments: attendanceData.comments
                } as LateRecord;
            });

            setLateRecords(records);
        } catch (err) {
            console.error('Error fetching late records:', err);
            setError('Failed to load late records');
        } finally {
            setIsLoading(false);
        }
    };

    const formatLateRecords = (records: LateRecord[]): LateListItemData[] => {
        return records.map(record => ({
            id: record.id,
            employeeNumber: record.employeeNumber,
            name: record.name,
            surname: record.surname,
            status: 'Late'
        }));
    };

    const handleListItemClick = (item: LateListItemData) => {
        const record = lateRecords.find(r => r.id === item.id);
        if (record) {
            setSelectedRecord(record);
            setAdditionalComments('');
            setError('');
            setShowPasswordModal(false);
        }
    };

    const handleStatusUpdate = (status: 'present' | 'absent') => {
        setSelectedStatus(status);
        setShowPasswordModal(true);
        setError('');
    };

    const handlePasswordSubmit = async () => {
        if (!selectedRecord || !selectedStatus) return;

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

            await updateDoc(doc(db, 'attendance', selectedRecord.id), {
                status: selectedStatus,
                supervisorId: selectedSupervisorId,
                comments: additionalComments || `Marked as ${selectedStatus}`,
                updatedAt: Timestamp.now()
            });

            if (selectedStatus === 'absent') {
                await addDoc(collection(db, 'absent'), {
                    employeeId: selectedRecord.employeeId,
                    reason: selectedRecord.reason || '',
                    startDate: selectedRecord.date,
                    endDate: selectedRecord.date,
                    productionLineId: lineId,
                    supervisorId: selectedSupervisorId,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    status: 'Open',
                    employeeNumber: selectedRecord.employeeNumber,
                    name: selectedRecord.name,
                    surname: selectedRecord.surname,
                    comments: additionalComments || ''
                });
            }

            setSelectedRecord(null);
            setPassword('');
            setSelectedSupervisorId('');
            setAdditionalComments('');
            setShowPasswordModal(false);
            await fetchLateRecords();
            onUpdate();
        } catch (err) {
            console.error('Error updating late record:', err);
            setError('Failed to update record');
        }
    };

    const handleClose = () => {
        setShowPasswordModal(false);
        setPassword('');
        setSelectedSupervisorId('');
        setError('');
    };

    if (isLoading) {
        return (
            <Dialog open={true} maxWidth="md" fullWidth>
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
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: '800px',
                    m: 2
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h2">
                    {selectedRecord ? 'Update Late Record' : 'Update Late Records'}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {!selectedRecord ? (
                        <LateList
                            items={formatLateRecords(lateRecords)}
                            onItemClick={handleListItemClick}
                            emptyMessage="No late records to display"
                        />
                    ) : (
                        <>
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
                                        Employee
                                    </Typography>
                                    <Typography>{selectedRecord.name} {selectedRecord.surname}</Typography>
                                </Box>

                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Employee #
                                    </Typography>
                                    <Typography>{selectedRecord.employeeNumber}</Typography>
                                </Box>

                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Date
                                    </Typography>
                                    <Typography>{selectedRecord.date.toLocaleDateString()}</Typography>
                                </Box>

                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Time
                                    </Typography>
                                    <Typography>{selectedRecord.time}</Typography>
                                </Box>

                                {selectedRecord.reason && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography color="text.secondary" variant="body2">
                                            Reason
                                        </Typography>
                                        <Typography>{selectedRecord.reason}</Typography>
                                    </Box>
                                )}
                            </Box>

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

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 1 }}>
                                <Button
                                    onClick={() => handleStatusUpdate('present')}
                                    variant="contained"
                                    color="primary"
                                    sx={{
                                        minWidth: 160,
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Mark as Present
                                </Button>
                                <Button
                                    onClick={() => handleStatusUpdate('absent')}
                                    variant="contained"
                                    color="error"
                                    sx={{
                                        minWidth: 160,
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Mark as Absent
                                </Button>
                            </Box>
                        </>
                    )}
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

export default LateUpdate;