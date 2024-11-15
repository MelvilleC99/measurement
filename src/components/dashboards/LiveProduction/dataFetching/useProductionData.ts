// src/components/dashboards/LiveProduction/dataFetching/useProductionData.ts

import { useReducer, useEffect } from 'react';
import {
    onSnapshot,
    collection,
    query,
    where,
    doc,
    getDoc,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '../../../../firebase';

// -----------------------------
// Type Definitions
// -----------------------------

// Define the structure of ProductionData
interface ProductionData {
    id: string;
    name: string;
    currentEfficiency: number;
    cumulativeEfficiency: number;
    hasActiveDowntime: boolean;
    downtimeType?: string;
    downtimeStartTime?: Date;
    unitsProduced: number;
    target: number;
}

// Define Downtime Types
type DowntimeType = 'Machine Downtime' | 'Supply Downtime' | 'Style Changeover';

// Define Downtime Interface
interface Downtime {
    downtimeType: DowntimeType;
    downtimeStartTime: Date;
}

// Define the state structure for the reducer
interface ProductionState {
    productionData: ProductionData[];
    loading: boolean;
    error: string | null;
}

// Define action types for the reducer
type Action =
    | { type: 'SET_PRODUCTION_DATA'; payload: ProductionData[] }
    | { type: 'ADD_DOWNTIME'; payload: { lineId: string; downtime: Downtime } }
    | { type: 'REMOVE_DOWNTIME'; payload: { lineId: string } }
    | { type: 'UPDATE_EFFICIENCY'; payload: { lineId: string; currentEfficiency: number; cumulativeEfficiency: number } }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean };

// -----------------------------
// Reducer Function
// -----------------------------

const productionReducer = (state: ProductionState, action: Action): ProductionState => {
    switch (action.type) {
        case 'SET_PRODUCTION_DATA':
            return {
                ...state,
                productionData: action.payload,
                loading: false,
                error: null
            };
        case 'ADD_DOWNTIME':
            return {
                ...state,
                productionData: state.productionData.map(line =>
                    line.id === action.payload.lineId
                        ? {
                            ...line,
                            hasActiveDowntime: true,
                            downtimeType: action.payload.downtime.downtimeType,
                            downtimeStartTime: action.payload.downtime.downtimeStartTime
                        }
                        : line
                )
            };
        case 'REMOVE_DOWNTIME':
            return {
                ...state,
                productionData: state.productionData.map(line =>
                    line.id === action.payload.lineId
                        ? {
                            ...line,
                            hasActiveDowntime: false,
                            downtimeType: undefined,
                            downtimeStartTime: undefined
                        }
                        : line
                )
            };
        case 'UPDATE_EFFICIENCY':
            return {
                ...state,
                productionData: state.productionData.map(line =>
                    line.id === action.payload.lineId
                        ? {
                            ...line,
                            currentEfficiency: action.payload.currentEfficiency,
                            cumulativeEfficiency: action.payload.cumulativeEfficiency
                        }
                        : line
                )
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false
            };
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload
            };
        default:
            return state;
    }
};

// -----------------------------
// Helper Functions
// -----------------------------

// Helper function to calculate time-based efficiency
const calculateTimeBasedEfficiency = (
    unitProduced: number,
    targetPerHour: number,
    slotStartTime: Date | null,
    currentTime: Date = new Date()
): number => {
    if (!slotStartTime) {
        console.error('Missing slot start time');
        return 0;
    }

    try {
        // Calculate minutes elapsed since the start of the current slot
        const minutesElapsed = (currentTime.getTime() - slotStartTime.getTime()) / (1000 * 60);

        if (minutesElapsed < 0) {
            console.error('Current time is before the slot start time');
            return 0;
        }

        // Calculate expected units based on elapsed minutes
        const targetPerMinute = targetPerHour / 60;
        const expectedUnits = targetPerMinute * minutesElapsed;

        // Calculate efficiency
        const efficiency = expectedUnits > 0 ? (unitProduced / expectedUnits) * 100 : 0;

        return Math.min(Math.max(efficiency, 0), 100);
    } catch (error) {
        console.error('Error calculating time-based efficiency:', error);
        return 0;
    }
};

// -----------------------------
// useProductionData Hook
// -----------------------------

export const useProductionData = (selectedSlot: string, selectedDate: Date, currentTime: Date) => {
    const [state, dispatch] = useReducer(productionReducer, {
        productionData: [],
        loading: true,
        error: null
    });

    useEffect(() => {
        let unsubscribes: (() => void)[] = [];

        const fetchProductionData = async () => {
            try {
                // Query active sessions
                const activeSessionsRef = collection(db, 'activeSessions');
                const activeQuery = query(activeSessionsRef, where('isActive', '==', true));

                const sessionUnsubscribe = onSnapshot(activeQuery, async (activeSnapshot) => {
                    const lines: ProductionData[] = [];

                    // Iterate through active sessions
                    for (const sessionDoc of activeSnapshot.docs) {
                        const sessionData = sessionDoc.data();
                        const lineRef = doc(db, 'productionLines', sessionData.lineId);
                        const lineSnap = await getDoc(lineRef);
                        const lineData = lineSnap.data();

                        if (lineData) {
                            // Validate target
                            const target = typeof sessionData.target === 'number' && sessionData.target > 0
                                ? sessionData.target
                                : 0;

                            if (target <= 0) {
                                console.warn(`Invalid target for line ${sessionData.lineId}. Setting target to 0.`);
                            }

                            lines.push({
                                id: sessionData.lineId,
                                name: lineData.name || `Line ${sessionData.lineId}`,
                                currentEfficiency: 0,
                                cumulativeEfficiency: 0,
                                hasActiveDowntime: false,
                                unitsProduced: 0,
                                target: target
                            });
                        } else {
                            console.warn(`Production line data not found for lineId: ${sessionData.lineId}`);
                        }
                    }

                    if (lines.length === 0) {
                        dispatch({ type: 'SET_PRODUCTION_DATA', payload: [] });
                        return;
                    }

                    // Initial set of production data
                    dispatch({ type: 'SET_PRODUCTION_DATA', payload: lines });

                    // Listen to production data
                    const productionRef = collection(db, 'production');
                    const productionUnsubscribe = onSnapshot(productionRef, (prodSnapshot) => {
                        // Reset unitsProduced for each line
                        const updatedLines = lines.map(line => ({
                            ...line,
                            unitsProduced: 0
                        }));

                        prodSnapshot.forEach(doc => {
                            const data = doc.data();
                            // Validate production data
                            if (!data.lineId || !data.slotId || typeof data.unitProduced !== 'number' || !data.timestamp) {
                                console.error(`Invalid production data in document ${doc.id}:`, data);
                                return;
                            }

                            // Handle Firestore Timestamp
                            let prodDate: Date;
                            if (data.timestamp instanceof Timestamp) {
                                prodDate = data.timestamp.toDate();
                            } else if (typeof data.timestamp === 'string') {
                                prodDate = new Date(data.timestamp);
                            } else {
                                console.error(`Unknown timestamp format in document ${doc.id}:`, data.timestamp);
                                return;
                            }

                            if (isNaN(prodDate.getTime())) {
                                console.error(`Invalid timestamp in production document ${doc.id}.`);
                                return;
                            }

                            // Check if production is on selected date and slot
                            if (prodDate.toDateString() !== selectedDate.toDateString()) {
                                return;
                            }

                            if (data.slotId !== selectedSlot) {
                                return;
                            }

                            // Find the corresponding production line and update unitsProduced
                            const lineIndex = updatedLines.findIndex(line => line.id === data.lineId);
                            if (lineIndex !== -1) {
                                updatedLines[lineIndex].unitsProduced += data.unitProduced;
                            }
                        });

                        // After processing, calculate efficiencies
                        updatedLines.forEach(line => {
                            // Define slotStartTimes based on TIME_SLOTS
                            const slotStartTimes: { [key: string]: string } = {
                                '1730803219273': '08:00',
                                '1730803230697': '09:00',
                                '1730803238259': '10:00',
                                '1730803248241': '12:00',
                                '1730803261548': '13:00',
                                '1730803273225': '14:00',
                                '1730803280140': '15:00',
                                '1730803288543': '16:00'
                            };

                            const slotStartTimeStr = slotStartTimes[selectedSlot];
                            if (!slotStartTimeStr) {
                                console.error(`Start time not found for slotId: ${selectedSlot}`);
                                return;
                            }

                            // Convert slotStartTimeStr to Date object
                            const slotStartTime = new Date(`${selectedDate.toDateString()} ${slotStartTimeStr}`);
                            if (isNaN(slotStartTime.getTime())) {
                                console.error(`Invalid slot start time for slotId: ${selectedSlot}`);
                                return;
                            }

                            // Calculate current efficiency based on elapsed time
                            const currentEff = calculateTimeBasedEfficiency(line.unitsProduced, line.target, slotStartTime, currentTime);

                            // Calculate cumulative efficiency
                            const cumulativeEff = line.target > 0 ? (line.unitsProduced / line.target) * 100 : 0;

                            dispatch({
                                type: 'UPDATE_EFFICIENCY',
                                payload: {
                                    lineId: line.id,
                                    currentEfficiency: Math.min(Math.max(currentEff, 0), 100),
                                    cumulativeEfficiency: Math.min(Math.max(cumulativeEff, 0), 100)
                                }
                            });
                        });

                    }, (error) => {
                        console.error('Error in production data subscription:', error);
                        dispatch({ type: 'SET_ERROR', payload: 'Failed to load production data' });
                    });

                    unsubscribes.push(productionUnsubscribe);
                });

                unsubscribes.push(sessionUnsubscribe);

                // -----------------------------
                // Listen to Downtimes
                // -----------------------------

                // Function to handle downtimes from a specific collection
                const handleDowntimes = (collectionName: string, statusField: string, statusValue: string, downtimeType: DowntimeType, timeField: string) => {
                    const downtimesRef = collection(db, collectionName);
                    const downtimeQuery = query(
                        downtimesRef,
                        where(statusField, '==', statusValue)
                    );

                    const downtimeUnsubscribe = onSnapshot(downtimeQuery, (snapshot) => {
                        snapshot.docChanges().forEach(change => {
                            const data = change.doc.data();

                            // Extract necessary fields
                            const lineId = data.productionLineId;
                            const downtimeStartTime = data[timeField] instanceof Timestamp ? data[timeField].toDate() : (typeof data[timeField] === 'string' ? new Date(data[timeField]) : undefined);

                            if (!lineId || !downtimeStartTime) {
                                console.error(`Invalid downtime data in document ${change.doc.id}:`, data);
                                return;
                            }

                            if (change.type === 'added' || change.type === 'modified') {
                                dispatch({
                                    type: 'ADD_DOWNTIME',
                                    payload: {
                                        lineId,
                                        downtime: {
                                            downtimeType,
                                            downtimeStartTime
                                        }
                                    }
                                });
                            } else if (change.type === 'removed') {
                                dispatch({
                                    type: 'REMOVE_DOWNTIME',
                                    payload: { lineId }
                                });
                            }
                        });
                    }, (error) => {
                        console.error(`Error in ${collectionName} subscription:`, error);
                        dispatch({ type: 'SET_ERROR', payload: `Failed to load ${collectionName}` });
                    });

                    unsubscribes.push(downtimeUnsubscribe);
                };

                // Listen to Machine Downtimes
                handleDowntimes('machineDowntimes', 'status', 'Open', 'Machine Downtime', 'createdAt');

                // Listen to Supply Downtimes
                handleDowntimes('supplyDowntime', 'status', 'Open', 'Supply Downtime', 'startTime');

                // Listen to Style Changeovers
                handleDowntimes('styleChangeovers', 'status', 'In Progress', 'Style Changeover', 'createdAt');

            } catch (err) {
                console.error('Error in production data hook:', err);
                dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'An error occurred' });
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        fetchProductionData();

        // Cleanup all subscriptions on unmount
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [selectedSlot, selectedDate]); // Removed currentTime from dependencies

    return { productionData: state.productionData, loading: state.loading, error: state.error };
};
