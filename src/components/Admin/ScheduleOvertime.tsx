// src/components/Admin/ScheduleOvertime.tsx

import React, { useState, useEffect } from 'react';
import './ScheduleOvertime.css';
import {
    Grid,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Snackbar,
    Alert,
    Box,
    TextField,
} from '@mui/material';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, doc, arrayUnion, writeBatch } from 'firebase/firestore';

interface TimeTable {
    id: string;
    name: string;
    description: string;
    isOvertime: boolean;
    slots: TimeSlot[];
}

interface TimeSlot {
    id: string;
    type: 'work' | 'break';
    startTime: string;
    endTime: string;
}

interface ProductionLine {
    id: string;
    name: string;
}

const ScheduleOvertime: React.FC = () => {
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [selectedTimeTable, setSelectedTimeTable] = useState<string>('');
    const [selectedProductionLines, setSelectedProductionLines] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<[Date | null, Date | null]>([null, null]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [viewTimeTable, setViewTimeTable] = useState<TimeTable | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch TimeTables and ProductionLines from Firestore on component mount
    useEffect(() => {
        fetchTimeTables();
        fetchProductionLines();
    }, []);

    const fetchTimeTables = async () => {
        try {
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
            const timeTablesData: TimeTable[] = timeTablesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || '',
                    description: data.description || '',
                    isOvertime: data.isOvertime || false,
                    slots: data.slots || [],
                } as TimeTable;
            })
                .filter(tt => tt.isOvertime)
                .sort((a, b) => a.name.localeCompare(b.name));
            setTimeTables(timeTablesData);
        } catch (error) {
            console.error('Error fetching time tables:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load time tables. Please try again later.',
                severity: 'error',
            });
        }
    };

    const fetchProductionLines = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            const linesData: ProductionLine[] = linesSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || '',
            }));
            setProductionLines(linesData);
        } catch (error) {
            console.error('Error fetching production lines:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load production lines. Please try again later.',
                severity: 'error',
            });
        }
    };

    const handleScheduleOvertime = async () => {
        if (!selectedTimeTable || selectedProductionLines.length === 0 || !selectedPeriod[0] || !selectedPeriod[1]) {
            setSnackbar({
                open: true,
                message: 'Please fill out all required fields.',
                severity: 'error',
            });
            return;
        }

        const [startDate, endDate] = selectedPeriod;
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        setIsSubmitting(true);

        const overtimeSchedule = {
            timeTableId: selectedTimeTable,
            productionLineIds: selectedProductionLines,
            startDate: startDateStr,
            endDate: endDateStr,
            isOvertime: true,
            createdAt: new Date().toISOString(),
        };

        try {
            const docRef = await addDoc(collection(db, 'overtimeSchedules'), overtimeSchedule);
            const overtimeScheduleId = docRef.id;

            // Update each ProductionLine with the new overtime schedule reference using a batch
            const batch = writeBatch(db);
            selectedProductionLines.forEach(lineId => {
                const lineRef = doc(db, 'productionLines', lineId);
                batch.update(lineRef, {
                    overtimeScheduleIds: arrayUnion(overtimeScheduleId),
                });
            });

            await batch.commit();

            setSnackbar({
                open: true,
                message: 'Overtime schedule successfully created!',
                severity: 'success',
            });

            // Reset form
            setSelectedTimeTable('');
            setSelectedProductionLines([]);
            setSelectedPeriod([null, null]);
        } catch (error) {
            console.error('Error scheduling overtime:', error);
            setSnackbar({
                open: true,
                message: 'An error occurred while scheduling overtime.',
                severity: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewTimeTable = (timeTableId: string) => {
        const timeTable = timeTables.find(tt => tt.id === timeTableId) || null;
        setViewTimeTable(timeTable);
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({...prev, open: false}));
    };

    return (
        <Grid container justifyContent="center" className="schedule-overtime-wrapper">
            <Grid item xs={12} md={8}>
                <Paper elevation={3} className="schedule-overtime-container">
                    <Typography variant="h4" align="center" gutterBottom>
                        Schedule Overtime
                    </Typography>

                    <Grid container spacing={3}>
                        {/* Select Time Table */}
                        <Grid item xs={12}>
                            <FormControl fullWidth required className="form-control">
                                <InputLabel id="time-table-label">Select Time Table</InputLabel>
                                <Select
                                    labelId="time-table-label"
                                    id="timeTable"
                                    value={selectedTimeTable}
                                    label="Select Time Table"
                                    onChange={(e) => setSelectedTimeTable(e.target.value)}
                                    className="select-dropdown"
                                >
                                    {timeTables.map(tt => (
                                        <MenuItem key={tt.id} value={tt.id}>
                                            {tt.name} - {tt.description}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* View Time Table Button */}
                        <Grid item xs={12} className="view-button-container">
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => selectedTimeTable && handleViewTimeTable(selectedTimeTable)}
                                disabled={!selectedTimeTable}
                                className="view-button"
                            >
                                View Time Table
                            </Button>
                        </Grid>

                        {/* Select Production Lines */}
                        <Grid item xs={12}>
                            <FormControl fullWidth required className="form-control">
                                <InputLabel id="production-lines-label">Select Production Lines</InputLabel>
                                <Select
                                    labelId="production-lines-label"
                                    id="productionLines"
                                    multiple
                                    value={selectedProductionLines}
                                    onChange={(e) => setSelectedProductionLines(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                    label="Select Production Lines"
                                    className="select-dropdown"
                                    renderValue={(selected) => {
                                        const selectedNames = productionLines
                                            .filter(line => selected.includes(line.id))
                                            .map(line => line.name)
                                            .join(', ');
                                        return selectedNames;
                                    }}
                                >
                                    {productionLines.map(line => (
                                        <MenuItem key={line.id} value={line.id}>
                                            <Checkbox checked={selectedProductionLines.indexOf(line.id) > -1}/>
                                            <Typography variant="body1">{line.name}</Typography>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Select Overtime Period */}
                        <Grid item xs={12}>
                            <Typography variant="body1" gutterBottom>
                                Select Overtime Period
                            </Typography>
                            <Box className="calendar-container">
                                <TextField
                                    id="startDate"
                                    type="date"
                                    label="Start Date"
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    value={selectedPeriod[0] ? selectedPeriod[0].toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const newStart = e.target.value ? new Date(e.target.value) : null;
                                        setSelectedPeriod([newStart, selectedPeriod[1]]);
                                    }}
                                    className="date-input"
                                />
                                <Typography variant="body1" className="date-separator">
                                    to
                                </Typography>
                                <TextField
                                    id="endDate"
                                    type="date"
                                    label="End Date"
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    value={selectedPeriod[1] ? selectedPeriod[1].toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const newEnd = e.target.value ? new Date(e.target.value) : null;
                                        setSelectedPeriod([selectedPeriod[0], newEnd]);
                                    }}
                                    className="date-input"
                                />
                            </Box>
                        </Grid>

                        {/* Submit Button */}
                        <Grid item xs={12} className="submit-button-container">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleScheduleOvertime}
                                disabled={isSubmitting}
                                size="large"
                                startIcon={isSubmitting ? <CircularProgress size={20}/> : null}
                                className="submit-button"
                            >
                                {isSubmitting ? 'Scheduling...' : 'Schedule Overtime'}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>

            {/* Time Table Details Dialog */}
            <Dialog
                open={!!viewTimeTable}
                onClose={() => setViewTimeTable(null)}
                maxWidth="sm"
                fullWidth
                className="time-table-dialog"
            >
                <DialogTitle>Time Table Details</DialogTitle>
                <DialogContent dividers className="time-table-details">
                    {viewTimeTable && (
                        <>
                            <Typography variant="h6">{viewTimeTable.name}</Typography>
                            <Typography variant="body1" gutterBottom>
                                {viewTimeTable.description}
                            </Typography>
                            <Typography variant="subtitle1">Time Slots:</Typography>
                            <table className="time-slots-table">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Type</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                </tr>
                                </thead>
                                <tbody>
                                {viewTimeTable.slots.map((slot, index) => (
                                    <tr key={slot.id}>
                                        <td>{index + 1}</td>
                                        <td>{slot.type === 'work' ? 'Work' : 'Break'}</td>
                                        <td>{slot.startTime}</td>
                                        <td>{slot.endTime}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewTimeTable(null)} color="secondary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{width: '100%'}}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Grid>
    );
}
    export default ScheduleOvertime;
