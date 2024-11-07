// src/components/Admin/TimeTables.tsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
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
    Chip,
} from '@mui/material';
import { Add, Delete, Edit, Close, Visibility } from '@mui/icons-material';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId?: string;
}

interface Schedule {
    id: string;
    slots: TimeSlot[];
    daysOfWeek: string[]; // Days this schedule applies to
}

interface TimeTable {
    id: string;
    name: string;
    description: string;
    isOvertime: boolean;
    schedules: Schedule[];
}

interface Break {
    id: string;
    name: string;
    description: string;
    duration: number; // Break duration in minutes
}

const TimeTables: React.FC = () => {
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [timeTableName, setTimeTableName] = useState('');
    const [timeTableDescription, setTimeTableDescription] = useState('');
    const [isOvertime, setIsOvertime] = useState<boolean>(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
    const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
    const [selectedTimeTable, setSelectedTimeTable] = useState<TimeTable | null>(null);
    const [selectedBreak, setSelectedBreak] = useState<Break | null>(null);
    const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [breakName, setBreakName] = useState('');
    const [breakDescription, setBreakDescription] = useState('');
    const [breakDuration, setBreakDuration] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isViewMode, setIsViewMode] = useState<boolean>(false);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Changed collection name to 'timeTable'
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTable'));
            const breaksSnapshot = await getDocs(collection(db, 'breaks'));
            const timeTablesData = timeTablesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as TimeTable[];
            const breaksData = breaksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Break[];
            setTimeTables(timeTablesData);
            setBreaks(breaksData);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    // Schedule Functions
    const handleAddSchedule = () => {
        setCurrentSchedule({
            id: Date.now().toString(),
            slots: [],
            daysOfWeek: [],
        });
        setEditingScheduleIndex(null);
    };

    const handleEditSchedule = (index: number) => {
        setCurrentSchedule(schedules[index]);
        setEditingScheduleIndex(index);
    };

    const handleSaveSchedule = () => {
        if (currentSchedule) {
            // Validate current schedule
            if (currentSchedule.slots.length === 0) {
                setError('Please add at least one time slot.');
                return;
            }
            if (currentSchedule.daysOfWeek.length === 0) {
                setError('Please select at least one day for the schedule.');
                return;
            }
            if (editingScheduleIndex !== null) {
                const updatedSchedules = [...schedules];
                updatedSchedules[editingScheduleIndex] = currentSchedule;
                setSchedules(updatedSchedules);
            } else {
                setSchedules([...schedules, currentSchedule]);
            }
            setCurrentSchedule(null);
            setEditingScheduleIndex(null);
            setError('');
        }
    };

    const handleAddTimeSlot = () => {
        if (currentSchedule) {
            const updatedSchedule = { ...currentSchedule };
            updatedSchedule.slots.push({
                id: Date.now().toString(),
                startTime: '',
                endTime: '',
                breakId: '',
            });
            setCurrentSchedule(updatedSchedule);
        }
    };

    const handleRemoveTimeSlot = (slotIndex: number) => {
        if (currentSchedule) {
            const updatedSchedule = { ...currentSchedule };
            updatedSchedule.slots.splice(slotIndex, 1);
            setCurrentSchedule(updatedSchedule);
        }
    };

    const handleTimeSlotChange = (
        slotIndex: number,
        field: keyof TimeSlot,
        value: any
    ) => {
        if (currentSchedule) {
            const updatedSchedule = { ...currentSchedule };
            updatedSchedule.slots[slotIndex][field] = value;
            setCurrentSchedule(updatedSchedule);
        }
    };

    const handleDaysOfWeekChange = (day: string) => {
        if (currentSchedule) {
            const updatedSchedule = { ...currentSchedule };
            if (updatedSchedule.daysOfWeek.includes(day)) {
                updatedSchedule.daysOfWeek = updatedSchedule.daysOfWeek.filter(d => d !== day);
            } else {
                updatedSchedule.daysOfWeek.push(day);
            }
            setCurrentSchedule(updatedSchedule);
        }
    };

    const handleSaveTimeTable = async () => {
        if (!timeTableName.trim()) {
            setError('Time Table Name is required.');
            return;
        }

        if (!timeTableDescription.trim()) {
            setError('Time Table Description is required.');
            return;
        }

        if (currentSchedule) {
            setError('Please save the current schedule before saving the time table.');
            return;
        }

        // Validate schedules
        if (schedules.length === 0) {
            setError('Please add at least one schedule.');
            return;
        }

        for (let schedule of schedules) {
            if (schedule.slots.length === 0) {
                setError('Each schedule must have at least one time slot.');
                return;
            }
            if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
                setError('Please select at least one day for each schedule.');
                return;
            }
            for (let slot of schedule.slots) {
                if (!slot.startTime || !slot.endTime) {
                    setError('All time slots must have start and end times.');
                    return;
                }
                if (slot.startTime >= slot.endTime) {
                    setError('Start time must be before end time in all slots.');
                    return;
                }
            }
        }

        const newTimeTable: Omit<TimeTable, 'id'> = {
            name: timeTableName,
            description: timeTableDescription,
            isOvertime,
            schedules,
        };

        try {
            if (selectedTimeTable) {
                // Changed collection name to 'timeTable'
                const timeTableDoc = doc(db, 'timeTable', selectedTimeTable.id);
                await updateDoc(timeTableDoc, newTimeTable);
            } else {
                await addDoc(collection(db, 'timeTable'), {
                    ...newTimeTable,
                    createdAt: Timestamp.now(),
                });
            }

            fetchData();
            setIsTimeTableModalOpen(false);
            // Reset form fields
            setTimeTableName('');
            setTimeTableDescription('');
            setIsOvertime(false);
            setSchedules([]);
            setCurrentSchedule(null);
            setEditingScheduleIndex(null);
            setError('');
        } catch (err) {
            console.error('Error saving time table:', err);
            setError('Failed to save time table. Please try again.');
        }
    };

    const handleDeleteTimeTable = async () => {
        if (selectedTimeTable) {
            if (window.confirm(`Are you sure you want to delete the time table "${selectedTimeTable.name}"?`)) {
                try {
                    // Changed collection name to 'timeTable'
                    await deleteDoc(doc(db, 'timeTable', selectedTimeTable.id));
                    fetchData();
                    setIsTimeTableModalOpen(false);
                    setError('');
                } catch (err) {
                    console.error('Error deleting time table:', err);
                    setError('Failed to delete time table. Please try again.');
                }
            }
        }
    };

    const openTimeTableModal = (timeTable?: TimeTable, viewMode = false) => {
        if (timeTable) {
            setSelectedTimeTable(timeTable);
            setTimeTableName(timeTable.name);
            setTimeTableDescription(timeTable.description);
            setIsOvertime(timeTable.isOvertime);
            setSchedules(timeTable.schedules || []);
        } else {
            setSelectedTimeTable(null);
            setTimeTableName('');
            setTimeTableDescription('');
            setIsOvertime(false);
            setSchedules([]);
        }
        setIsViewMode(viewMode);
        setCurrentSchedule(null);
        setEditingScheduleIndex(null);
        setIsTimeTableModalOpen(true);
        setError('');
    };

    // Break-related functions
    const handleSaveBreak = async () => {
        if (!breakName.trim()) {
            setError('Break Name is required.');
            return;
        }

        if (!breakDescription.trim()) {
            setError('Break Description is required.');
            return;
        }

        if (!breakDuration || breakDuration <= 0) {
            setError('Break Duration must be a positive number.');
            return;
        }

        const newBreak = {
            name: breakName,
            description: breakDescription,
            duration: breakDuration,
        };

        try {
            if (selectedBreak) {
                const breakDoc = doc(db, 'breaks', selectedBreak.id);
                await updateDoc(breakDoc, newBreak);
            } else {
                await addDoc(collection(db, 'breaks'), newBreak);
            }

            fetchData();
            setIsBreakModalOpen(false);
            // Reset form fields
            setBreakName('');
            setBreakDescription('');
            setBreakDuration('');
            setError('');
        } catch (err) {
            console.error('Error saving break:', err);
            setError('Failed to save break. Please try again.');
        }
    };

    const handleDeleteBreak = async () => {
        if (selectedBreak) {
            if (window.confirm(`Are you sure you want to delete the break "${selectedBreak.name}"?`)) {
                try {
                    await deleteDoc(doc(db, 'breaks', selectedBreak.id));
                    fetchData();
                    setIsBreakModalOpen(false);
                    setError('');
                } catch (err) {
                    console.error('Error deleting break:', err);
                    setError('Failed to delete break. Please try again.');
                }
            }
        }
    };

    const openBreakModal = (breakData?: Break) => {
        if (breakData) {
            setSelectedBreak(breakData);
            setBreakName(breakData.name);
            setBreakDescription(breakData.description);
            setBreakDuration(breakData.duration);
        } else {
            setSelectedBreak(null);
            setBreakName('');
            setBreakDescription('');
            setBreakDuration('');
        }
        setIsBreakModalOpen(true);
        setError('');
    };

    return (
        <Box sx={{ padding: 4 }}>
            <Grid container justifyContent="space-between" alignItems="center">
                <Typography variant="h4">Time Tables</Typography>
                <Box>
                    <Button variant="contained" color="primary" onClick={() => openBreakModal()}>
                        Create Break
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => openTimeTableModal()} sx={{ ml: 2 }}>
                        Create Time Table
                    </Button>
                </Box>
            </Grid>

            <Grid container spacing={4} sx={{ marginTop: 2 }}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h5" gutterBottom>
                        Existing Time Tables
                    </Typography>
                    {isLoading ? (
                        <Typography>Loading time tables...</Typography>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
                                    <TableRow>
                                        <TableCell sx={{ color: '#fff' }}>Name</TableCell>
                                        <TableCell sx={{ color: '#fff' }}>Description</TableCell>
                                        <TableCell sx={{ color: '#fff' }}>Overtime</TableCell>
                                        <TableCell align="right" sx={{ color: '#fff' }}>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {timeTables.map((tt) => (
                                        <TableRow key={tt.id}>
                                            <TableCell>{tt.name}</TableCell>
                                            <TableCell>{tt.description}</TableCell>
                                            <TableCell>{tt.isOvertime ? 'Yes' : 'No'}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => openTimeTableModal(tt, true)}>
                                                    <Visibility />
                                                </IconButton>
                                                <IconButton onClick={() => openTimeTableModal(tt)}>
                                                    <Edit />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {timeTables.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                No time tables available.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h5" gutterBottom>
                        Existing Breaks
                    </Typography>
                    {isLoading ? (
                        <Typography>Loading breaks...</Typography>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
                                    <TableRow>
                                        <TableCell sx={{ color: '#fff' }}>Name</TableCell>
                                        <TableCell sx={{ color: '#fff' }}>Description</TableCell>
                                        <TableCell sx={{ color: '#fff' }}>Duration (mins)</TableCell>
                                        <TableCell align="right" sx={{ color: '#fff' }}>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {breaks.map((br) => (
                                        <TableRow key={br.id}>
                                            <TableCell>{br.name}</TableCell>
                                            <TableCell>{br.description}</TableCell>
                                            <TableCell>{br.duration}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => openBreakModal(br)}>
                                                    <Edit />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {breaks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                No breaks available.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Grid>
            </Grid>

            {/* Time Table Dialog */}
            <Dialog
                open={isTimeTableModalOpen}
                onClose={() => setIsTimeTableModalOpen(false)}
                fullScreen={fullScreen}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedTimeTable
                        ? isViewMode
                            ? `View Time Table: ${selectedTimeTable.name}`
                            : `Edit Time Table: ${selectedTimeTable.name}`
                        : 'Create Time Table'}
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsTimeTableModalOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Time Table Name"
                                value={timeTableName}
                                onChange={(e) => setTimeTableName(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                disabled={isViewMode}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Description"
                                value={timeTableDescription}
                                onChange={(e) => setTimeTableDescription(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                disabled={isViewMode}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isOvertime}
                                        onChange={(e) => setIsOvertime(e.target.checked)}
                                        color="primary"
                                        disabled={isViewMode}
                                    />
                                }
                                label="Is Overtime Time Table"
                            />
                        </Grid>
                    </Grid>

                    {/* Schedules */}
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6">Schedules</Typography>

                        {/* Existing Schedules */}
                        {schedules.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                {schedules.map((schedule, index) => (
                                    <Paper
                                        key={schedule.id}
                                        sx={{ p: 2, mb: 2, backgroundColor: '#f9f9f9' }}
                                    >
                                        <Grid container alignItems="center" justifyContent="space-between">
                                            <Typography variant="subtitle1">Schedule {index + 1}</Typography>
                                            {!isViewMode && (
                                                <Box>
                                                    <IconButton onClick={() => handleEditSchedule(index)}>
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => {
                                                            const updatedSchedules = [...schedules];
                                                            updatedSchedules.splice(index, 1);
                                                            setSchedules(updatedSchedules);
                                                        }}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Grid>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            Applies to: {schedule.daysOfWeek.join(', ')}
                                        </Typography>
                                        <Table size="small">
                                            <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
                                                <TableRow>
                                                    <TableCell sx={{ color: '#fff' }}>From</TableCell>
                                                    <TableCell sx={{ color: '#fff' }}>To</TableCell>
                                                    <TableCell sx={{ color: '#fff' }}>Break</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {schedule.slots.map((slot) => (
                                                    <TableRow key={slot.id}>
                                                        <TableCell>{slot.startTime}</TableCell>
                                                        <TableCell>{slot.endTime}</TableCell>
                                                        <TableCell>
                                                            {slot.breakId
                                                                ? breaks.find((b) => b.id === slot.breakId)?.name || 'N/A'
                                                                : 'None'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                ))}
                            </Box>
                        )}

                        {/* Current Schedule */}
                        {currentSchedule && !isViewMode ? (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6">
                                    {editingScheduleIndex !== null ? 'Edit Schedule' : 'Define Schedule'}
                                </Typography>

                                {/* Time Slots */}
                                <TableContainer component={Paper} sx={{ mt: 2 }}>
                                    <Table size="small">
                                        <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
                                            <TableRow>
                                                <TableCell sx={{ color: '#fff', width: '30%' }}>From</TableCell>
                                                <TableCell sx={{ color: '#fff', width: '30%' }}>To</TableCell>
                                                <TableCell sx={{ color: '#fff', width: '30%' }}>Break</TableCell>
                                                <TableCell align="right" sx={{ color: '#fff', width: '10%' }}>
                                                    Action
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {currentSchedule.slots.map((slot, slotIndex) => (
                                                <TableRow key={slot.id}>
                                                    <TableCell>
                                                        <TextField
                                                            type="time"
                                                            value={slot.startTime}
                                                            onChange={(e) => handleTimeSlotChange(slotIndex, 'startTime', e.target.value)}
                                                            size="small"
                                                            fullWidth
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="time"
                                                            value={slot.endTime}
                                                            onChange={(e) => handleTimeSlotChange(slotIndex, 'endTime', e.target.value)}
                                                            size="small"
                                                            fullWidth
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormControl fullWidth size="small">
                                                            <Select
                                                                value={slot.breakId || ''}
                                                                onChange={(e) => handleTimeSlotChange(slotIndex, 'breakId', e.target.value)}
                                                                displayEmpty
                                                            >
                                                                <MenuItem value="">
                                                                    <em>None</em>
                                                                </MenuItem>
                                                                {breaks.map((br) => (
                                                                    <MenuItem key={br.id} value={br.id}>
                                                                        {br.name} ({br.duration} mins)
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton onClick={() => handleRemoveTimeSlot(slotIndex)}>
                                                            <Delete />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Button
                                    variant="outlined"
                                    startIcon={<Add />}
                                    onClick={handleAddTimeSlot}
                                    sx={{ mt: 1 }}
                                >
                                    Add Time Slot
                                </Button>

                                {/* Days of Week */}
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle1">Days this schedule applies to:</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                        {daysOfWeek.map((day) => (
                                            <Chip
                                                key={day}
                                                label={day}
                                                color={currentSchedule.daysOfWeek.includes(day) ? 'primary' : 'default'}
                                                onClick={() => handleDaysOfWeekChange(day)}
                                                clickable
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSaveSchedule}
                                        sx={{ mr: 2 }}
                                    >
                                        Save Schedule
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setCurrentSchedule(null);
                                            setEditingScheduleIndex(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            !isViewMode && (
                                <Box sx={{ mt: 2 }}>
                                    <Button variant="outlined" startIcon={<Add />} onClick={handleAddSchedule}>
                                        Add New Schedule
                                    </Button>
                                </Box>
                            )
                        )}
                    </Box>

                    {!isViewMode && (
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            {selectedTimeTable && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleDeleteTimeTable}
                                    startIcon={<Delete />}
                                    sx={{ mr: 2 }}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSaveTimeTable}
                            >
                                Save Time Table
                            </Button>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Break Dialog */}
            <Dialog
                open={isBreakModalOpen}
                onClose={() => setIsBreakModalOpen(false)}
                fullScreen={fullScreen}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedBreak ? `Edit Break: ${selectedBreak.name}` : 'Create Break'}
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsBreakModalOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Break Name"
                                value={breakName}
                                onChange={(e) => setBreakName(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                value={breakDescription}
                                onChange={(e) => setBreakDescription(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Duration (minutes)"
                                type="number"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                        {selectedBreak && (
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleDeleteBreak}
                                startIcon={<Delete />}
                                sx={{ mr: 2 }}
                            >
                                Delete
                            </Button>
                        )}
                        <Button variant="contained" color="primary" onClick={handleSaveBreak}>
                            Save Break
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default TimeTables;
