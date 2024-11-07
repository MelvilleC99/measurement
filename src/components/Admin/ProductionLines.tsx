import React, { useState, useEffect } from 'react';
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
import {
    ProductionLine,
    TimeTableAssignment,
    TimeTable,
} from '../../types';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    IconButton,
    Typography,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Box,
} from '@mui/material';
import { Add, Edit, Delete, Close } from '@mui/icons-material';
import './ProductionLines.css';

const ProductionLines: React.FC = () => {
    const [lineName, setLineName] = useState('');
    const [lineDescription, setLineDescription] = useState('');
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [timeTableAssignments, setTimeTableAssignments] = useState<TimeTableAssignment[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string>('');

    // Fetch existing production lines from Firebase
    const fetchProductionLines = async () => {
        const linesCollection = collection(db, 'productionLines');
        const linesSnapshot = await getDocs(linesCollection);
        const linesList = linesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                timeTableAssignments: data.timeTableAssignments || [],
                active: data.active,
                currentStyle: data.currentStyle,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            } as ProductionLine;
        });
        setProductionLines(linesList);
    };

    // Fetch time tables from Firebase
    const fetchTimeTables = async () => {
        const timeTablesCollection = collection(db, 'timeTable');
        const timeTablesSnapshot = await getDocs(timeTablesCollection);
        const timeTablesList = timeTablesSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description,
            isOvertime: doc.data().isOvertime,
            schedules: doc.data().schedules,
        } as TimeTable));
        setTimeTables(timeTablesList);
    };

    // Fetch production lines and time tables on component mount
    useEffect(() => {
        fetchProductionLines();
        fetchTimeTables();
    }, []);

    // Open modal for adding or editing a production line
    const openModal = (line?: ProductionLine) => {
        if (line) {
            setLineName(line.name);
            setLineDescription(line.description || '');
            setTimeTableAssignments(line.timeTableAssignments || []);
            setSelectedLineId(line.id);
            setIsEditMode(true);
        } else {
            resetForm();
            setIsEditMode(false);
        }
        setIsModalOpen(true);
        setError('');
    };

    // Reset form fields
    const resetForm = () => {
        setLineName('');
        setLineDescription('');
        setTimeTableAssignments([]);
        setSelectedLineId(null);
        setError('');
    };

    // Add or update production line in Firebase
    const saveProductionLine = async () => {
        if (!lineName.trim() || !lineDescription.trim()) {
            setError('Please provide all required fields.');
            return;
        }

        if (timeTableAssignments.length === 0) {
            setError('Please add at least one time table assignment.');
            return;
        }

        // Validate all time table assignments
        for (const assignment of timeTableAssignments) {
            if (!assignment.timeTableId || !assignment.fromDate || !assignment.toDate) {
                setError('Please fill out all fields for each time table assignment.');
                return;
            }
            if (new Date(assignment.fromDate) > new Date(assignment.toDate)) {
                setError('From Date cannot be after To Date in time table assignments.');
                return;
            }
        }

        // Check for overlapping date ranges
        for (let i = 0; i < timeTableAssignments.length; i++) {
            const assignmentA = timeTableAssignments[i];
            for (let j = i + 1; j < timeTableAssignments.length; j++) {
                const assignmentB = timeTableAssignments[j];
                if (datesOverlap(assignmentA.fromDate, assignmentA.toDate, assignmentB.fromDate, assignmentB.toDate)) {
                    setError('Time table assignments cannot have overlapping date ranges.');
                    return;
                }
            }
        }

        const lineData = {
            name: lineName,
            description: lineDescription,
            timeTableAssignments: timeTableAssignments,
            updatedAt: Timestamp.now(),
            active: true,
            currentStyle: null,
            createdAt: isEditMode ? undefined : Timestamp.now(),
        };

        try {
            if (isEditMode && selectedLineId) {
                const lineDoc = doc(db, 'productionLines', selectedLineId);
                await updateDoc(lineDoc, lineData);
            } else {
                await addDoc(collection(db, 'productionLines'), lineData);
            }

            resetForm();
            setIsModalOpen(false);
            fetchProductionLines();
        } catch (err) {
            console.error('Error saving production line:', err);
            setError('Failed to save production line. Please try again.');
        }
    };

    // Delete a production line from Firebase
    const deleteProductionLine = async (lineId: string) => {
        const confirmed = window.confirm('Are you sure you want to delete this production line?');
        if (confirmed) {
            try {
                await deleteDoc(doc(db, 'productionLines', lineId));
                fetchProductionLines();
            } catch (err) {
                console.error('Error deleting production line:', err);
                setError('Failed to delete production line. Please try again.');
            }
        }
    };

    // Add a new time table assignment
    const addTimeTableAssignment = () => {
        setTimeTableAssignments([
            ...timeTableAssignments,
            {
                id: Date.now().toString(),
                timeTableId: '',
                timeTableName: '',
                fromDate: '',
                toDate: '',
            },
        ]);
    };

    // Update a time table assignment
    const updateTimeTableAssignment = (index: number, field: keyof TimeTableAssignment, value: string) => {
        const updatedAssignments = [...timeTableAssignments];
        const assignment = { ...updatedAssignments[index] };

        if (field === 'timeTableId') {
            const selectedTimeTable = timeTables.find((tt) => tt.id === value);
            assignment.timeTableId = value;
            assignment.timeTableName = selectedTimeTable ? selectedTimeTable.name : '';
        } else {
            assignment[field] = value;
        }

        updatedAssignments[index] = assignment;
        setTimeTableAssignments(updatedAssignments);
    };

    // Check for overlapping date ranges between two assignments
    const datesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
        const startADate = new Date(startA);
        const endADate = new Date(endA);
        const startBDate = new Date(startB);
        const endBDate = new Date(endB);

        return startADate <= endBDate && endADate >= startBDate;
    };

    // Remove a time table assignment
    const removeTimeTableAssignment = (index: number) => {
        const updatedAssignments = [...timeTableAssignments];
        updatedAssignments.splice(index, 1);
        setTimeTableAssignments(updatedAssignments);
    };

    return (
        <div className="admin-dashboard-content">
            <div className="production-lines-container">
                <div className="header-banner">
                    <Typography variant="h4">Production Lines</Typography>
                </div>
                <div className="content-section">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => openModal()}
                    >
                        Add Production Line
                    </Button>
                    <Paper sx={{ mt: 2 }}>
                        <List>
                            {productionLines.map((line) => (
                                <React.Fragment key={line.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={line.name}
                                            secondary={line.description}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton edge="end" onClick={() => openModal(line)}>
                                                <Edit />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </div>

                {/* Modal for adding or editing production line */}
                <Dialog
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        {isEditMode ? 'Edit Production Line' : 'Add Production Line'}
                        <IconButton
                            aria-label="close"
                            onClick={() => setIsModalOpen(false)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {error && <Typography color="error">{error}</Typography>}
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Line Name"
                                    value={lineName}
                                    onChange={(e) => setLineName(e.target.value)}
                                    fullWidth
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Description"
                                    value={lineDescription}
                                    onChange={(e) => setLineDescription(e.target.value)}
                                    fullWidth
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ mt: 4 }}>
                            Time Table Assignments
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={addTimeTableAssignment}
                            sx={{ mt: 1, mb: 2 }}
                        >
                            Add Time Table Assignment
                        </Button>

                        {timeTableAssignments.map((assignment, index) => (
                            <Paper key={assignment.id} sx={{ p: 2, mb: 2 }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={4}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Time Table</InputLabel>
                                            <Select
                                                value={assignment.timeTableId}
                                                onChange={(e) =>
                                                    updateTimeTableAssignment(index, 'timeTableId', e.target.value)
                                                }
                                                label="Time Table"
                                            >
                                                <MenuItem value="">
                                                    <em>Select a Time Table</em>
                                                </MenuItem>
                                                {timeTables.map((tt) => (
                                                    <MenuItem key={tt.id} value={tt.id}>
                                                        {tt.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            label="From Date"
                                            type="date"
                                            value={assignment.fromDate}
                                            onChange={(e) =>
                                                updateTimeTableAssignment(index, 'fromDate', e.target.value)
                                            }
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            label="To Date"
                                            type="date"
                                            value={assignment.toDate}
                                            onChange={(e) =>
                                                updateTimeTableAssignment(index, 'toDate', e.target.value)
                                            }
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <IconButton
                                            color="error"
                                            onClick={() => removeTimeTableAssignment(index)}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}

                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            {isEditMode && selectedLineId && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => deleteProductionLine(selectedLineId)}
                                    startIcon={<Delete />}
                                    sx={{ mr: 2 }}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button variant="contained" color="primary" onClick={saveProductionLine}>
                                {isEditMode ? 'Save Changes' : 'Save'}
                            </Button>
                        </Box>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default ProductionLines;
