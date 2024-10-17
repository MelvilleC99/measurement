// src/components/ProductionBoard.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { styled } from '@mui/system';
import Rework from './Rework'; // Import the Rework component
import './productionBoard.css';

interface ProductionLine {
    id: string;
    name: string;
}

interface Supervisor {
    id: string;
    name: string;
}

interface Style {
    id: string;
    styleNumber: string;
    styleName: string;
    unitsInOrder: number;
}

interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId: string | null; // Reference to a break
}

interface TimeTable {
    id: string;
    name: string;
    slots: TimeSlot[];
}

interface Break {
    id: string;
    duration: number; // Break duration in minutes
}

const ProductionBoard: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]); // Store time tables from Firebase
    const [breaks, setBreaks] = useState<Break[]>([]); // Store breaks from Firebase
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current'); // Manual booking slot
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);
    const [styleDetails, setStyleDetails] = useState<{
        target: number;
        outputs: number[];
        balance: number;
    }>({
        target: 0,
        outputs: [],
        balance: 0,
    });
    const [isBoardLoaded, setIsBoardLoaded] = useState(false);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false); // State for rework modal
    const [currentTime, setCurrentTime] = useState(new Date());

    // Button styles using MUI's `styled`
    const Button = styled('button')`
        font-family: 'IBM Plex Sans', sans-serif;
        font-weight: 600;
        font-size: 1.2rem;
        line-height: 1.5;
        padding: 12px 24px;
        border-radius: 8px;
        transition: all 150ms ease;
        cursor: pointer;
        border: none;
        color: white;
        margin: 10px;
    `;

    const OffLineButton = styled(Button)`
        background-color: #28a745;
        &:hover {
            background-color: #218838;
        }
    `;

    const DownTimeButton = styled(Button)`
        background-color: #dc3545;
        &:hover {
            background-color: #c82333;
        }
    `;

    const ReworkButton = styled(Button)`
        background-color: #ffc107;
        &:hover {
            background-color: #e0a800;
        }
    `;

    const RejectButton = styled(Button)`
        background-color: #17a2b8;
        &:hover {
            background-color: #138496;
        }
    `;

    const EndShiftButton = styled(Button)`
        background-color: #6c757d;
        &:hover {
            background-color: #5a6268;
        }
        position: absolute;
        top: 20px;
        right: 20px;
    `;

    const fetchData = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            const supervisorsSnapshot = await getDocs(collection(db, 'supportFunctions'));
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables')); // Fetch time tables from Firebase
            const breaksSnapshot = await getDocs(collection(db, 'breaks')); // Fetch breaks from Firebase

            setProductionLines(
                linesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProductionLine))
            );
            setSupervisors(
                supervisorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Supervisor))
            );
            setStyles(stylesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Style)));

            // Fetch and set the time tables, including slots and breaks
            const fetchedTimeTables = timeTablesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    slots: data.slots
                        .filter(
                            (slot: any) =>
                                slot.startTime && slot.endTime // Ensure slots have valid start and end times
                        )
                        .map((slot: any) => ({
                            id: slot.id,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            breakId: slot.breakId || null, // Reference to a break
                        })),
                };
            }) as TimeTable[];

            setTimeTables(fetchedTimeTables);

            // Fetch and set the breaks
            const fetchedBreaks = breaksSnapshot.docs.map((doc) => ({
                id: doc.id,
                duration: doc.data().duration,
            })) as Break[];

            setBreaks(fetchedBreaks);
        } catch (error) {
            console.error('Error fetching data from Firestore:', error);
            alert('Failed to load data. Please try again.');
        }
    };

    useEffect(() => {
        fetchData();

        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    const handleLoadBoard = () => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            alert('Please select a line, supervisor, and style');
            return;
        }

        // Assign a specific time table based on the selected line
        const selectedTimeTable =
            timeTables.find((tt) => tt.name === selectedLine) || timeTables[0] || null;

        if (!selectedTimeTable) {
            alert('No Time Table found for the selected line.');
            return;
        }

        setAssignedTimeTable(selectedTimeTable);
        setStyleDetails({
            target: 0,
            outputs: Array(selectedTimeTable.slots.length).fill(0),
            balance: selectedStyle.unitsInOrder, // Set balance based on selected style's units
        });
        setIsBoardLoaded(true);
        setIsStyleModalOpen(true); // Open style modal after loading the board
    };

    const handleConfirmStyle = (target: number) => {
        setStyleDetails((prev) => ({ ...prev, target }));
        setIsStyleModalOpen(false);
    };

    const handleEndShift = () => {
        const confirmed = window.confirm('Are you sure you want to end the shift?');
        if (confirmed) {
            setIsBoardLoaded(false); // Reset the board and return to selection screen
            setAssignedTimeTable(null);
            setStyleDetails({
                target: 0,
                outputs: [],
                balance: 0,
            });
            setManualSlot('current');
        }
    };

    const handleAddOutput = () => {
        let currentSlotIndex;
        if (manualSlot === 'current') {
            const currentHour = currentTime.getHours();
            currentSlotIndex = assignedTimeTable?.slots.findIndex((slot) => {
                const slotStart = parseInt(slot.startTime.split(':')[0], 10);
                const slotEnd = parseInt(slot.endTime.split(':')[0], 10);
                return currentHour >= slotStart && currentHour < slotEnd;
            });
        } else {
            currentSlotIndex = parseInt(manualSlot, 10) - 1;
        }

        if (
            currentSlotIndex !== undefined &&
            currentSlotIndex >= 0 &&
            currentSlotIndex < styleDetails.outputs.length
        ) {
            const updatedOutputs = [...styleDetails.outputs];
            updatedOutputs[currentSlotIndex] += 1; // Add 1 unit to the current hour or selected hour
            const newBalance = styleDetails.balance - 1; // Reduce balance
            setStyleDetails((prev) => ({ ...prev, outputs: updatedOutputs, balance: newBalance }));
        }
    };

    const handleReworkSubmit = (reason: string) => {
        console.log('Rework reason:', reason);
        // Placeholder: Implement logic to handle "Book back to line"
        alert(`Rework submitted for reason: ${reason}`);
    };

    const calculateEfficiency = (output: number, target: number) => {
        return target ? ((output / target) * 100).toFixed(2) + '%' : 'N/A';
    };

    const calculateCumulativeEfficiency = (hour: number) => {
        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= hour; i++) {
            const slot = assignedTimeTable?.slots[i];
            if (!slot) continue;

            const breakDuration = slot.breakId
                ? breaks.find((b) => b.id === slot.breakId)?.duration || 0
                : 0;
            const adjustedTarget = (styleDetails.target / 60) * (60 - breakDuration);
            totalOutput += styleDetails.outputs[i];
            totalTarget += adjustedTarget;
        }

        return totalTarget ? ((totalOutput / totalTarget) * 100).toFixed(2) + '%' : 'N/A';
    };

    return (
        <div className="production-board-container">
            <h1>Production Board</h1>

            {/* End Shift Button */}
            {isBoardLoaded && (
                <EndShiftButton onClick={handleEndShift}>End of Shift</EndShiftButton>
            )}

            {!isBoardLoaded ? (
                <div className="inputs-container">
                    <label>
                        Select Line:
                        <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
                            <option value="">Select a Line</option>
                            {productionLines.map((line) => (
                                <option key={line.id} value={line.name}>
                                    {line.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Supervisor:
                        <select
                            value={selectedSupervisor}
                            onChange={(e) => setSelectedSupervisor(e.target.value)}
                        >
                            <option value="">Select a Supervisor</option>
                            {supervisors.map((sup) => (
                                <option key={sup.id} value={sup.name}>
                                    {sup.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Select Style:
                        <select
                            value={selectedStyle?.styleNumber || ''}
                            onChange={(e) => {
                                const selected = styles.find((style) => style.styleNumber === e.target.value);
                                setSelectedStyle(selected || null);
                            }}
                        >
                            <option value="">Select a Style</option>
                            {styles.map((style) => (
                                <option key={style.id} value={style.styleNumber}>
                                    {style.styleNumber} - {style.styleName}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button className="load-button" onClick={handleLoadBoard}>Load Production Board</button>
                </div>
            ) : (
                <div className="board-display">
                    {/* Heading Section */}
                    <div className="heading-section">
                        <div className="info-section">
                            <p><strong>Production Line:</strong> {selectedLine}</p>
                            <p><strong>Supervisor:</strong> {selectedSupervisor}</p>
                            <p><strong>Style:</strong> {selectedStyle?.styleNumber}</p>
                        </div>
                        <div className="clock-date-section">
                            <div className="clock-display">
                                <span className="clock">{currentTime.toLocaleTimeString()}</span>
                            </div>
                            <div className="date-display">
                                <span className="date">{currentTime.toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Style Information */}
                    {styleDetails && selectedStyle && (
                        <div className="style-info">
                            <h3>Style: {selectedStyle.styleNumber}</h3>
                            <p><strong>Units in Order:</strong> {selectedStyle.unitsInOrder}</p>
                            <p><strong>Remaining Balance:</strong> {styleDetails.balance}</p>
                        </div>
                    )}

                    {/* Time Slot Selection */}
                    <div className="slot-selection">
                        <label>
                            Select Time Slot:
                            <select value={manualSlot} onChange={(e) => setManualSlot(e.target.value)}>
                                <option value="current">Current (Real-time)</option>
                                {assignedTimeTable?.slots.map((slot, index) => (
                                    <option key={slot.id} value={(index + 1).toString()}>
                                        Hour {index + 1} ({slot.startTime} - {slot.endTime})
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Time Table */}
                    {assignedTimeTable && (
                        <table className="timetable">
                            <thead>
                            <tr>
                                <th>Hour</th>
                                <th>Time Slot</th>
                                <th>Target</th>
                                <th>Output</th>
                                <th>Efficiency</th>
                                <th>Cumulative Efficiency</th>
                            </tr>
                            </thead>
                            <tbody>
                            {assignedTimeTable.slots.map((slot, index) => {
                                const breakDuration = slot.breakId
                                    ? breaks.find((b) => b.id === slot.breakId)?.duration || 0
                                    : 0;
                                const adjustedTarget = (styleDetails.target / 60) * (60 - breakDuration);
                                const output = styleDetails.outputs[index];
                                return (
                                    <tr key={slot.id}>
                                        <td>Hour {index + 1}</td>
                                        <td>
                                            {slot.startTime} - {slot.endTime}
                                            {breakDuration > 0 && (
                                                <span className="break-indicator"> (Break: {breakDuration} mins)</span>
                                            )}
                                        </td>
                                        <td>{adjustedTarget.toFixed(2)}</td>
                                        <td>{output}</td>
                                        <td>{calculateEfficiency(output, adjustedTarget)}</td>
                                        <td>{calculateCumulativeEfficiency(index)}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}

                    {/* Buttons */}
                    <div className="button-container">
                        <OffLineButton onClick={handleAddOutput}>Off Line</OffLineButton>
                        <DownTimeButton>Down Time</DownTimeButton>
                        <ReworkButton onClick={() => setIsReworkModalOpen(true)}>Rework</ReworkButton>
                        <RejectButton>Reject</RejectButton>
                    </div>

                    {/* Rework Modal */}
                    {isReworkModalOpen && (
                        <Rework
                            onClose={() => setIsReworkModalOpen(false)}
                            onSubmit={handleReworkSubmit}
                        />
                    )}
                </div>
            )}

            {/* Modal for Confirming Style and Target */}
            {isStyleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Confirm Style & Target per Hour</h2>
                        <label>
                            Style:
                            <input
                                type="text"
                                value={selectedStyle?.styleNumber || ''}
                                readOnly
                            />
                        </label>
                        <label>
                            Target per Hour:
                            <input
                                type="number"
                                value={styleDetails.target}
                                onChange={(e) =>
                                    setStyleDetails((prev) => ({ ...prev, target: Number(e.target.value) }))
                                }
                            />
                        </label>
                        <button className="confirm-button" onClick={() => handleConfirmStyle(styleDetails.target)}>Confirm</button>
                        <button className="cancel-button" onClick={() => setIsStyleModalOpen(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionBoard;
