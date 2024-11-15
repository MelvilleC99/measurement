import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    getDoc,
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
    OvertimeSchedule,
} from '../../../../types';
import './ProductionTracking.css';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material';

interface ProductionTrackingProps {
    sessionData: SessionData;
    onUnitProduced: (
        slotId: string,
        target: number,
        assignedTimeTableId: string,
        unitProduced: number
    ) => Promise<void>;
    handleStartOvertime: () => void;
    overtimeSchedule: OvertimeSchedule | null;
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
                                                                   handleStartOvertime,
                                                                   overtimeSchedule,
                                                               }) => {
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);
    const [activeSlots, setActiveSlots] = useState<TimeSlot[]>([]);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<CurrentSlot | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [styleDetails, setStyleDetails] = useState<StyleDetails>({
        outputs: [],
        balance: 0,
        unitsProduced: 0,
        unitsInOrder: 0,
    });
    const [error, setError] = useState<string>('');
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

    // Fetch breaks data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const breaksSnap = await getDocs(collection(db, 'breaks'));
                const loadedBreaks = breaksSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Break[];
                setBreaks(loadedBreaks);
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

            const timeTableDocRef = doc(db, 'timeTable', sessionData.timeTableId);
            const timeTableSnap = await getDoc(timeTableDocRef);

            if (!timeTableSnap.exists()) {
                setError('Assigned TimeTable does not exist.');
                return;
            }

            const timeTableData = timeTableSnap.data() as TimeTable;
            const currentDay = new Date()
                .toLocaleDateString('en-US', { weekday: 'long' })
                .toLowerCase();

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

            setAssignedTimeTable({
                ...timeTableData,
                id: timeTableSnap.id,
            });

            setActiveSlots(applicableSchedule.slots || []);
        };

        assignTimeTable();
    }, [sessionData]);

    // Set up real-time listeners for production and style data
    useEffect(() => {
        if (assignedTimeTable && sessionData) {
            let productionUnsubscribe: Unsubscribe | null = null;
            let styleUnsubscribe: Unsubscribe | null = null;

            const fetchProductionData = async () => {
                try {
                    const styleDocRef = doc(db, 'styles', sessionData.styleId);
                    const styleSnap = await getDoc(styleDocRef);

                    if (styleSnap.exists()) {
                        const style = styleSnap.data() as Style;
                        const totalUnitsProduced = style.unitsProduced || 0;
                        const unitsInOrder = style.unitsInOrder || 0;
                        const balance = unitsInOrder - totalUnitsProduced;
                        const initialOutputs = activeSlots.map(() => 0);

                        setStyleDetails({
                            outputs: initialOutputs,
                            balance,
                            unitsProduced: totalUnitsProduced,
                            unitsInOrder,
                        });

                        // Set up production listener
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

                            setStyleDetails((prev) => ({
                                ...prev,
                                outputs,
                            }));
                        });

                        // Set up style listener
                        styleUnsubscribe = onSnapshot(styleDocRef, (docSnap) => {
                            if (docSnap.exists()) {
                                const style = docSnap.data() as Style;
                                setStyleDetails((prev) => ({
                                    ...prev,
                                    unitsProduced: style.unitsProduced || 0,
                                    unitsInOrder: style.unitsInOrder || 0,
                                    balance:
                                        (style.unitsInOrder || 0) -
                                        (style.unitsProduced || 0),
                                }));
                            }
                        });
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
                if (productionUnsubscribe) productionUnsubscribe();
                if (styleUnsubscribe) styleUnsubscribe();
            };
        }
    }, [assignedTimeTable, sessionData, activeSlots]);

    // Update current time and active slot
    useEffect(() => {
        const updateCurrentSlot = () => {
            const now = new Date();
            setCurrentTime(now);

            if (activeSlots && manualSlot === 'current') {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                const activeSlot = activeSlots.find((slot) => {
                    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                    const [endHour, endMinute] = slot.endTime.split(':').map(Number);

                    const slotStart = startHour * 60 + startMinute;
                    const slotEnd = endHour * 60 + endMinute;

                    if (slotEnd <= slotStart) {
                        // Slot spans midnight
                        return currentMinutes >= slotStart || currentMinutes < slotEnd;
                    } else {
                        return currentMinutes >= slotStart && currentMinutes < slotEnd;
                    }
                });

                if (activeSlot) {
                    setCurrentTimeSlot({
                        ...activeSlot,
                        isActive: true,
                    });
                } else {
                    setCurrentTimeSlot(null);
                }
            }
        };

        if (activeSlots.length > 0) {
            updateCurrentSlot();
        }

        const interval = setInterval(updateCurrentSlot, 60000);

        return () => clearInterval(interval);
    }, [activeSlots, manualSlot]);

    // Helper functions for calculations
    const calculateTargetPerSlot = (slot: TimeSlot): number => {
        if (!slot.breakId) return sessionData.target;

        const breakInfo = breaks.find((b) => b.id === slot.breakId);
        if (!breakInfo) return sessionData.target;

        const effectiveMinutes = 60 - breakInfo.duration;
        return Math.ceil((sessionData.target / 60) * effectiveMinutes);
    };

    const calculateEfficiencyAtCurrentTime = (slot: TimeSlot, output: number): string => {
        const target = calculateTargetPerSlot(slot);
        return target <= 0 ? '0%' : `${((output / target) * 100).toFixed(1)}%`;
    };

    const calculateCumulativeEfficiency = (upToIndex: number): string => {
        if (!activeSlots) return '0%';

        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            totalOutput += styleDetails.outputs[i] || 0;
            totalTarget += calculateTargetPerSlot(activeSlots[i]);
        }

        return totalTarget === 0
            ? '0%'
            : `${((totalOutput / totalTarget) * 100).toFixed(1)}%`;
    };

    // Event handlers
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

            const unitProduced = 1;

            await onUnitProduced(
                selectedSlotId,
                sessionData.target,
                assignedTimeTable.id,
                unitProduced
            );
        } catch (error) {
            console.error('Error recording production:', error);
            setError('Failed to record production.');
        }
    };

    const handleStartOvertimeClick = () => {
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmOvertime = () => {
        setIsConfirmDialogOpen(false);
        handleStartOvertime();
    };

    const handleCancelOvertime = () => {
        setIsConfirmDialogOpen(false);
    };

    // Render component
    return (
        <div className="production-tracking">
            <Dialog
                open={isConfirmDialogOpen}
                onClose={handleCancelOvertime}
                aria-labelledby="confirm-overtime-title"
            >
                <DialogTitle id="confirm-overtime-title">Confirm Overtime</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to start an overtime session?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelOvertime} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmOvertime} color="secondary" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

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
                        disabled={
                            styleDetails.balance <= 0 ||
                            (manualSlot === 'current' && !currentTimeSlot)
                        }
                        title={
                            manualSlot === 'current' && !currentTimeSlot
                                ? 'No active time slot currently.'
                                : ''
                        }
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
                        {activeSlots?.map((slot, index) => (
                            <tr
                                key={slot.id}
                                className={
                                    manualSlot === slot.id ||
                                    (manualSlot === 'current' && currentTimeSlot?.id === slot.id)
                                        ? 'current-slot'
                                        : ''
                                }
                            >
                                <td>{index + 1}</td>
                                <td>
                                    {slot.startTime} - {slot.endTime}
                                    {breaks.find((b) => b.id === slot.breakId) && (
                                        <span className="break-indicator">
                                            (
                                            {breaks.find((b) => b.id === slot.breakId)?.name} -
                                            {breaks.find((b) => b.id === slot.breakId)?.duration}min)
                                        </span>
                                    )}
                                </td>
                                <td>{calculateTargetPerSlot(slot)}</td>
                                <td>{styleDetails.outputs[index] || 0}</td>
                                <td>
                                    {calculateEfficiencyAtCurrentTime(
                                        slot,
                                        styleDetails.outputs[index] || 0
                                    )}
                                </td>
                                <td>{calculateCumulativeEfficiency(index)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {overtimeSchedule && !sessionData.isOvertime && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            padding: '1rem',
                            gap: '1rem',
                            marginTop: 'auto',
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ color: '#ed1212', fontWeight: 600 }}>
                            Overtime Scheduled
                        </Typography>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleStartOvertimeClick}
                            sx={{
                                backgroundColor: '#ed1212',
                                '&:hover': {
                                    backgroundColor: '#2c5282',
                                },
                                minWidth: '120px',
                                fontWeight: 600,
                            }}
                        >
                            Start Overtime
                        </Button>
                    </div>
                )}
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
