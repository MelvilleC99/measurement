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
import './ProductionLines.css';

interface TimeTableAssignment {
    id: string; // Unique ID for the assignment
    timeTableId: string;
    timeTableName: string; // For easier display
    fromDate: string;
    toDate: string;
}

interface ProductionLine {
    id: string;
    name: string;
    description: string;
    timeTableAssignments: TimeTableAssignment[];
}

interface TimeTable {
    id: string;
    name: string;
}

const ProductionLines: React.FC = () => {
    const [lineName, setLineName] = useState('');
    const [lineDescription, setLineDescription] = useState('');
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [timeTableAssignments, setTimeTableAssignments] = useState<TimeTableAssignment[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
            } as ProductionLine;
        });
        setProductionLines(linesList);
    };

    // Fetch time tables from Firebase
    const fetchTimeTables = async () => {
        const timeTablesCollection = collection(db, 'timeTables');
        const timeTablesSnapshot = await getDocs(timeTablesCollection);
        const timeTablesList = timeTablesSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
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
            setLineDescription(line.description);
            setTimeTableAssignments(line.timeTableAssignments || []);
            setSelectedLineId(line.id);
            setIsEditMode(true);
        } else {
            resetForm();
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    // Reset form fields
    const resetForm = () => {
        setLineName('');
        setLineDescription('');
        setTimeTableAssignments([]);
        setSelectedLineId(null);
    };

    // Add or update production line in Firebase
    const saveProductionLine = async () => {
        if (!lineName || !lineDescription) {
            alert('Please provide all required fields.');
            return;
        }

        const lineData = {
            name: lineName,
            description: lineDescription,
            timeTableAssignments: timeTableAssignments,
        };

        if (isEditMode && selectedLineId) {
            const lineDoc = doc(db, 'productionLines', selectedLineId);
            await updateDoc(lineDoc, lineData);
        } else {
            await addDoc(collection(db, 'productionLines'), {
                ...lineData,
                createdAt: Timestamp.now(),
            });
        }

        resetForm();
        setIsModalOpen(false);
        fetchProductionLines();
    };

    // Delete a production line from Firebase
    const deleteProductionLine = async (lineId: string) => {
        const confirmed = window.confirm('Are you sure you want to delete this production line?');
        if (confirmed) {
            await deleteDoc(doc(db, 'productionLines', lineId));
            fetchProductionLines();
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
    const updateTimeTableAssignment = (index: number, field: string, value: string) => {
        const updatedAssignments = [...timeTableAssignments];
        const assignment = updatedAssignments[index];

        if (field === 'timeTableId') {
            const selectedTimeTable = timeTables.find((tt) => tt.id === value);
            assignment.timeTableId = value;
            assignment.timeTableName = selectedTimeTable ? selectedTimeTable.name : '';
        } else {
            (assignment as any)[field] = value;
        }

        // Validate for overlapping date ranges
        if (assignment.fromDate && assignment.toDate) {
            const overlap = checkForOverlaps(assignment.id, assignment.fromDate, assignment.toDate);
            if (overlap) {
                alert('Time table assignments cannot have overlapping date ranges.');
                return;
            }
        }

        setTimeTableAssignments(updatedAssignments);
    };

    // Check for overlapping date ranges
    const checkForOverlaps = (currentId: string, fromDate: string, toDate: string): boolean => {
        const newFrom = new Date(fromDate);
        const newTo = new Date(toDate);

        for (const assignment of timeTableAssignments) {
            if (assignment.id === currentId) continue;

            const existingFrom = new Date(assignment.fromDate);
            const existingTo = new Date(assignment.toDate);

            if (
                (newFrom >= existingFrom && newFrom <= existingTo) ||
                (newTo >= existingFrom && newTo <= existingTo) ||
                (existingFrom >= newFrom && existingFrom <= newTo)
            ) {
                return true;
            }
        }
        return false;
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
                    <h1 className="title">Production Lines</h1>
                </div>
                <div className="content-section">
                    <div className="add-line-section">
                        <button className="add-line-button" onClick={() => openModal()}>
                            Add Production Line
                        </button>
                    </div>
                    <div className="production-lines-list">
                        <h2>Existing Lines</h2>
                        <ul>
                            {productionLines.map((line) => (
                                <li key={line.id} className="line-item">
                                    <span>{line.name}</span>
                                    <button className="edit-button" onClick={() => openModal(line)}>Edit</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Modal for adding or editing production line */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-wide">
                            <h2>{isEditMode ? 'Edit Production Line' : 'Add Production Line'}</h2>
                            <label>
                                Line Name:
                                <input
                                    type="text"
                                    value={lineName}
                                    onChange={(e) => setLineName(e.target.value)}
                                />
                            </label>
                            <label>
                                Description:
                                <input
                                    type="text"
                                    value={lineDescription}
                                    onChange={(e) => setLineDescription(e.target.value)}
                                />
                            </label>

                            <h3>Time Table Assignments</h3>
                            <button onClick={addTimeTableAssignment}>Add Time Table Assignment</button>
                            {timeTableAssignments.map((assignment, index) => (
                                <div key={assignment.id} className="assignment-item">
                                    <label>
                                        Time Table:
                                        <select
                                            value={assignment.timeTableId}
                                            onChange={(e) =>
                                                updateTimeTableAssignment(index, 'timeTableId', e.target.value)
                                            }
                                        >
                                            <option value="">Select a Time Table</option>
                                            {timeTables.map((tt) => (
                                                <option key={tt.id} value={tt.id}>
                                                    {tt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        From Date:
                                        <input
                                            type="date"
                                            value={assignment.fromDate}
                                            onChange={(e) =>
                                                updateTimeTableAssignment(index, 'fromDate', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        To Date:
                                        <input
                                            type="date"
                                            value={assignment.toDate}
                                            onChange={(e) =>
                                                updateTimeTableAssignment(index, 'toDate', e.target.value)
                                            }
                                        />
                                    </label>
                                    <button onClick={() => removeTimeTableAssignment(index)}>Remove</button>
                                </div>
                            ))}

                            <div className="modal-buttons">
                                <button className="save-btn" onClick={saveProductionLine}>
                                    {isEditMode ? 'Save Changes' : 'Save'}
                                </button>
                                {isEditMode && (
                                    <button
                                        className="delete-btn"
                                        onClick={() => deleteProductionLine(selectedLineId!)}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionLines;
