// src/components/production/productionboard/components/ProductionTracking.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    getDoc,
    Timestamp,
    doc,
    query,
    where,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
    Style,
    TimeTable,
    Break,
    SessionData,
    TimeSlot,
    Schedule,
} from '../../../../types';
import './ProductionTracking.css';

interface ProductionTrackingProps {
    sessionData: SessionData;
    onUnitProduced: (
        slotId: string,
        target: number,
        assignedTimeTableId: string,
        unitProduced: number
    ) => Promise<void>;
}

interface CurrentSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId?: string;
    isActive: boolean;
}

interface StyleDetails {
    outputs: number[];
    balance: number;
    unitsProduced: number;
    unitsInOrder: number;
}

const ProductionTracking: React.FC<ProductionTrackingProps> = ({
                                                                   sessionData,
                                                                   onUnitProduced,
                                                               }) => {
    // Data states
    const [breaks, setBreaks] = useState<Break[]>([]);

    // Production states
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(
        null
    );
    const [activeSlots, setActiveSlots] = useState<TimeSlot[]>([]);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<CurrentSlot | null>(
        null
    );
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [styleDetails, setStyleDetails] = useState<StyleDetails>({
        outputs: [],
        balance: 0,
        unitsProduced: 0,
        unitsInOrder: 0,
    });

    // Error state
    const [error, setError] = useState<string>('');

    // Fetch necessary data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const breaksSnap = await getDocs(collection(db, 'breaks'));

                const loadedBreaks = breaksSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Break[];
                setBreaks(loadedBreaks);

                console.log('Initial breaks data loaded successfully');
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setError('Failed to load production data');
            }
        };

        fetchData();
    }, []);

    // Assign TimeTable based on session data
    useEffect(() => {
        const assignTimeTable = async () => {
            if (!sessionData.timeTableId) {
                setError('No TimeTable associated with the production line.');
                return;
            }

            // Fetch the time table from the 'timeTable' collection
            const timeTableDocRef = doc(db, 'timeTable', sessionData.timeTableId);
            const timeTableSnap = await getDoc(timeTableDocRef);

            if (!timeTableSnap.exists()) {
                setError('Assigned TimeTable does not exist.');
                return;
            }

            const timeTableData = timeTableSnap.data() as TimeTable;

            // Determine the current day of the week
            const currentDay = new Date()
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toLowerCase();

            // Find the schedule that applies to the current day
            const applicableSchedule = timeTableData.schedules.find(
                (schedule: Schedule) =>
                    schedule.daysOfWeek
                        .map((day: string) => day.toLowerCase())
                        .includes(currentDay)
            );

            if (!applicableSchedule) {
                setError('No schedule applies to the current day.');
                return;
            }

            // Assign the time table and active slots
            setAssignedTimeTable({
                ...timeTableData,
                id: timeTableSnap.id,
            });

            setActiveSlots(applicableSchedule.slots || []);

            console.log('Time table assigned:', timeTableData.name);
        };

        assignTimeTable();
    }, [sessionData]);

    // Initialize production details based on session data
    useEffect(() => {
        if (assignedTimeTable && sessionData) {
            let productionUnsubscribe: Unsubscribe | null = null;
            let styleUnsubscribe: Unsubscribe | null = null;

            const fetchProductionData = async () => {
                try {
                    // Fetch the style document to get unitsProduced and unitsInOrder
                    const styleDocRef = doc(db, 'styles', sessionData.styleId);
                    const styleSnap = await getDoc(styleDocRef);
                    if (styleSnap.exists()) {
                        const style = styleSnap.data() as Style;
                        const totalUnitsProduced = style.unitsProduced || 0;
                        const unitsInOrder = style.unitsInOrder || 0;
                        const balance = unitsInOrder - totalUnitsProduced;

                        // Initialize outputs array based on activeSlots
                        const initialOutputs = activeSlots.map(() => 0);

                        setStyleDetails({
                            outputs: initialOutputs,
                            balance,
                            unitsProduced: totalUnitsProduced,
                            unitsInOrder,
                        });

                        // Listen to 'production' collection for real-time updates
                        const productionQuery = query(
                            collection(db, 'production'),
                            where('sessionId', '==', sessionData.sessionId)
                        );

                        productionUnsubscribe = onSnapshot(productionQuery, (snapshot) => {
                            const outputs = Array(activeSlots.length).fill(0);

                            snapshot.docs.forEach((doc) => {
                                const data = doc.data();
                                const slotIndex = activeSlots.findIndex(
                                    (slot) => slot.id === data.slotId
                                );
                                if (slotIndex !== -1) {
                                    outputs[slotIndex] += data.unitProduced || 1;
                                }
                            });

                            // Update outputs
                            setStyleDetails((prevDetails) => ({
                                ...prevDetails,
                                outputs,
                                // balance is handled by the 'styles' listener
                            }));

                            console.log('Outputs updated:', outputs);
                        });

                        // Listen to 'styles' document for real-time updates
                        styleUnsubscribe = onSnapshot(styleDocRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const style = docSnap.data() as Style;
                                const updatedUnitsProduced = style.unitsProduced || 0;
                                const updatedUnitsInOrder = style.unitsInOrder || 0;
                                const updatedBalance = updatedUnitsInOrder - updatedUnitsProduced;

                                setStyleDetails((prevDetails) => ({
                                    ...prevDetails,
                                    unitsProduced: updatedUnitsProduced,
                                    unitsInOrder: updatedUnitsInOrder,
                                    balance: updatedBalance,
                                }));

                                console.log('Style details updated:', {
                                    unitsProduced: updatedUnitsProduced,
                                    unitsInOrder: updatedUnitsInOrder,
                                    balance: updatedBalance,
                                });
                            }
                        });

                        console.log('Production and Style listeners attached successfully');
                    } else {
                        setError('Style not found');
                    }
                } catch (err) {
                    console.error('Error fetching production data:', err);
                    setError('Failed to load production data');
                }
            };

            fetchProductionData();

            return () => {
                if (productionUnsubscribe) {
                    productionUnsubscribe();
                }
                if (styleUnsubscribe) {
                    styleUnsubscribe();
                }
            };
        }
    }, [assignedTimeTable, sessionData, activeSlots]);

    // Update current time and active slot
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (activeSlots && manualSlot === 'current') {
                const currentTimeStr = now.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });

                const activeSlot = activeSlots.find(
                    (slot) =>
                        currentTimeStr >= slot.startTime && currentTimeStr < slot.endTime
                );

                if (activeSlot) {
                    setCurrentTimeSlot({
                        ...activeSlot,
                        isActive: true,
                    });
                    setManualSlot(activeSlot.id);
                    console.log('Current active slot updated:', activeSlot.id);
                } else {
                    setCurrentTimeSlot(null);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSlots, manualSlot]);

    // Handle adding a production unit
    const handleAddOutput = async () => {
        if (!assignedTimeTable || !sessionData) {
            setError('Production tracking is not properly initialized.');
            return;
        }

        try {
            let selectedSlotId: string;

            if (manualSlot === 'current') {
                if (!currentTimeSlot) {
                    throw new Error('No active time slot.');
                }
                selectedSlotId = currentTimeSlot.id;
            } else {
                selectedSlotId = manualSlot;
            }

            const target = sessionData.target;
            const assignedTimeTableId = assignedTimeTable.id;
            const unitProduced = 1;

            await onUnitProduced(
                selectedSlotId,
                target,
                assignedTimeTableId,
                unitProduced
            );

            // **Removed Local State Update to Prevent Conflicts**
            /*
            setStyleDetails((prev) => ({
                ...prev,
                outputs: newOutputs,
                unitsProduced: prev.unitsProduced + unitProduced,
                balance: prev.balance - unitProduced,
            }));
            */

            console.log('Production unit recorded successfully');
        } catch (error) {
            console.error('Error recording production:', error);
            setError('Failed to record production.');
        }
    };

    const calculateTargetPerSlot = (slot: TimeSlot): number => {
        if (!slot.breakId) return sessionData.target;

        const breakInfo = breaks.find((b) => b.id === slot.breakId);
        if (!breakInfo) return sessionData.target;

        const effectiveMinutes = 60 - breakInfo.duration;
        return Math.ceil((sessionData.target / 60) * effectiveMinutes);
    };

    const calculateEfficiency = (output: number, target: number): string => {
        if (target <= 0) return 'N/A';
        return `${((output / target) * 100).toFixed(1)}%`;
    };

    const calculateCumulativeEfficiency = (upToIndex: number): string => {
        if (!activeSlots) return 'N/A';

        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            totalOutput += styleDetails.outputs[i] || 0;
            totalTarget += calculateTargetPerSlot(activeSlots[i]);
        }

        return totalTarget === 0
            ? 'N/A'
            : `${((totalOutput / totalTarget) * 100).toFixed(1)}%`;
    };

    return (
        <div className="production-tracking">
            <div className="time-tracking-container">
                <div className="slot-controls">
                    <select
                        className="slot-select"
                        value={manualSlot}
                        onChange={(e) => setManualSlot(e.target.value)}
                    >
                        <option value="current">Current Time Slot</option>
                        {activeSlots?.map((slot, index) => (
                            <option key={slot.id} value={slot.id}>
                                Hour {index + 1} ({slot.startTime} - {slot.endTime})
                            </option>
                        ))}
                    </select>

                    <button
                        className="unit-button"
                        onClick={handleAddOutput}
                        disabled={styleDetails.balance <= 0}
                    >
                        Record Unit
                    </button>

                    <div className="style-stats">
                        <span className="stat">Order: {styleDetails.unitsInOrder}</span>
                        <span className="stat">Balance: {styleDetails.balance}</span>
                    </div>
                </div>

                <div className="time-table">
                    <table>
                        <thead>
                        <tr>
                            <th>Hour</th>
                            <th>Time</th>
                            <th>Target</th>
                            <th>Output</th>
                            <th>Efficiency</th>
                            <th>Cumulative</th>
                        </tr>
                        </thead>
                        <tbody>
                        {activeSlots?.map((slot, index) => {
                            const target = calculateTargetPerSlot(slot);
                            const output = styleDetails.outputs[index] || 0;
                            const isCurrentSlot =
                                manualSlot === slot.id ||
                                (manualSlot === 'current' && currentTimeSlot?.id === slot.id);
                            const breakInfo = breaks.find((b) => b.id === slot.breakId);

                            return (
                                <tr
                                    key={slot.id}
                                    className={isCurrentSlot ? 'current-slot' : ''}
                                >
                                    <td>{index + 1}</td>
                                    <td>
                                        {slot.startTime} - {slot.endTime}
                                        {breakInfo && (
                                            <span className="break-indicator">
                                                    ({breakInfo.name} - {breakInfo.duration}min)
                                                </span>
                                        )}
                                    </td>
                                    <td>{target}</td>
                                    <td>{output}</td>
                                    <td>{calculateEfficiency(output, target)}</td>
                                    <td>{calculateCumulativeEfficiency(index)}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}
        </div>
    );
};

export default ProductionTracking;
