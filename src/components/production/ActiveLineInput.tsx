// ActiveLineInput.tsx

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
import ReworkPopup from '../production/popup/ReworkPopup';
import RejectPopup from '../production/popup/RejectPopup';
import DowntimePopup from '../production/popup/DowntimePopup';
import ActiveReworksPopup from '../production/popup/ActiveReworksPopup';
import RejectsListPopup from '../production/popup/RejectsListPopup';
import DowntimeActionPopup from '../production/popup/DowntimeActionPopup';
import './ActiveLineInput.css';

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
    endTime: string; // "HH:MM" format
    breakId: string | null;
}

interface TimeTable {
    id: string;
    name: string;
    lineId?: string;
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
    docId: string; // Firestore document ID
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
}

interface ReworkItem {
    docId: string; // Firestore document ID
    count: number;
    reason: string;
    operation: string;
    startTime: Date;
    endTime?: Date;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
}

interface DowntimeItem {
    docId: string; // Firestore document ID
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

const ActiveLineInput: React.FC = () => {
    // State variables
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [mechanics, setMechanics] = useState<SupportFunction[]>([]);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [downtimeCategories, setDowntimeCategories] = useState<
        { categoryName: string; reasons: string[] }[]
    >([]);

    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] =
        useState<SupportFunction | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(
        null
    );
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

    const [isActiveReworksPopupOpen, setIsActiveReworksPopupOpen] =
        useState(false);
    const [isRejectsListPopupOpen, setIsRejectsListPopupOpen] = useState(false);
    const [selectedDowntime, setSelectedDowntime] =
        useState<DowntimeItem | null>(null);

    const [sessionId, setSessionId] = useState<string | null>(null);

    // Fetch data from Firestore
    const fetchData = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            const linesData = linesSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as ProductionLine)
            );
            setProductionLines(linesData);

            const supportFunctionsSnapshot = await getDocs(
                collection(db, 'supportFunctions')
            );
            const supportFunctionsData = supportFunctionsSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as SupportFunction)
            );
            setSupervisors(
                supportFunctionsData.filter(
                    (sf) => sf.role.toLowerCase() === 'supervisor'
                )
            );
            setMechanics(
                supportFunctionsData.filter((sf) => sf.role.toLowerCase() === 'mechanic')
            );
            setQcs(
                supportFunctionsData.filter((sf) => sf.role.toLowerCase() === 'qc')
            );

            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            setStyles(
                stylesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Style))
            );

            const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
            const fetchedTimeTables: TimeTable[] = timeTablesSnapshot.docs.map(
                (doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        lineId: data.lineId || '',
                        slots: (data.slots || []).map((slot: any) => ({
                            id: slot.id,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            breakId: slot.breakId || null,
                        })),
                    };
                }
            );
            setTimeTables(fetchedTimeTables);

            const breaksSnapshot = await getDocs(collection(db, 'breaks'));
            const fetchedBreaks: Break[] = breaksSnapshot.docs.map((doc) => ({
                id: doc.id,
                breakType: doc.data().breakType,
                startTime: doc.data().startTime,
                endTime: doc.data().endTime,
                duration: doc.data().duration,
            }));
            setBreaks(fetchedBreaks);

            const downtimeCategoriesSnapshot = await getDocs(
                collection(db, 'downtimeCategories')
            );
            const fetchedDowntimeCategories = downtimeCategoriesSnapshot.docs.map(
                (doc) => ({
                    categoryName: doc.data().name,
                    reasons: doc.data().reasons,
                })
            );
            setDowntimeCategories(fetchedDowntimeCategories);
        } catch (error) {
            console.error('Error fetching data from Firestore:', error);
            alert('Failed to load data. Please try again.');
        }
    };

    useEffect(() => {
        fetchData();

        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Log production record to Firestore
    const logProductionRecord = async (unitsProduced: number, slotId: string) => {
        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            alert('Please select a line, supervisor, and style.');
            return;
        }

        if (!assignedTimeTable) {
            alert('Time Table is not loaded.');
            return;
        }

        const selectedSlot = assignedTimeTable.slots.find(
            (slot: TimeSlot) => slot.id === slotId
        );
        if (!selectedSlot) {
            alert('Selected time slot not found.');
            return;
        }

        try {
            const productionRef = collection(db, 'production');

            await addDoc(productionRef, {
                sessionId: sessionId, // Include the sessionId
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                styleId: selectedStyle.id,
                date: Timestamp.fromDate(new Date()),
                timeSlot: selectedSlot.id,
                unitsProduced: unitsProduced,
                breakId: selectedSlot.breakId || null,
            });
        } catch (error) {
            console.error('Error adding production record:', error);
            alert('Failed to record production data. Please try again.');
        }
    };

    // Handle loading the production board
    const handleLoadBoard = async () => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            alert('Please select a line, supervisor, and style.');
            return;
        }

        if (timeTables.length === 0) {
            alert('No Time Tables are available. Please check your database.');
            return;
        }

        // Attempt to find a time table associated with the selected line
        const selectedTimeTable =
            timeTables.find((tt) => tt.lineId === selectedLineId) ||
            timeTables.find((tt) => tt.name === selectedLine) ||
            timeTables[0]; // Default to the first time table if no match is found

        if (!selectedTimeTable) {
            alert('No Time Table found for the selected line.');
            return;
        }

        setAssignedTimeTable(selectedTimeTable);
        setStyleDetails({
            target: 0,
            outputs: Array(selectedTimeTable.slots.length).fill(0),
            balance: selectedStyle.unitsInOrder,
        });
        setIsBoardLoaded(true);
        setIsStyleModalOpen(true);

        // Create an active session in Firestore
        try {
            const sessionData = {
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                styleId: selectedStyle.id,
                startTime: Timestamp.fromDate(new Date()),
                isActive: true,
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
            };

            const sessionRef = await addDoc(collection(db, 'activeSessions'), sessionData);

            setSessionId(sessionRef.id);
            console.log('Session created with ID:', sessionRef.id);
        } catch (error) {
            console.error('Error creating active session:', error);
            alert('Failed to create active session. Please try again.');
        }
    };

    // Handle confirming the style and setting the target
    const handleConfirmStyle = (target: number) => {
        if (target <= 0) {
            alert('Target must be a positive number.');
            return;
        }

        setStyleDetails((prev) => ({
            ...prev,
            target: target,
        }));

        setIsStyleModalOpen(false);
    };

    // Handle ending the shift
    const handleEndShift = async () => {
        const confirmed = window.confirm('Are you sure you want to end the shift?');
        if (confirmed) {
            // Update the active session to set isActive to false
            if (sessionId) {
                try {
                    const sessionDocRef = doc(db, 'activeSessions', sessionId);
                    await updateDoc(sessionDocRef, {
                        isActive: false,
                        updatedAt: Timestamp.fromDate(new Date()),
                    });
                } catch (error) {
                    console.error('Error ending active session:', error);
                }
            }

            setIsBoardLoaded(false);
            setAssignedTimeTable(null);
            setStyleDetails({
                target: 0,
                outputs: [],
                balance: 0,
            });
            setManualSlot('current');
            setSessionId(null);
        }
    };

    // Handle adding a unit produced
    const handleAddOutput = async () => {
        if (!assignedTimeTable) {
            alert('Time Table is not loaded.');
            return;
        }

        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        let selectedSlotId: string | null = null;

        if (manualSlot === 'current') {
            const currentHour = currentTime.getHours();
            const currentMinutes = currentTime.getMinutes();
            const currentTimeFormatted = `${currentHour
                .toString()
                .padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

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
            const slotIndex = assignedTimeTable.slots.findIndex(
                (slot: TimeSlot) => slot.id === selectedSlotId
            );
            if (slotIndex === -1) {
                console.warn('Invalid Slot ID:', selectedSlotId);
                alert('Invalid slot selected.');
                return;
            }

            const updatedOutputs = [...styleDetails.outputs];
            updatedOutputs[slotIndex] += 1;
            const newBalance = styleDetails.balance - 1;

            setStyleDetails((prev) => ({
                ...prev,
                outputs: updatedOutputs,
                balance: newBalance,
            }));

            await logProductionRecord(1, selectedSlotId);
        } else {
            console.warn('No Slot ID selected.');
            alert('No slot selected.');
        }
    };

    // Handle submitting a reject
    const handleRejectSubmit = async (rejectData: Omit<Reject, 'docId'>) => {
        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        try {
            const rejectDocRef = await addDoc(collection(db, 'rejects'), {
                ...rejectData,
                sessionId: sessionId, // Include sessionId
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor?.id,
                timestamp: Timestamp.fromDate(new Date()),
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
            });

            const newReject: Reject = {
                docId: rejectDocRef.id,
                ...rejectData,
            };

            setRejects([...rejects, newReject]);
            setRejectCount(rejectCount + rejectData.count);

            if (rejectData.recordedAsProduced && assignedTimeTable) {
                const slotIndex = assignedTimeTable.slots.findIndex(
                    (slot) => slot.id === manualSlot
                );
                if (slotIndex !== -1) {
                    const updatedOutputs = [...styleDetails.outputs];
                    updatedOutputs[slotIndex] -= rejectData.count;
                    setStyleDetails((prev) => ({ ...prev, outputs: updatedOutputs }));
                }
            }

            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error adding reject:', error);
            alert('Failed to add reject. Please try again.');
        }
    };

    // Handle submitting a rework
    const handleReworkSubmit = async (
        reworkData: Omit<ReworkItem, 'docId' | 'startTime' | 'status' | 'endTime'>
    ) => {
        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        try {
            const reworkDocRef = await addDoc(collection(db, 'reworks'), {
                ...reworkData,
                sessionId: sessionId, // Include sessionId
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor?.id,
                startTime: Timestamp.fromDate(new Date()),
                status: 'Booked Out',
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
            });

            const newRework: ReworkItem = {
                docId: reworkDocRef.id,
                startTime: new Date(),
                status: 'Booked Out',
                ...reworkData,
            };

            setReworks([...reworks, newRework]);
            setReworkCount(reworkCount + reworkData.count);

            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error adding rework:', error);
            alert('Failed to add rework. Please try again.');
        }
    };

    // Handle submitting a downtime
    const handleDowntimeSubmit = async (
        downtimeData: Omit<
            DowntimeItem,
            | 'docId'
            | 'startTime'
            | 'status'
            | 'createdAt'
            | 'updatedAt'
            | 'productionLineId'
            | 'supervisorId'
        >
    ) => {
        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        try {
            const downtimeDocRef = await addDoc(collection(db, 'downtimes'), {
                ...downtimeData,
                sessionId: sessionId, // Include sessionId
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor?.id || '',
                startTime: Timestamp.fromDate(new Date()),
                status: 'Open',
                createdAt: Timestamp.fromDate(new Date()),
                updatedAt: Timestamp.fromDate(new Date()),
            });

            const newDowntime: DowntimeItem = {
                docId: downtimeDocRef.id,
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor?.id || '',
                startTime: new Date(),
                status: 'Open',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...downtimeData,
            };

            setDowntimes([...downtimes, newDowntime]);

            setIsDowntimeModalOpen(false);
        } catch (error) {
            console.error('Error adding downtime:', error);
            alert('Failed to add downtime. Please try again.');
        }
    };

    // Calculate target per time slot
    const calculateTargetPerSlot = (slot: TimeSlot): number => {
        if (slot.breakId) {
            const breakDuration =
                breaks.find((b) => b.id === slot.breakId)?.duration || 0;
            return Math.ceil((styleDetails.target / 60) * (60 - breakDuration));
        } else {
            return styleDetails.target;
        }
    };

    // Calculate efficiency
    const calculateEfficiency = (output: number, target: number): string => {
        return target ? ((output / target) * 100).toFixed(2) + '%' : 'N/A';
    };

    // Calculate cumulative efficiency
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

        return totalTarget
            ? ((totalOutput / totalTarget) * 100).toFixed(2) + '%'
            : 'N/A';
    };

    // Handle selecting a downtime
    const handleSelectDowntime = (downtime: DowntimeItem) => {
        setSelectedDowntime(downtime);
    };

    // Handle downtime actions (mechanic received, resolved)
    const handleDowntimeAction = async (
        action: 'mechanicReceived' | 'resolved',
        mechanicId?: string
    ) => {
        if (!selectedDowntime) return;

        const downtimeDocRef = doc(db, 'downtimes', selectedDowntime.docId);

        if (action === 'mechanicReceived' && mechanicId) {
            const mechanic = mechanics.find((m) => m.id === mechanicId);
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

            setDowntimes((prevDowntimes) =>
                prevDowntimes.map((dt) =>
                    dt.docId === selectedDowntime.docId ? updatedDowntime : dt
                )
            );

            try {
                await updateDoc(downtimeDocRef, {
                    mechanicId: updatedDowntime.mechanicId,
                    mechanicReceivedTime: Timestamp.fromDate(
                        updatedDowntime.mechanicReceivedTime!
                    ),
                    status: updatedDowntime.status,
                    updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
                });
            } catch (error) {
                console.error('Error updating downtime:', error);
                alert('Failed to update downtime. Please try again.');
            }
        } else if (action === 'resolved') {
            const updatedDowntime: DowntimeItem = {
                ...selectedDowntime,
                endTime: new Date(),
                status: 'Resolved',
                updatedAt: new Date(),
            };

            setDowntimes((prevDowntimes) =>
                prevDowntimes.map((dt) =>
                    dt.docId === selectedDowntime.docId ? updatedDowntime : dt
                )
            );

            try {
                await updateDoc(downtimeDocRef, {
                    endTime: Timestamp.fromDate(updatedDowntime.endTime!),
                    status: updatedDowntime.status,
                    updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
                });
            } catch (error) {
                console.error('Error updating downtime:', error);
                alert('Failed to update downtime. Please try again.');
            }
        }

        setSelectedDowntime(null);
    };

    // Handle booking in reworks
    const handleBookInRework = async (
        rework: ReworkItem,
        qcId: string,
        action: 'bookIn' | 'convertToReject'
    ) => {
        if (!sessionId) {
            alert('Session ID is not set. Please try again.');
            return;
        }

        const qc = qcs.find((q) => q.id === qcId);
        if (qc) {
            if (action === 'bookIn') {
                const updatedReworks = reworks.map((rw) => {
                    if (rw.docId === rework.docId) {
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

                const reworkDocRef = doc(db, 'reworks', rework.docId);
                try {
                    await updateDoc(reworkDocRef, {
                        endTime: Timestamp.fromDate(new Date()),
                        status: 'Booked In',
                        updatedAt: Timestamp.fromDate(new Date()),
                    });
                } catch (error) {
                    console.error('Error updating rework:', error);
                    alert('Failed to update rework. Please try again.');
                }
            } else if (action === 'convertToReject') {
                setReworks(reworks.filter((rw) => rw.docId !== rework.docId));
                setReworkCount(reworkCount - rework.count);

                try {
                    const rejectDocRef = await addDoc(collection(db, 'rejects'), {
                        count: rework.count,
                        reason: rework.reason,
                        recordedAsProduced: false,
                        qcApprovedBy: `${qc.name} ${qc.surname}`,
                        sessionId: sessionId, // Include sessionId
                        productionLineId: selectedLineId,
                        supervisorId: selectedSupervisor?.id,
                        timestamp: Timestamp.fromDate(new Date()),
                        createdAt: Timestamp.fromDate(new Date()),
                        updatedAt: Timestamp.fromDate(new Date()),
                    });

                    const newReject: Reject = {
                        docId: rejectDocRef.id,
                        count: rework.count,
                        reason: rework.reason,
                        recordedAsProduced: false,
                        qcApprovedBy: `${qc.name} ${qc.surname}`,
                    };
                    setRejects([...rejects, newReject]);
                    setRejectCount(rejectCount + rework.count);

                    const reworkDocRef = doc(db, 'reworks', rework.docId);
                    await deleteDoc(reworkDocRef);
                } catch (error) {
                    console.error('Error converting rework to reject:', error);
                    alert('Failed to convert rework to reject. Please try again.');
                }
            }
            setIsActiveReworksPopupOpen(false);
        } else {
            alert('Invalid QC selected.');
        }
    };

    // Handle showing rejects
    const handleShowRejects = () => {
        setIsRejectsListPopupOpen(true);
    };

    // Handle showing reworks
    const handleShowReworks = () => {
        setIsActiveReworksPopupOpen(true);
    };

    // Render component
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
                                const line = productionLines.find(
                                    (line) => line.name === e.target.value
                                );
                                setSelectedLine(e.target.value);
                                setSelectedLineId(line?.id || '');
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
                                const supervisor = supervisors.find(
                                    (sup) => sup.id === e.target.value
                                );
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
                                const selected = styles.find(
                                    (style) => style.styleNumber === e.target.value
                                );
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

                    <button className="load-button" onClick={handleLoadBoard}>
                        Load Production Board
                    </button>
                </div>
            ) : (
                <div className="board-display">
                    <div className="heading-section">
                        <div className="left-section">
                            <div className="clock-date-display">
                                <span className="clock">{currentTime.toLocaleTimeString()}</span>
                                <span className="date">{currentTime.toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="center-section">
                            <h2>
                                {selectedLine} - Supervisor: {selectedSupervisor?.name} - Style
                                Number: {selectedStyle?.styleNumber}
                            </h2>
                        </div>
                        <div className="right-section">
                            <button
                                className="button end-shift-button"
                                onClick={handleEndShift}
                            >
                                End of Shift
                            </button>
                        </div>
                    </div>

                    <div className="main-content">
                        <div className="left-content">
                            <div className="slot-selection">
                                <label>
                                    Select Time Slot:
                                    <select
                                        value={manualSlot}
                                        onChange={(e) => setManualSlot(e.target.value)}
                                    >
                                        <option value="current">Current (Real-time)</option>
                                        {assignedTimeTable?.slots.map((slot, index) => (
                                            <option key={slot.id} value={slot.id}>
                                                Hour {index + 1} ({slot.startTime} - {slot.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    className="button unit-produced-button"
                                    onClick={handleAddOutput}
                                    disabled={!sessionId}
                                >
                                    Unit Produced
                                </button>
                            </div>

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

                                        const targetPerSlot = calculateTargetPerSlot(slot);
                                        const output = styleDetails.outputs[index];
                                        return (
                                            <tr key={slot.id}>
                                                <td>Hour {index + 1}</td>
                                                <td>
                                                    {slot.startTime} - {slot.endTime}
                                                    {breakInfo && (
                                                        <span className="break-indicator">
                                {' '}
                                                            (Break: {breakInfo.breakType} -{' '}
                                                            {breakInfo.duration} mins)
                              </span>
                                                    )}
                                                </td>
                                                <td>{targetPerSlot}</td>
                                                <td>{output}</td>
                                                <td>
                                                    {calculateEfficiency(output, targetPerSlot)}
                                                </td>
                                                <td>{calculateCumulativeEfficiency(index)}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="right-content">
                            <div className="style-details-box">
                                <h3>Style Details</h3>
                                {selectedStyle && (
                                    <>
                                        <p>
                                            <strong>Description:</strong> {selectedStyle.description}
                                        </p>
                                        <p>
                                            <strong>Delivery Date:</strong> {selectedStyle.deliveryDate}
                                        </p>
                                        <p>
                                            <strong>Units in Order:</strong> {selectedStyle.unitsInOrder}
                                        </p>
                                        <p>
                                            <strong>Remaining Balance:</strong> {styleDetails.balance}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="rejects-reworks-box">
                                <h3>Rejects and Reworks</h3>
                                <div className="counters">
                                    <div
                                        className="counter reject-counter"
                                        onClick={handleShowRejects}
                                    >
                                        <p>Total Rejects:</p>
                                        <span>{rejectCount}</span>
                                    </div>
                                    <div
                                        className="counter rework-counter"
                                        onClick={handleShowReworks}
                                    >
                                        <p>Total Reworks:</p>
                                        <span>{reworkCount}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="downtime-box">
                                <h3>Open Downtime Elements</h3>
                                <div className="downtime-list">
                                    {downtimes
                                        .filter((dt) => dt.status !== 'Resolved')
                                        .map((dt) => (
                                            <div
                                                key={dt.docId}
                                                className="downtime-item"
                                                onClick={() => handleSelectDowntime(dt)}
                                            >
                                                <p>
                                                    <strong>Ref:</strong> {dt.docId.slice(-4)}
                                                </p>
                                                <p>
                                                    <strong>Category:</strong> {dt.category}
                                                </p>
                                                <p>
                                                    <strong>Reason:</strong> {dt.reason}
                                                </p>
                                                <p>
                                                    <strong>Status:</strong> {dt.status}
                                                </p>
                                                <p>
                                                    <strong>Duration:</strong>{' '}
                                                    {Math.floor(
                                                        (new Date().getTime() - dt.startTime.getTime()) / 1000
                                                    )}{' '}
                                                    seconds
                                                </p>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="buttons-box">
                                <button
                                    className="button downtime-button"
                                    onClick={() => setIsDowntimeModalOpen(true)}
                                >
                                    Down Time
                                </button>
                                <button
                                    className="button reject-button"
                                    onClick={() => setIsRejectModalOpen(true)}
                                >
                                    Reject
                                </button>
                                <button
                                    className="button rework-button"
                                    onClick={() => setIsReworkModalOpen(true)}
                                >
                                    Rework
                                </button>
                            </div>
                        </div>
                    </div>

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
                            operations={[]}
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

                    {isActiveReworksPopupOpen && (
                        <ActiveReworksPopup
                            reworks={reworks.filter((rw) => rw.status === 'Booked Out')}
                            qcs={qcs}
                            onClose={() => setIsActiveReworksPopupOpen(false)}
                            onBookIn={handleBookInRework}
                        />
                    )}

                    {isRejectsListPopupOpen && (
                        <RejectsListPopup
                            rejects={rejects}
                            onClose={() => setIsRejectsListPopupOpen(false)}
                        />
                    )}

                    {selectedDowntime && (
                        <DowntimeActionPopup
                            downtime={selectedDowntime}
                            mechanics={mechanics}
                            supervisor={selectedSupervisor}
                            onClose={() => setSelectedDowntime(null)}
                            onAction={handleDowntimeAction}
                        />
                    )}

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
                                            setStyleDetails((prev) => ({
                                                ...prev,
                                                target: Number(e.target.value),
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    className="confirm-button"
                                    onClick={() => handleConfirmStyle(styleDetails.target)}
                                >
                                    Confirm
                                </button>
                                <button
                                    className="cancel-button"
                                    onClick={() => setIsStyleModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActiveLineInput;
