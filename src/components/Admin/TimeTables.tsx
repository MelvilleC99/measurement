import React, { useState } from 'react';
import './TimeTables.css';

interface Break {
    id: number;
    name: string;
    description: string;
    duration: number; // in minutes
}

interface TimeSlot {
    id: number;
    startTime: string;
    endTime: string;
    breakId?: number; // Optional break associated with this slot
}

interface TimeTable {
    id: number;
    name: string;
    slots: TimeSlot[];
}

const defaultTimeSlots: TimeSlot[] = [
    { id: 1, startTime: '08:00', endTime: '09:00' },
    { id: 2, startTime: '09:00', endTime: '10:00' },
    { id: 3, startTime: '10:00', endTime: '10:20', breakId: 1 }, // Tea break
    { id: 4, startTime: '10:20', endTime: '12:00' },
    { id: 5, startTime: '12:00', endTime: '12:40', breakId: 2 }, // Lunch break
    { id: 6, startTime: '12:40', endTime: '14:00' },
    { id: 7, startTime: '14:00', endTime: '15:00' },
    { id: 8, startTime: '15:00', endTime: '16:00' },
];

const defaultTimeTable: TimeTable = {
    id: 0,
    name: 'Default Time Table',
    slots: defaultTimeSlots,
};

const TimeTables: React.FC = () => {
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(defaultTimeSlots);
    const [breaks, setBreaks] = useState<Break[]>([
        { id: 1, name: 'Tea Break', description: '20 min tea break', duration: 20 },
        { id: 2, name: 'Lunch Break', description: '40 min lunch break', duration: 40 },
    ]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([defaultTimeTable]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState<boolean>(false);
    const [timeTableName, setTimeTableName] = useState<string>('');
    const [viewingTimeTable, setViewingTimeTable] = useState<TimeTable | null>(null);
    const [breakName, setBreakName] = useState<string>('');
    const [breakDescription, setBreakDescription] = useState<string>('');
    const [breakDuration, setBreakDuration] = useState<number>(0);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setTimeTableName('');
        setTimeSlots(defaultTimeSlots);
        setViewingTimeTable(null);
    };

    const openBreakModal = () => setIsBreakModalOpen(true);
    const closeBreakModal = () => {
        setIsBreakModalOpen(false);
        setBreakName('');
        setBreakDescription('');
        setBreakDuration(0);
    };

    const handleBreakSave = () => {
        if (!breakName || breakDuration <= 0) {
            alert('Please provide valid break details.');
            return;
        }

        const newBreak: Break = {
            id: breaks.length + 1,
            name: breakName,
            description: breakDescription,
            duration: breakDuration,
        };

        setBreaks([...breaks, newBreak]);
        closeBreakModal();
    };

    const handleTimeSlotChange = (
        slotId: number,
        field: keyof TimeSlot,
        value: string
    ) => {
        const updatedSlots = timeSlots.map((slot) =>
            slot.id === slotId ? { ...slot, [field]: value } : slot
        );
        setTimeSlots(updatedSlots);
    };

    const handleSaveTimeTable = () => {
        if (!timeTableName || timeSlots.some((slot) => !slot.startTime || !slot.endTime)) {
            alert('Please fill in all time slots and provide a name.');
            return;
        }

        const newTimeTable: TimeTable = {
            id: timeTables.length + 1,
            name: timeTableName,
            slots: timeSlots,
        };

        setTimeTables([...timeTables, newTimeTable]);
        closeModal();
    };

    const addTimeSlot = () => {
        const newId = timeSlots.length + 1;
        setTimeSlots([...timeSlots, { id: newId, startTime: '', endTime: '' }]);
    };

    const removeTimeSlot = (slotId: number) => {
        if (timeSlots.length > 1) {
            setTimeSlots(timeSlots.filter((slot) => slot.id !== slotId));
        }
    };

    const viewTimeTable = (timeTable: TimeTable) => {
        setViewingTimeTable(timeTable);
        setTimeSlots(timeTable.slots);
        setTimeTableName(timeTable.name);
        setIsModalOpen(true);
    };

    return (
        <div className="timetables-container">
            <div className="timetables-card">
                <div className="card-header">
                    <h1 className="timetables-title">Time Tables</h1>
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <div className="button-group">
                        <button className="create-button" onClick={openModal}>Create Time Table</button>
                        <button className="create-button" onClick={openBreakModal}>Create Break</button>
                    </div>

                    <div className="bounded-box">
                        <h2>Existing Breaks</h2>
                        {breaks.map((br) => (
                            <div key={br.id} className="break-item">
                                <strong>{br.name}</strong>: {br.description} ({br.duration} mins)
                            </div>
                        ))}
                    </div>

                    <div className="bounded-box">
                        <h2>Existing Time Tables</h2>
                        {timeTables.map((tt) => (
                            <div key={tt.id} className="time-table-item" onClick={() => viewTimeTable(tt)}>
                                <strong>{tt.name}</strong> - {tt.slots.length} slots
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Time Table Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2>{viewingTimeTable ? `Edit Time Table: ${viewingTimeTable.name}` : 'Create Time Table'}</h2>
                        <label>
                            Time Table Name:
                            <input
                                type="text"
                                value={timeTableName}
                                onChange={(e) => setTimeTableName(e.target.value)}
                            />
                        </label>
                        <table className="time-slots-table">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Break</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {timeSlots.map((slot) => (
                                <tr key={slot.id}>
                                    <td>{slot.id}</td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) =>
                                                handleTimeSlotChange(slot.id, 'startTime', e.target.value)
                                            }
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) =>
                                                handleTimeSlotChange(slot.id, 'endTime', e.target.value)
                                            }
                                        />
                                    </td>
                                    <td>
                                        <select
                                            value={slot.breakId || ''}
                                            onChange={(e) =>
                                                handleTimeSlotChange(slot.id, 'breakId', e.target.value)
                                            }
                                            className="dropdown-full"
                                        >
                                            <option value="">None</option>
                                            {breaks.map((br) => (
                                                <option key={br.id} value={br.id}>
                                                    {br.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => removeTimeSlot(slot.id)}
                                            disabled={timeSlots.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <div className="modal-buttons">
                            <button onClick={addTimeSlot}>Add Row</button>
                            <button onClick={handleSaveTimeTable}>
                                {viewingTimeTable ? 'Update Time Table' : 'Save Time Table'}
                            </button>
                            <button onClick={closeModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Break Modal */}
            {isBreakModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-wide">
                        <h2>Create Break</h2>
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
                            <button onClick={handleBreakSave}>Save Break</button>
                            <button onClick={closeBreakModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTables;