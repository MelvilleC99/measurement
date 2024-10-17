import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase'; // Ensure this path is correct
import Rework from './Rework'; // Ensure this path is correct
import './productionBoard.css'; // Ensure this path is correct

// Define Interfaces based on Your Firestore Schema
interface ProductionLine {
    id: string;
    name: string;
    description?: string;
}

interface Supervisor {
    id: string;
    name: string;
}

interface Style {
    id: string;
    styleNumber: string;
    styleName: string;
    description: string;
    unitsInOrder: number;
    deliveryDate: string;
}

interface TimeSlot {
    id: string;
    startTime: string; // "HH:MM" format
    endTime: string;   // "HH:MM" format
    breakId: string | null;
}

interface TimeTable {
    id: string;
    name: string;
    slots: TimeSlot[];
}

interface Break {
    id: string;
    duration: number; // Duration in minutes
}

const ProductionBoard: React.FC = () => {
    // State Variables
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);

    // Selection States (Using Names)
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current'); // Manual booking slot

    // Production Board States
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
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [rejectCount, setRejectCount] = useState(0);
    const [reworkCount, setReworkCount] = useState(0);

    // Fetch data from Firestore
    const fetchData = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            const supervisorsSnapshot = await getDocs(collection(db, 'supportFunctions'));
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
            const breaksSnapshot = await getDocs(collection(db, 'breaks'));

            setProductionLines(
                linesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProductionLine))
            );
            setSupervisors(
                supervisorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Supervisor))
            );
            setStyles(stylesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Style)));

            // Fetch and set the time tables, including slots and breaks
            const fetchedTimeTables: TimeTable[] = timeTablesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    slots: (data.slots || []).map((slot: any) => ({
                        id: slot.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        breakId: slot.breakId || null,
                    })),
                };
            });

            setTimeTables(fetchedTimeTables);

            // Fetch and set the breaks
            const fetchedBreaks: Break[] = breaksSnapshot.docs.map((doc) => ({
                id: doc.id,
                duration: doc.data().duration,
            }));

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

    // Function to log production data to Firestore
    const logProductionRecord = async (unitsProduced: number, slotId: string) => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            alert('Please select a line, supervisor, and style.');
            return;
        }

        if (!assignedTimeTable) {
            alert('Time Table is not loaded.');
            return;
        }

        const selectedSlot = assignedTimeTable.slots.find((slot: TimeSlot) => slot.id === slotId);
        if (!selectedSlot) {
            alert('Selected time slot not found.');
            return;
        }

        try {
            // Reference to the 'production' collection
            const productionRef = collection(db, 'production');

            // Create a new production record
            await addDoc(productionRef, {
                productionLineId: selectedLine,
                supervisorId: selectedSupervisor,
                styleId: selectedStyle.id,
                date: Timestamp.fromDate(new Date()),
                timeSlot: selectedSlot.id,
                unitsProduced: unitsProduced,
                breakId: selectedSlot.breakId || null,
            });

            console.log('Production record added successfully.');
            // Removed alert for success as per user request
        } catch (error) {
            console.error('Error adding production record:', error);
            alert('Failed to record production data. Please try again.');
        }
    };

    // Function to handle loading the production board
    const handleLoadBoard = () => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            alert('Please select a line, supervisor, and style.');
            return;
        }

        // Assign a specific time table based on the selected line by matching names
        const selectedTimeTable =
            timeTables.find((tt) => tt.name === selectedLine) || timeTables[0] || null;

        if (!selectedTimeTable) {
            alert('No Time Table found for the selected line.');
            return;
        }

        // Define the overall target per hour based on user input
        setAssignedTimeTable(selectedTimeTable);
        setStyleDetails({
            target: 0, // Will be set in the confirm modal
            outputs: Array(selectedTimeTable.slots.length).fill(0),
            balance: selectedStyle.unitsInOrder,
        });
        setIsBoardLoaded(true);
        setIsStyleModalOpen(true); // Open style modal after loading the board
    };

    // Function to confirm style and target
    const handleConfirmStyle = (target: number) => {
        if (target <= 0) {
            alert('Target must be a positive number.');
            return;
        }

        setStyleDetails((prev) => ({
            ...prev,
            target: target, // Target per hour
        }));

        setIsStyleModalOpen(false);
    };

    // Function to end the shift
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

    // Function to add an output and write to Firestore
    const handleAddOutput = async () => {
        if (!assignedTimeTable) {
            alert('Time Table is not loaded.');
            return;
        }

        let selectedSlotId: string | null = null;

        if (manualSlot === 'current') {
            const currentHour = currentTime.getHours();
            const currentMinutes = currentTime.getMinutes();
            const currentTimeFormatted = `${currentHour.toString().padStart(2, '0')}:${currentMinutes
                .toString()
                .padStart(2, '0')}`;

            // Find the current slot based on current time
            const currentSlot = assignedTimeTable.slots.find((slot: TimeSlot) => {
                return (
                    currentTimeFormatted >= slot.startTime &&
                    currentTimeFormatted < slot.endTime
                );
            });

            if (!currentSlot) {
                alert('No active slot found for the current time.');
                return;
            }

            selectedSlotId = currentSlot.id;
        } else {
            selectedSlotId = manualSlot;
        }

        if (selectedSlotId) {
            const slotIndex = assignedTimeTable.slots.findIndex((slot: TimeSlot) => slot.id === selectedSlotId);
            if (slotIndex === -1) {
                console.warn('Invalid Slot ID:', selectedSlotId);
                alert('Invalid slot selected.');
                return;
            }

            // Increment output
            const updatedOutputs = [...styleDetails.outputs];
            updatedOutputs[slotIndex] += 1; // Increment output
            const newBalance = styleDetails.balance - 1; // Reduce balance

            setStyleDetails((prev) => ({ ...prev, outputs: updatedOutputs, balance: newBalance }));

            // Write to Firestore
            await logProductionRecord(1, selectedSlotId);
        } else {
            console.warn('No Slot ID selected.');
            alert('No slot selected.');
        }
    };

    // Function to handle rework submission
    const handleReworkSubmit = (reason: string) => {
        if (!reason.trim()) {
            alert('Please provide a reason for rework.');
            return;
        }
        console.log('Rework reason:', reason);
        setReworkCount(reworkCount + 1);
        alert(`Rework submitted for reason: ${reason}`);
        setIsReworkModalOpen(false);
    };

    // Function to calculate target per slot based on break duration
    const calculateTargetPerSlot = (slot: TimeSlot): number => {
        if (slot.breakId) {
            const breakDuration = breaks.find(b => b.id === slot.breakId)?.duration || 0;
            return Math.ceil((styleDetails.target / 60) * (60 - breakDuration));
        } else {
            return styleDetails.target;
        }
    };

    // Function to calculate efficiency for a single slot
    const calculateEfficiency = (output: number, target: number): string => {
        return target ? ((output / target) * 100).toFixed(2) + '%' : 'N/A';
    };

    // Function to calculate cumulative efficiency up to a certain slot index
    const calculateCumulativeEfficiency = (upToIndex: number): string => {
        if (!assignedTimeTable) return 'N/A';

        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            const slot = assignedTimeTable.slots[i];
            if (!slot) continue;

            const targetPerSlot = calculateTargetPerSlot(slot);

            totalOutput += styleDetails.outputs[i];
            totalTarget += targetPerSlot;
        }

        return totalTarget ? ((totalOutput / totalTarget) * 100).toFixed(2) + '%' : 'N/A';
    };

    return (
        <div className="production-board-container">
            {!isBoardLoaded ? (
                <div className="inputs-container">
                    <h1>Production Board</h1>
                    <label>
                        Select Line:
                        <select
                            value={selectedLine}
                            onChange={(e) => {
                                setSelectedLine(e.target.value);
                            }}
                        >
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
                            onChange={(e) => {
                                setSelectedSupervisor(e.target.value);
                            }}
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
                        <div className="left-section">
                            <div className="clock-date-display">
                                <span className="clock">{currentTime.toLocaleTimeString()}</span>
                                <span className="date">{currentTime.toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="center-section">
                            <h2>{selectedLine} - Supervisor: {selectedSupervisor} - Style Number: {selectedStyle?.styleNumber}</h2>
                        </div>
                        <div className="right-section">
                            <button className="button end-shift-button" onClick={handleEndShift}>End of Shift</button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="main-content">
                        <div className="left-content">
                            {/* Time Slot Selection */}
                            <div className="slot-selection">
                                <label>
                                    Select Time Slot:
                                    <select value={manualSlot} onChange={(e) => setManualSlot(e.target.value)}>
                                        <option value="current">Current (Real-time)</option>
                                        {assignedTimeTable?.slots.map((slot, index) => (
                                            <option key={slot.id} value={slot.id}>
                                                Hour {index + 1} ({slot.startTime} - {slot.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button className="button unit-produced-button" onClick={handleAddOutput}>Unit Produced</button>
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

                                        // Calculate target per slot
                                        const targetPerSlot = calculateTargetPerSlot(slot);

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
                                                <td>{targetPerSlot}</td>
                                                <td>{output}</td>
                                                <td>{calculateEfficiency(output, targetPerSlot)}</td>
                                                <td>{calculateCumulativeEfficiency(index)}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="right-content">
                            {/* Box 1: Style Details */}
                            <div className="style-details-box">
                                <h3>Style Details</h3>
                                {selectedStyle && (
                                    <>
                                        <p><strong>Description:</strong> {selectedStyle.description}</p>
                                        <p><strong>Delivery Date:</strong> {selectedStyle.deliveryDate}</p>
                                        <p><strong>Units in Order:</strong> {selectedStyle.unitsInOrder}</p>
                                        <p><strong>Remaining Balance:</strong> {styleDetails.balance}</p>
                                    </>
                                )}
                            </div>

                            {/* Box 2: Rejects and Reworks */}
                            <div className="rejects-reworks-box">
                                <h3>Rejects and Reworks</h3>
                                <div className="counters">
                                    <div className="counter reject-counter">
                                        <p>Total Rejects:</p>
                                        <span>{rejectCount}</span>
                                    </div>
                                    <div className="counter rework-counter">
                                        <p>Total Reworks:</p>
                                        <span>{reworkCount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Box 3: Open Downtime Elements */}
                            <div className="downtime-box">
                                <h3>Open Downtime Elements</h3>
                                {/* Placeholder content */}
                                <p>No downtime reported.</p>
                            </div>

                            {/* Box 4: Buttons */}
                            <div className="buttons-box">
                                <button className="button downtime-button">Down Time</button>
                                <button className="button reject-button">Reject</button>
                                <button className="button rework-button" onClick={() => setIsReworkModalOpen(true)}>Rework</button>
                            </div>
                        </div>
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
                        <h2>Confirm Style & Target</h2>
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
                                min="1"
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

}; // End of ProductionBoard component

export default ProductionBoard;