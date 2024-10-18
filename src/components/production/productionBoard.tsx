import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import ReworkPopup from './ReworkPopup';
import RejectPopup from './RejectPopup';
import DowntimePopup from './DowntimePopup';
import ActiveReworksPopup from './ActiveReworksPopup';
import RejectsListPopup from './RejectsListPopup';
import DowntimeActionPopup from './DowntimeActionPopup';
import './productionBoard.css';

// Interfaces
interface ProductionLine {
    id: string;
    name: string;
    description?: string;
}

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber: string;
    role: string;
    hasPassword: boolean;
    password: string;
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
    breakType: string;
    startTime: string;
    endTime: string;
    duration: number;
}

interface Reject {
    refNumber: string;
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
}

interface ReworkItem {
    refNumber: string;
    count: number;
    reason: string;
    operation: string;
    startTime: Date;
    endTime?: Date;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
}

interface DowntimeItem {
    refNumber: string;
    productionLineId: string;
    supervisorId: string;
    mechanicId?: string;
    startTime: Date;
    mechanicReceivedTime?: Date;
    endTime?: Date;
    category: string;
    reason: string;
    status: 'Open' | 'Mechanic Received' | 'Resolved';
    createdAt: Date;
    updatedAt: Date;
}

const ProductionBoard: React.FC = () => {
    // State Variables
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [mechanics, setMechanics] = useState<SupportFunction[]>([]);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [downtimeCategories, setDowntimeCategories] = useState<{ categoryName: string; reasons: string[] }[]>([]);

    // Selection States
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupportFunction | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current');

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
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [rejectCount, setRejectCount] = useState(0);
    const [reworkCount, setReworkCount] = useState(0);
    const [rejects, setRejects] = useState<Reject[]>([]);
    const [reworks, setReworks] = useState<ReworkItem[]>([]);
    const [downtimes, setDowntimes] = useState<DowntimeItem[]>([]);

    // New State Variables for Popups
    const [isActiveReworksPopupOpen, setIsActiveReworksPopupOpen] = useState(false);
    const [isRejectsListPopupOpen, setIsRejectsListPopupOpen] = useState(false);
    const [selectedDowntime, setSelectedDowntime] = useState<DowntimeItem | null>(null);

    // Fetch data from Firestore
    const fetchData = async () => {
        try {
            // Fetch production lines
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            setProductionLines(
                linesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ProductionLine))
            );

            // Fetch support functions
            const supportFunctionsSnapshot = await getDocs(collection(db, 'supportFunctions'));
            const supportFunctionsData = supportFunctionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SupportFunction));

            // Filter supervisors, mechanics, and QCs
            setSupervisors(supportFunctionsData.filter(sf => sf.role.toLowerCase() === 'supervisor'));
            setMechanics(supportFunctionsData.filter(sf => sf.role.toLowerCase() === 'mechanic'));
            setQcs(supportFunctionsData.filter(sf => sf.role.toLowerCase() === 'qc'));

            // Fetch styles
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            setStyles(stylesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Style)));

            // Fetch time tables
            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
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

            // Fetch breaks
            const breaksSnapshot = await getDocs(collection(db, 'breaks'));
            const fetchedBreaks: Break[] = breaksSnapshot.docs.map((doc) => ({
                id: doc.id,
                breakType: doc.data().breakType,
                startTime: doc.data().startTime,
                endTime: doc.data().endTime,
                duration: doc.data().duration,
            }));
            setBreaks(fetchedBreaks);

            // Fetch downtime categories and reasons (including rejects and reworks)
            const downtimeCategoriesSnapshot = await getDocs(collection(db, 'downtimeCategories'));
            const fetchedDowntimeCategories = downtimeCategoriesSnapshot.docs.map((doc) => ({
                categoryName: doc.data().name, // Corrected field name
                reasons: doc.data().reasons,
            }));
            setDowntimeCategories(fetchedDowntimeCategories);

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
                supervisorId: selectedSupervisor.id,
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

    // Function to handle reject submission
    const handleRejectSubmit = async (rejectData: Omit<Reject, 'refNumber'>) => {
        // Generate unique 4-digit reference number
        const refNumber = Math.floor(1000 + Math.random() * 9000).toString();

        const newReject: Reject = {
            refNumber,
            ...rejectData,
        };

        setRejects([...rejects, newReject]);
        setRejectCount(rejectCount + rejectData.count);

        if (rejectData.recordedAsProduced) {
            // Adjust outputs
            const slotIndex = assignedTimeTable?.slots.findIndex(slot => slot.id === manualSlot) || 0;
            const updatedOutputs = [...styleDetails.outputs];
            updatedOutputs[slotIndex] -= rejectData.count; // Reduce output by reject count
            setStyleDetails((prev) => ({ ...prev, outputs: updatedOutputs }));
        }

        // Save to database
        await addDoc(collection(db, 'rejects'), {
            ...newReject,
            productionLineId: selectedLine,
            supervisorId: selectedSupervisor?.id,
            timestamp: Timestamp.fromDate(new Date()),
            createdAt: Timestamp.fromDate(new Date()),
            updatedAt: Timestamp.fromDate(new Date()),
        });

        setIsRejectModalOpen(false);
    };

    // Function to handle rework submission
    const handleReworkSubmit = async (reworkData: Omit<ReworkItem, 'refNumber' | 'startTime' | 'status' | 'endTime'>) => {
        // Generate unique 4-digit reference number
        const refNumber = Math.floor(1000 + Math.random() * 9000).toString();

        const newRework: ReworkItem = {
            refNumber,
            startTime: new Date(),
            status: 'Booked Out',
            ...reworkData,
        };

        setReworks([...reworks, newRework]);
        setReworkCount(reworkCount + reworkData.count);

        // Save to database
        await addDoc(collection(db, 'reworks'), {
            ...newRework,
            productionLineId: selectedLine,
            supervisorId: selectedSupervisor?.id,
            timestamp: Timestamp.fromDate(new Date()),
            createdAt: Timestamp.fromDate(new Date()),
            updatedAt: Timestamp.fromDate(new Date()),
        });

        setIsReworkModalOpen(false);
    };

    // Function to handle downtime submission
    const handleDowntimeSubmit = async (downtimeData: Omit<DowntimeItem, 'refNumber' | 'startTime' | 'status' | 'createdAt' | 'updatedAt' | 'productionLineId' | 'supervisorId'>) => {
        // Generate unique 4-digit reference number
        const refNumber = Math.floor(1000 + Math.random() * 9000).toString();

        const newDowntime: DowntimeItem = {
            refNumber,
            productionLineId: selectedLine,
            supervisorId: selectedSupervisor?.id || '',
            startTime: new Date(),
            status: 'Open',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...downtimeData,
        };

        setDowntimes([...downtimes, newDowntime]);

        // Save to database
        await addDoc(collection(db, 'downtimes'), {
            ...newDowntime,
            startTime: Timestamp.fromDate(newDowntime.startTime),
            createdAt: Timestamp.fromDate(newDowntime.createdAt),
            updatedAt: Timestamp.fromDate(newDowntime.updatedAt),
        });

        setIsDowntimeModalOpen(false);
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

    // Function to handle selecting an active downtime
    const handleSelectDowntime = (downtime: DowntimeItem) => {
        setSelectedDowntime(downtime);
    };

    // Function to handle downtime action from popup
    const handleDowntimeAction = async (action: 'mechanicReceived' | 'resolved', mechanicId?: string) => {
        if (!selectedDowntime) return;

        const downtimeDocRef = doc(db, 'downtimes', selectedDowntime.refNumber);

        if (action === 'mechanicReceived' && mechanicId) {
            const mechanic = mechanics.find(m => m.id === mechanicId);
            if (!mechanic) {
                alert('Invalid mechanic selected.');
                return;
            }

            const updatedDowntime: DowntimeItem = {
                ...selectedDowntime,
                mechanicId,
                mechanicReceivedTime: new Date(),
                status: 'Mechanic Received',
                updatedAt: new Date(),
            };

            // Update local state
            setDowntimes(prevDowntimes =>
                prevDowntimes.map(dt =>
                    dt.refNumber === selectedDowntime.refNumber ? updatedDowntime : dt
                )
            );

            // Update in database
            await updateDoc(downtimeDocRef, {
                mechanicId: updatedDowntime.mechanicId,
                mechanicReceivedTime: Timestamp.fromDate(updatedDowntime.mechanicReceivedTime!),
                status: updatedDowntime.status,
                updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
            });
        } else if (action === 'resolved') {
            const updatedDowntime: DowntimeItem = {
                ...selectedDowntime,
                endTime: new Date(),
                status: 'Resolved',
                updatedAt: new Date(),
            };

            // Update local state
            setDowntimes(prevDowntimes =>
                prevDowntimes.map(dt =>
                    dt.refNumber === selectedDowntime.refNumber ? updatedDowntime : dt
                )
            );

            // Update in database
            await updateDoc(downtimeDocRef, {
                endTime: Timestamp.fromDate(updatedDowntime.endTime!),
                status: updatedDowntime.status,
                updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
            });

            // Calculate response time and repair time
            const responseTime = updatedDowntime.mechanicReceivedTime
                ? (updatedDowntime.mechanicReceivedTime.getTime() - updatedDowntime.startTime.getTime()) / 1000
                : 0;
            const repairTime = updatedDowntime.endTime && updatedDowntime.mechanicReceivedTime
                ? (updatedDowntime.endTime.getTime() - updatedDowntime.mechanicReceivedTime.getTime()) / 1000
                : 0;
            const totalDowntime = updatedDowntime.endTime
                ? (updatedDowntime.endTime.getTime() - updatedDowntime.startTime.getTime()) / 1000
                : 0;

            console.log(`Downtime Resolved. Response Time: ${responseTime}s, Repair Time: ${repairTime}s, Total Downtime: ${totalDowntime}s`);
        }

        setSelectedDowntime(null);
    };

    // Function to handle booking reworks back in or converting to reject
    const handleBookInRework = async (rework: ReworkItem, qcId: string, action: 'bookIn' | 'convertToReject') => {
        const qc = qcs.find(q => q.id === qcId);
        if (qc) {
            if (action === 'bookIn') {
                // Update rework status
                const updatedReworks = reworks.map(rw => {
                    if (rw.refNumber === rework.refNumber) {
                        return {
                            ...rw,
                            endTime: new Date(),
                            status: 'Booked In' as 'Booked In',
                        };
                    }
                    return rw;
                });
                setReworks(updatedReworks);
                setReworkCount(reworkCount - rework.count);

                // Update in database
                const reworkDocRef = doc(db, 'reworks', rework.refNumber);
                await updateDoc(reworkDocRef, {
                    endTime: Timestamp.fromDate(new Date()),
                    status: 'Booked In',
                    updatedAt: Timestamp.fromDate(new Date()),
                });
            } else if (action === 'convertToReject') {
                // Remove rework and add reject
                setReworks(reworks.filter(rw => rw.refNumber !== rework.refNumber));
                setReworkCount(reworkCount - rework.count);

                const refNumber = Math.floor(1000 + Math.random() * 9000).toString();
                const newReject: Reject = {
                    refNumber,
                    count: rework.count,
                    reason: rework.reason,
                    recordedAsProduced: false,
                    qcApprovedBy: `${qc.name} ${qc.surname}`,
                };
                setRejects([...rejects, newReject]);
                setRejectCount(rejectCount + rework.count);

                // Save reject to database
                await addDoc(collection(db, 'rejects'), {
                    ...newReject,
                    productionLineId: selectedLine,
                    supervisorId: selectedSupervisor?.id,
                    timestamp: Timestamp.fromDate(new Date()),
                    createdAt: Timestamp.fromDate(new Date()),
                    updatedAt: Timestamp.fromDate(new Date()),
                });

                // Delete rework from database
                const reworkDocRef = doc(db, 'reworks', rework.refNumber);
                await deleteDoc(reworkDocRef);
            }
            setIsActiveReworksPopupOpen(false);
        } else {
            alert('Invalid QC selected.');
        }
    };

    // Function to display list of rejects
    const handleShowRejects = () => {
        setIsRejectsListPopupOpen(true);
    };

    // Function to display list of reworks
    const handleShowReworks = () => {
        setIsActiveReworksPopupOpen(true);
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
                            value={selectedSupervisor?.id || ''}
                            onChange={(e) => {
                                const supervisor = supervisors.find(sup => sup.id === e.target.value);
                                setSelectedSupervisor(supervisor || null);
                            }}
                        >
                            <option value="">Select a Supervisor</option>
                            {supervisors.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {sup.name} {sup.surname}
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
                            <h2>{selectedLine} - Supervisor: {selectedSupervisor?.name} - Style Number: {selectedStyle?.styleNumber}</h2>
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
                                        const breakInfo = slot.breakId
                                            ? breaks.find((b) => b.id === slot.breakId)
                                            : null;

                                        // Calculate target per slot
                                        const targetPerSlot = calculateTargetPerSlot(slot);

                                        const output = styleDetails.outputs[index];
                                        return (
                                            <tr key={slot.id}>
                                                <td>Hour {index + 1}</td>
                                                <td>
                                                    {slot.startTime} - {slot.endTime}
                                                    {breakInfo && (
                                                        <span className="break-indicator"> (Break: {breakInfo.breakType} - {breakInfo.duration} mins)</span>
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
                                    <div className="counter reject-counter" onClick={handleShowRejects}>
                                        <p>Total Rejects:</p>
                                        <span>{rejectCount}</span>
                                    </div>
                                    <div className="counter rework-counter" onClick={handleShowReworks}>
                                        <p>Total Reworks:</p>
                                        <span>{reworkCount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Box 3: Open Downtime Elements */}
                            <div className="downtime-box">
                                <h3>Open Downtime Elements</h3>
                                <div className="downtime-list">
                                    {downtimes.filter(dt => dt.status !== 'Resolved').map(dt => (
                                        <div
                                            key={dt.refNumber}
                                            className="downtime-item"
                                            onClick={() => handleSelectDowntime(dt)}
                                        >
                                            <p><strong>Ref:</strong> {dt.refNumber}</p>
                                            <p><strong>Category:</strong> {dt.category}</p>
                                            <p><strong>Reason:</strong> {dt.reason}</p>
                                            <p><strong>Status:</strong> {dt.status}</p>
                                            <p><strong>Duration:</strong> {Math.floor((new Date().getTime() - dt.startTime.getTime()) / 1000)} seconds</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Box 4: Buttons */}
                            <div className="buttons-box">
                                <button className="button downtime-button" onClick={() => setIsDowntimeModalOpen(true)}>Down Time</button>
                                <button className="button reject-button" onClick={() => setIsRejectModalOpen(true)}>Reject</button>
                                <button className="button rework-button" onClick={() => setIsReworkModalOpen(true)}>Rework</button>
                            </div>
                        </div>
                    </div>

                    {/* Modals */}
                    {isRejectModalOpen && (
                        <RejectPopup
                            onClose={() => setIsRejectModalOpen(false)}
                            onSubmit={handleRejectSubmit}
                            downtimeCategories={downtimeCategories}
                            qcs={qcs}
                        />
                    )}

                    {isReworkModalOpen && (
                        <ReworkPopup
                            onClose={() => setIsReworkModalOpen(false)}
                            onSubmit={handleReworkSubmit}
                            downtimeCategories={downtimeCategories}
                            operations={[]} // Operations are manual input
                            qcs={qcs}
                        />
                    )}

                    {isDowntimeModalOpen && (
                        <DowntimePopup
                            onClose={() => setIsDowntimeModalOpen(false)}
                            onSubmit={handleDowntimeSubmit}
                            downtimeCategories={downtimeCategories}
                        />
                    )}

                    {/* Active Reworks Popup */}
                    {isActiveReworksPopupOpen && (
                        <ActiveReworksPopup
                            reworks={reworks.filter(rw => rw.status === 'Booked Out')}
                            qcs={qcs}
                            onClose={() => setIsActiveReworksPopupOpen(false)}
                            onBookIn={handleBookInRework}
                        />
                    )}

                    {/* Rejects List Popup */}
                    {isRejectsListPopupOpen && (
                        <RejectsListPopup
                            rejects={rejects}
                            onClose={() => setIsRejectsListPopupOpen(false)}
                        />
                    )}

                    {/* Downtime Action Popup */}
                    {selectedDowntime && (
                        <DowntimeActionPopup
                            downtime={selectedDowntime}
                            mechanics={mechanics}
                            supervisor={selectedSupervisor}
                            onClose={() => setSelectedDowntime(null)}
                            onAction={handleDowntimeAction}
                        />
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
            )}
        </div>
    );
};

export default ProductionBoard;