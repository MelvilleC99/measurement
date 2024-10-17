import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import './ProductionLines.css';

interface ProductionLine {
    id: string;
    name: string;
    description: string;
    assignedTimeTable?: string;
    fromDate?: string;
    toDate?: string;
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
    const [assignedTimeTable, setAssignedTimeTable] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch existing production lines from Firebase
    const fetchProductionLines = async () => {
        const linesCollection = collection(db, 'productionLines');
        const linesSnapshot = await getDocs(linesCollection);
        const linesList = linesSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        } as ProductionLine));
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
            setAssignedTimeTable(line.assignedTimeTable || '');
            setFromDate(line.fromDate || '');
            setToDate(line.toDate || '');
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
        setAssignedTimeTable('');
        setFromDate('');
        setToDate('');
        setSelectedLineId(null);
    };

    // Add or update production line in Firebase
    const saveProductionLine = async () => {
        if (!lineName || !lineDescription || !assignedTimeTable || !fromDate || !toDate) {
            alert('Please provide all required fields.');
            return;
        }

        const lineData = {
            name: lineName,
            description: lineDescription,
            assignedTimeTable,
            fromDate,
            toDate,
        };

        if (isEditMode && selectedLineId) {
            const lineDoc = doc(db, 'productionLines', selectedLineId);
            await updateDoc(lineDoc, lineData);
        } else {
            await addDoc(collection(db, 'productionLines'), lineData);
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
                            <label>
                                Assign Time Table:
                                <select
                                    value={assignedTimeTable}
                                    onChange={(e) => setAssignedTimeTable(e.target.value)}
                                >
                                    <option value="">Select a Time Table</option>
                                    {timeTables.map((tt) => (
                                        <option key={tt.id} value={tt.name}>
                                            {tt.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                From Date:
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </label>
                            <label>
                                To Date:
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </label>
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
                                <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionLines;
