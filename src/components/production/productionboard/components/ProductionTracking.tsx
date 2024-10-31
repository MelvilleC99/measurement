import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    getDoc,
    updateDoc,
    Timestamp,
    doc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
    Style,
    TimeTable,
    Break,
    SessionData,
    TimeSlot
} from '../../../../types';
import './ProductionTracking.css';

interface ProductionTrackingProps {
    sessionData: SessionData;
    onUnitProduced: (slotId: string) => Promise<void>;
    setSessionData: React.Dispatch<React.SetStateAction<SessionData | null>>;
    selectedLineId: string;
    selectedSupervisorId: string;
}

interface CurrentSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId: string | null;
    isActive: boolean;
}

interface ProductionRecord {
    sessionId: string;
    slotId: string;
    timestamp: Timestamp;
    createdAt: Timestamp;
}

const ProductionTracking: React.FC<ProductionTrackingProps> = ({
                                                                   sessionData,
                                                                   onUnitProduced,
                                                                   selectedLineId,
                                                               }) => {
    // Data states
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);

    // Production states
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<CurrentSlot | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [styleDetails, setStyleDetails] = useState({
        outputs: [] as number[],
        balance: 0,
    });

    // Error state
    const [error, setError] = useState<string>('');

    // Fetch necessary data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [stylesSnap, timeTablesSnap, breaksSnap] = await Promise.all([
                    getDocs(collection(db, 'styles')),
                    getDocs(collection(db, 'timeTables')),
                    getDocs(collection(db, 'breaks'))
                ]);

                const loadedStyles = stylesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Style));
                setStyles(loadedStyles);

                const loadedTimeTables = timeTablesSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    lineId: doc.data().lineId || '',
                    slots: (doc.data().slots || []).map((slot: any) => ({
                        id: slot.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        breakId: slot.breakId || null,
                    })),
                } as TimeTable));
                setTimeTables(loadedTimeTables);

                const loadedBreaks = breaksSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Break));
                setBreaks(loadedBreaks);

                console.log('Initial data loaded successfully');
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setError('Failed to load production data');
            }
        };

        fetchData();
    }, []);

    // Assign TimeTable based on session data
    useEffect(() => {
        const selectedTimeTable = timeTables.find(tt => tt.lineId === selectedLineId) ||
            timeTables.find(tt => tt.name === 'Default') ||
            null;

        if (selectedTimeTable) {
            setAssignedTimeTable(selectedTimeTable);
            console.log('Time table assigned:', selectedTimeTable.name);
        }
    }, [timeTables, selectedLineId]);

    // Initialize production details based on session data
    useEffect(() => {
        if (assignedTimeTable && sessionData) {
            const fetchExistingOutputs = async () => {
                try {
                    const productionQuery = query(
                        collection(db, 'production'),
                        where('sessionId', '==', sessionData.sessionId)
                    );

                    const unsubscribe = onSnapshot(productionQuery, (snapshot) => {
                        const outputs = Array(assignedTimeTable.slots.length).fill(0);

                        snapshot.docs.forEach(doc => {
                            const data = doc.data() as ProductionRecord;
                            const slotIndex = assignedTimeTable.slots.findIndex(slot => slot.id === data.slotId);
                            if (slotIndex !== -1) {
                                outputs[slotIndex]++;
                            }
                        });

                        const style = styles.find(s => s.id === sessionData.styleId);
                        if (style) {
                            const unitsProduced = outputs.reduce((a, b) => a + b, 0);
                            setStyleDetails({
                                outputs,
                                balance: style.unitsInOrder - unitsProduced
                            });
                        }
                    });

                    return unsubscribe;
                } catch (err) {
                    console.error('Error fetching existing production records:', err);
                    setError('Failed to load existing production records');
                }
            };

            fetchExistingOutputs();
        }
    }, [assignedTimeTable, sessionData, styles]);

    // Update current time and active slot
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            if (assignedTimeTable && manualSlot === 'current') {
                const currentTimeStr = now.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const activeSlot = assignedTimeTable.slots.find(slot =>
                    currentTimeStr >= slot.startTime && currentTimeStr < slot.endTime
                );

                if (activeSlot) {
                    setCurrentTimeSlot({
                        ...activeSlot,
                        isActive: true
                    });
                    setManualSlot(activeSlot.id);
                    console.log('Current active slot updated:', activeSlot.id);
                } else {
                    setCurrentTimeSlot(null);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [assignedTimeTable, manualSlot]);

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

            await onUnitProduced(selectedSlotId);

            const styleDocRef = doc(db, 'styles', sessionData.styleId);
            const styleSnap = await getDoc(styleDocRef);

            if (styleSnap.exists()) {
                const styleData = styleSnap.data() as Style;
                await updateDoc(styleDocRef, {
                    unitsProduced: (styleData.unitsProduced || 0) + 1,
                    updatedAt: Timestamp.now()
                });
                console.log('Unit production recorded successfully');
            }
        } catch (error) {
            console.error('Error recording production:', error);
            setError('Failed to record production.');
        }
    };

    const calculateTargetPerSlot = (slot: TimeSlot): number => {
        if (!slot.breakId) return sessionData.target;

        const breakInfo = breaks.find(b => b.id === slot.breakId);
        if (!breakInfo) return sessionData.target;

        const effectiveMinutes = 60 - breakInfo.duration;
        return Math.ceil((sessionData.target / 60) * effectiveMinutes);
    };

    const calculateEfficiency = (output: number, target: number): string => {
        if (target <= 0) return 'N/A';
        return `${((output / target) * 100).toFixed(1)}%`;
    };

    const calculateCumulativeEfficiency = (upToIndex: number): string => {
        if (!assignedTimeTable) return 'N/A';

        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            totalOutput += styleDetails.outputs[i];
            totalTarget += calculateTargetPerSlot(assignedTimeTable.slots[i]);
        }

        return totalTarget === 0 ? 'N/A' : `${((totalOutput / totalTarget) * 100).toFixed(1)}%`;
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
                        {assignedTimeTable?.slots.map((slot, index) => (
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
                        <span className="stat">Order: {styleDetails.balance + styleDetails.outputs.reduce((a, b) => a + b, 0)}</span>
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
                        {assignedTimeTable?.slots.map((slot, index) => {
                            const target = calculateTargetPerSlot(slot);
                            const output = styleDetails.outputs[index];
                            const isCurrentSlot = manualSlot === slot.id ||
                                (manualSlot === 'current' && currentTimeSlot?.id === slot.id);
                            const breakInfo = breaks.find(b => b.id === slot.breakId);

                            return (
                                <tr key={slot.id} className={isCurrentSlot ? 'current-slot' : ''}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {slot.startTime} - {slot.endTime}
                                        {breakInfo && (
                                            <span className="break-indicator">
                                                    ({breakInfo.breakType} - {breakInfo.duration}min)
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