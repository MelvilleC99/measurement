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
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ id: '1', startTime: '', endTime: '', breakId: '' }]);
    const [selectedTimeTable, setSelectedTimeTable] = useState<TimeTable | null>(null);
    const [selectedBreak, setSelectedBreak] = useState<Break | null>(null);
    const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [breakName, setBreakName] = useState('');
    const [breakDescription, setBreakDescription] = useState('');
    const [breakDuration, setBreakDuration] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
        const breaksSnapshot = await getDocs(collection(db, 'breaks'));
        const timeTablesData = timeTablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TimeTable[];
        const breaksData = breaksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Break[];
        setTimeTables(timeTablesData);
        setBreaks(breaksData);
    };

    const handleSaveTimeTable = async () => {
        const newTimeTable = {
            name: timeTableName,
            description: timeTableDescription,
            slots: timeSlots,
        };

        if (selectedTimeTable) {
            const timeTableDoc = doc(db, 'timeTables', selectedTimeTable.id);
            await updateDoc(timeTableDoc, newTimeTable);
        } else {
            await addDoc(collection(db, 'timeTables'), newTimeTable);
        }

        fetchData();
        setIsTimeTableModalOpen(false);
    };

    const handleDeleteTimeTable = async () => {
        if (selectedTimeTable) {
            await deleteDoc(doc(db, 'timeTables', selectedTimeTable.id));
            fetchData();
            setIsTimeTableModalOpen(false);
        }
    };

    const handleSaveBreak = async () => {
        const newBreak = {
            name: breakName,
            description: breakDescription,
            duration: breakDuration,
        };

        if (selectedBreak) {
            const breakDoc = doc(db, 'breaks', selectedBreak.id);
            await updateDoc(breakDoc, newBreak);
        } else {
            await addDoc(collection(db, 'breaks'), newBreak);
        }

        fetchData();
        setIsBreakModalOpen(false);
    };

    const handleDeleteBreak = async () => {
        if (selectedBreak) {
            await deleteDoc(doc(db, 'breaks', selectedBreak.id));
            fetchData();
            setIsBreakModalOpen(false);
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
            setTimeSlots(timeTable.slots);
        } else {
            setSelectedTimeTable(null);
            setTimeTableName('');
            setTimeTableDescription('');
            setTimeSlots([{ id: '1', startTime: '', endTime: '', breakId: '' }]);
        }
        setIsTimeTableModalOpen(true);
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
                    {timeTables.map((tt) => (
                        <div key={tt.id} className="time-table-item">
                            <strong>{tt.name}</strong> - {tt.description}
                            <button onClick={() => openTimeTableModal(tt)}>View/Edit</button>
                        </div>
                    ))}
                </div>

                <div className="bounded-box">
                    <h2>Existing Breaks</h2>
                    {breaks.map((br) => (
                        <div key={br.id} className="break-item">
                            <strong>{br.name}</strong> - {br.description}
                            <button onClick={() => openBreakModal(br)}>View/Edit</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Time Table Modal */}
            {isTimeTableModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2>{selectedTimeTable ? `Edit Time Table: ${selectedTimeTable.name}` : 'Create Time Table'}</h2>
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
                            <button onClick={handleDeleteTimeTable}>Delete</button>
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
                            />
                        </label>
                        <div className="modal-buttons">
                            <button onClick={handleSaveBreak}>Save</button>
                            <button onClick={handleDeleteBreak}>Delete</button>
                            <button onClick={() => setIsBreakModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTables;