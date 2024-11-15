// src/components/Admin/ScheduleOvertime.tsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar,
    Alert,
    IconButton,
    Checkbox,
    Grid, // Imported Grid
} from '@mui/material';
import { Add, Delete, Edit, Close, Visibility } from '@mui/icons-material'; // Imported Edit
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    writeBatch,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ProductionLine, TimeTableAssignment, TimeTable } from '../../types';

const ScheduleOvertime: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isViewMode, setIsViewMode] = useState<boolean>(false);

    // Form States
    const [selectedTimeTableId, setSelectedTimeTableId] = useState<string>('');
    const [selectedProductionLineIds, setSelectedProductionLineIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>(''); // 'YYYY-MM-DD'
    const [endDate, setEndDate] = useState<string>('');     // 'YYYY-MM-DD'
    const [currentAssignment, setCurrentAssignment] = useState<{
        productionLineIds: string[];
        timeTableId: string;
        startDate: string;
        endDate: string;
    } | null>(null);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Production Lines
            const linesSnap = await getDocs(collection(db, 'productionLines'));
            const linesData = linesSnap.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            })) as ProductionLine[];
            setProductionLines(linesData);

            // Fetch Time Tables (including overtime)
            const ttSnap = await getDocs(collection(db, 'timeTable'));
            const ttData = ttSnap.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            })) as TimeTable[];
            setTimeTables(ttData);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data.');
        } finally {
            setIsLoading(false);
        }
    };

    // Open Modal for Creating or Viewing Assignments
    const openModal = (assignment?: {
        productionLineIds: string[];
        timeTableId: string;
        startDate: string;
        endDate: string;
    }, viewMode: boolean = false) => {
        if (assignment) {
            setSelectedTimeTableId(assignment.timeTableId);
            setSelectedProductionLineIds(assignment.productionLineIds);
            setStartDate(assignment.startDate);
            setEndDate(assignment.endDate);
            setCurrentAssignment(assignment);
        } else {
            // Reset form for creating new assignment
            setSelectedTimeTableId('');
            setSelectedProductionLineIds([]);
            setStartDate('');
            setEndDate('');
            setCurrentAssignment(null);
        }
        setIsViewMode(viewMode);
        setError('');
        setIsModalOpen(true);
    };

    // Close Modal
    const closeModal = () => {
        setIsModalOpen(false);
    };

    // Handle Assigning Overtime Schedule
    const handleAssignOvertime = async () => {
        // Basic Validation
        if (!selectedTimeTableId) {
            setError('Please select a Time Table.');
            return;
        }
        if (selectedProductionLineIds.length === 0) {
            setError('Please select at least one Production Line.');
            return;
        }
        if (!startDate || !endDate) {
            setError('Please select Start Date and End Date.');
            return;
        }
        if (startDate > endDate) {
            setError('Start Date must be before End Date.');
            return;
        }

        // Create the new assignment object without 'updatedAt'
        const newAssignment: TimeTableAssignment = {
            fromDate: startDate,
            id: Date.now().toString(),
            timeTableId: selectedTimeTableId,
            timeTableName: timeTables.find(tt => tt.id === selectedTimeTableId)?.isOvertime ? 'Overtime' : 'Regular',
            toDate: endDate,
        };

        try {
            const batch = writeBatch(db);
            selectedProductionLineIds.forEach(lineId => {
                const lineRef = doc(db, 'productionLines', lineId);
                const line = productionLines.find(pl => pl.id === lineId);
                if (line) {
                    const updatedAssignments = [...line.timeTableAssignments, newAssignment];
                    batch.update(lineRef, {timeTableAssignments: updatedAssignments});
                }
            });
            await batch.commit();

            setSnackbar({
                open: true,
                message: 'Overtime assigned successfully!',
                severity: 'success',
            });
            fetchData();
            closeModal();
        } catch (err) {
            console.error('Error assigning overtime:', err);
            setError('Failed to assign overtime.');
        }
    };

    // Handle Deleting Overtime Assignment
    const handleDeleteAssignment = async (lineId: string, assignmentId: string) => {
        if (window.confirm('Are you sure you want to delete this overtime assignment?')) {
            try {
                const lineRef = doc(db, 'productionLines', lineId);
                const line = productionLines.find(pl => pl.id === lineId);
                if (line) {
                    const updatedAssignments = line.timeTableAssignments.filter(a => a.id !== assignmentId);
                    await updateDoc(lineRef, {timeTableAssignments: updatedAssignments});
                    setSnackbar({
                        open: true,
                        message: 'Overtime assignment deleted successfully!',
                        severity: 'success',
                    });
                    fetchData();
                }
            } catch (err) {
                console.error('Error deleting assignment:', err);
                setError('Failed to delete assignment.');
            }
        }
    };

    // Handle Snackbar Close
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({...prev, open: false}));
    };

    return (
        <Box sx={{padding: 4}}>
            <Grid container justifyContent="space-between" alignItems="center">
                <Typography variant="h4">Overtime Schedules</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add/>}
                    onClick={() => openModal()}
                >
                    Create Overtime Schedule
                </Button>
            </Grid>

            <Grid container spacing={4} sx={{marginTop: 2}}>
                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom>
                        Existing Overtime Assignments
                    </Typography>
                    {isLoading ? (
                        <Typography>Loading overtime assignments...</Typography>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead sx={{backgroundColor: theme.palette.primary.main}}>
                                    <TableRow>
                                        <TableCell sx={{color: '#fff'}}>Production Line</TableCell>
                                        <TableCell sx={{color: '#fff'}}>Time Table</TableCell>
                                        <TableCell sx={{color: '#fff'}}>Start Date</TableCell>
                                        <TableCell sx={{color: '#fff'}}>End Date</TableCell>
                                        <TableCell align="right" sx={{color: '#fff'}}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {productionLines.map(line => (
                                        line.timeTableAssignments
                                            .filter(a => a.timeTableName === 'Overtime')
                                            .map(a => (
                                                <TableRow key={`${line.id}-${a.id}`}>
                                                    <TableCell>{line.name}</TableCell>
                                                    <TableCell>{a.timeTableName}</TableCell>
                                                    <TableCell>{a.fromDate}</TableCell>
                                                    <TableCell>{a.toDate}</TableCell>
                                                    <TableCell align="right">
                                                        <IconButton onClick={() => openModal({
                                                            productionLineIds: [line.id],
                                                            timeTableId: a.timeTableId,
                                                            startDate: a.fromDate,
                                                            endDate: a.toDate,
                                                        }, true)}>
                                                            <Visibility/>
                                                        </IconButton>
                                                        <IconButton onClick={() => openModal({
                                                            productionLineIds: [line.id],
                                                            timeTableId: a.timeTableId,
                                                            startDate: a.fromDate,
                                                            endDate: a.toDate,
                                                        }, false)}>
                                                            <Edit/>
                                                        </IconButton>
                                                        <IconButton
                                                            onClick={() => handleDeleteAssignment(line.id, a.id)}>
                                                            <Delete/>
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    ))}
                                    {productionLines.every(line => line.timeTableAssignments.filter(a => a.timeTableName === 'Overtime').length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                No overtime assignments available.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Grid>
            </Grid>

            {/* Overtime Assignment Modal */}
            <Dialog
                open={isModalOpen}
                onClose={closeModal}
                fullScreen={fullScreen}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {isViewMode ? 'View Overtime Assignment' : 'Create Overtime Assignment'}
                    <IconButton
                        aria-label="close"
                        onClick={closeModal}
                        sx={{position: 'absolute', right: 8, top: 8}}
                    >
                        <Close/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Typography color="error" sx={{mb: 2}}>
                            {error}
                        </Typography>
                    )}

                    {!isViewMode && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="h6">
                                    Assign Overtime Schedule
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="time-table-select-label">Select Time Table</InputLabel>
                                    <Select
                                        labelId="time-table-select-label"
                                        value={selectedTimeTableId}
                                        label="Select Time Table"
                                        onChange={(e) => setSelectedTimeTableId(e.target.value)}
                                    >
                                        {timeTables.map(tt => (
                                            <MenuItem key={tt.id} value={tt.id}>
                                                {tt.name} {tt.isOvertime ? '(Overtime)' : ''}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="production-lines-select-label">Select Production Lines</InputLabel>
                                    <Select
                                        labelId="production-lines-select-label"
                                        multiple
                                        value={selectedProductionLineIds}
                                        onChange={(e) =>
                                            setSelectedProductionLineIds(
                                                typeof e.target.value === 'string'
                                                    ? e.target.value.split(',')
                                                    : e.target.value
                                            )
                                        }
                                        label="Select Production Lines"
                                        renderValue={(selected) => {
                                            const selectedNames = productionLines
                                                .filter(pl => selected.includes(pl.id))
                                                .map(pl => pl.name)
                                                .join(', ');
                                            return selectedNames;
                                        }}
                                    >
                                        {productionLines.map(pl => (
                                            <MenuItem key={pl.id} value={pl.id}>
                                                <Checkbox checked={selectedProductionLineIds.indexOf(pl.id) > -1}/>
                                                <Typography variant="body1">{pl.name}</Typography>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    fullWidth
                                    size="small"
                                    InputLabelProps={{shrink: true}}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="End Date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    fullWidth
                                    size="small"
                                    InputLabelProps={{shrink: true}}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {isViewMode && currentAssignment && (
                        <Box>
                            <Typography variant="subtitle1">
                                <strong>Time
                                    Table:</strong> {timeTables.find(tt => tt.id === currentAssignment.timeTableId)?.name || 'N/A'}
                            </Typography>
                            <Typography variant="subtitle1">
                                <strong>Start Date:</strong> {currentAssignment.startDate}
                            </Typography>
                            <Typography variant="subtitle1">
                                <strong>End Date:</strong> {currentAssignment.endDate}
                            </Typography>
                            <Typography variant="subtitle1">
                                <strong>Production
                                    Lines:</strong> {currentAssignment.productionLineIds.map(id => productionLines.find(pl => pl.id === id)?.name).join(', ')}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                {!isViewMode && (
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', p: 2}}>
                        <Button variant="contained" color="primary" onClick={handleAssignOvertime}>
                            {currentAssignment ? 'Update' : 'Assign'}
                        </Button>
                    </Box>
                )}
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{width: '100%'}}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
    export default ScheduleOvertime;
