// src/components/Admin/TimeTables.tsx

import React, { useState, useEffect } from 'react';
import './TimeTables.css';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId?: string;
}

interface TimeTable {
    id: string;
    name: string;
    description: string;
    isOvertime: boolean; // New Field
    slots: TimeSlot[];
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
    const [isOvertime, setIsOvertime] = useState<boolean>(false); // New State
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ id: '1', startTime: '', endTime: '', breakId: '' }]);
    const [selectedTimeTable, setSelectedTimeTable] = useState<TimeTable | null>(null);
    const [selectedBreak, setSelectedBreak] = useState<Break | null>(null);
    const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [breakName, setBreakName] = useState('');
    const [breakDescription, setBreakDescription] = useState('');
    const [breakDuration, setBreakDuration] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
            const breaksSnapshot = await getDocs(collection(db, 'breaks'));
            const timeTablesData = timeTablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TimeTable[];
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

    const handleSaveTimeTable = async () => {
        if (!timeTableName.trim()) {
            setError('Time Table Name is required.');
            return;
        }

        if (!timeTableDescription.trim()) {
            setError('Time Table Description is required.');
            return;
        }

        // Validate time slots
        for (let slot of timeSlots) {
            if (!slot.startTime || !slot.endTime) {
                setError('All time slots must have start and end times.');
                return;
            }
            if (slot.startTime >= slot.endTime) {
                setError('Start time must be before end time in all slots.');
                return;
            }
        }

        const newTimeTable = {
            name: timeTableName,
            description: timeTableDescription,
            isOvertime, // Include the new field
            slots: timeSlots,
        };

        try {
            if (selectedTimeTable) {
                const timeTableDoc = doc(db, 'timeTables', selectedTimeTable.id);
                await updateDoc(timeTableDoc, newTimeTable);
            } else {
                await addDoc(collection(db, 'timeTables'), newTimeTable);
            }

            fetchData();
            setIsTimeTableModalOpen(false);
            // Reset form fields
            setTimeTableName('');
            setTimeTableDescription('');
            setIsOvertime(false);
            setTimeSlots([{ id: '1', startTime: '', endTime: '', breakId: '' }]);
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
                    await deleteDoc(doc(db, 'timeTables', selectedTimeTable.id));
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

    const handleSaveBreak = async () => {
        if (!breakName.trim()) {
            setError('Break Name is required.');
            return;
        }

        if (!breakDescription.trim()) {
            setError('Break Description is required.');
            return;
        }

        if (breakDuration <= 0) {
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
            setBreakDuration(0);
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

    const handleAddSlot = () => {
        setTimeSlots([...timeSlots, { id: (timeSlots.length + 1).toString(), startTime: '', endTime: '', breakId: '' }]);
    };

    const handleSlotChange = (index: number, field: keyof TimeSlot, value: string) => {
        const updatedSlots = [...timeSlots];
        updatedSlots[index][field] = value;
        setTimeSlots(updatedSlots);
    };

    const openTimeTableModal = (timeTable?: TimeTable) => {
        if (timeTable) {
            setSelectedTimeTable(timeTable);
            setTimeTableName(timeTable.name);
            setTimeTableDescription(timeTable.description);
            setIsOvertime(timeTable.isOvertime); // Set the overtime status
            setTimeSlots(timeTable.slots);
        } else {
            setSelectedTimeTable(null);
            setTimeTableName('');
            setTimeTableDescription('');
            setIsOvertime(false); // Reset the overtime status
            setTimeSlots([{ id: '1', startTime: '', endTime: '', breakId: '' }]);
        }
        setIsTimeTableModalOpen(true);
        setError('');
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
            setBreakDuration(0);
        }
        setIsBreakModalOpen(true);
        setError('');
    };

    return (
        <div className="timetables-container">
            <div className="toolbar">
                <h2>Actions</h2>
                <button onClick={() => openTimeTableModal()}>Create Time Table</button>
                <button onClick={() => openBreakModal()}>Create Break</button>
            </div>
            <div className="content-area">
                <div className="bounded-box">
                    <h2>Existing Time Tables</h2>
                    {isLoading ? (
                        <p>Loading time tables...</p>
                    ) : (
                        timeTables.map((tt) => (
                            <div key={tt.id} className="time-table-item">
                                <div>
                                    <strong>{tt.name}</strong> - {tt.description}
                                    {tt.isOvertime && <span className="overtime-label">Overtime</span>}
                                </div>
                                <button onClick={() => openTimeTableModal(tt)}>View/Edit</button>
                            </div>
                        ))
                    )}
                    {timeTables.length === 0 && <p>No time tables available.</p>}
                </div>

                <div className="bounded-box">
                    <h2>Existing Breaks</h2>
                    {isLoading ? (
                        <p>Loading breaks...</p>
                    ) : (
                        breaks.map((br) => (
                            <div key={br.id} className="break-item">
                                <div>
                                    <strong>{br.name}</strong> - {br.description} ({br.duration} mins)
                                </div>
                                <button onClick={() => openBreakModal(br)}>View/Edit</button>
                            </div>
                        ))
                    )}
                    {breaks.length === 0 && <p>No breaks available.</p>}
                </div>
            </div>

            {/* Time Table Modal */}
            {isTimeTableModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2>{selectedTimeTable ? `Edit Time Table: ${selectedTimeTable.name}` : 'Create Time Table'}</h2>
                        {error && <p className="error-message">{error}</p>}
                        <label>
                            Time Table Name:
                            <input
                                type="text"
                                value={timeTableName}
                                onChange={(e) => setTimeTableName(e.target.value)}
                            />
                        </label>
                        <label>
                            Description:
                            <input
                                type="text"
                                value={timeTableDescription}
                                onChange={(e) => setTimeTableDescription(e.target.value)}
                            />
                        </label>
                        <label>
                            Is Overtime Time Table:
                            <input
                                type="checkbox"
                                checked={isOvertime}
                                onChange={(e) => setIsOvertime(e.target.checked)}
                            />
                        </label>
                        <table className="time-slots-table">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Break</th>
                            </tr>
                            </thead>
                            <tbody>
                            {timeSlots.map((slot, index) => (
                                <tr key={slot.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) =>
                                                handleSlotChange(index, 'startTime', e.target.value)
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) =>
                                                handleSlotChange(index, 'endTime', e.target.value)
                                            }
                                        />
                                    </td>
                                    <td>
                                        <select
                                            value={slot.breakId}
                                            onChange={(e) =>
                                                handleSlotChange(index, 'breakId', e.target.value)
                                            }
                                        >
                                            <option value="">None</option>
                                            {breaks.map((br) => (
                                                <option key={br.id} value={br.id}>
                                                    {br.name} ({br.duration} mins)
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <div className="modal-buttons">
                            <button onClick={handleAddSlot}>Add Row</button>
                            <button onClick={handleSaveTimeTable}>Save</button>
                            {selectedTimeTable && <button onClick={handleDeleteTimeTable}>Delete</button>}
                            <button onClick={() => setIsTimeTableModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Break Modal */}
            {isBreakModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2>{selectedBreak ? `Edit Break: ${selectedBreak.name}` : 'Create Break'}</h2>
                        {error && <p className="error-message">{error}</p>}
                        <label>
                            Break Name:
                            <input
                                type="text"
                                value={breakName}
                                onChange={(e) => setBreakName(e.target.value)}
                            />
                        </label>
                        <label>
                            Description:
                            <input
                                type="text"
                                value={breakDescription}
                                onChange={(e) => setBreakDescription(e.target.value)}
                            />
                        </label>
                        <label>
                            Duration (minutes):
                            <input
                                type="number"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                                min="1"
                            />
                        </label>
                        <div className="modal-buttons">
                            <button onClick={handleSaveBreak}>Save</button>
                            {selectedBreak && <button onClick={handleDeleteBreak}>Delete</button>}
                            <button onClick={() => setIsBreakModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};

export default TimeTables;
