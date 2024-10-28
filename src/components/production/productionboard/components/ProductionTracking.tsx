// src/components/production/productionboard/components/ProductionTracking.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
    ProductionLine,
    Style,
    SupportFunction,
    TimeTable,
    Break,
    SessionData
} from '../../../../types';
import './ProductionTracking.css';

interface ProductionTrackingProps {
    sessionData: SessionData | null;
    onUnitProduced: (slotId: string) => Promise<void>;
    setSessionData: React.Dispatch<React.SetStateAction<SessionData | null>>;
}

interface CurrentSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId: string | null;
    isActive: boolean;
}

const ProductionTracking: React.FC<ProductionTrackingProps> = ({
                                                                   sessionData,
                                                                   onUnitProduced,
                                                                   setSessionData
                                                               }) => {
    // Data states
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);

    // Selection states
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupportFunction | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);

    // Production states
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<CurrentSlot | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [styleDetails, setStyleDetails] = useState({
        target: 0,
        outputs: [] as number[],
        balance: 0,
    });

    // Modal states
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [error, setError] = useState<string>('');

    // Initial data fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [linesSnap, supportSnap, stylesSnap, timeTablesSnap, breaksSnap] =
                    await Promise.all([
                        getDocs(collection(db, 'productionLines')),
                        getDocs(collection(db, 'supportFunctions')),
                        getDocs(collection(db, 'styles')),
                        getDocs(collection(db, 'timeTables')),
                        getDocs(collection(db, 'breaks'))
                    ]);

                setProductionLines(linesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProductionLine)));

                setSupervisors(supportSnap.docs
                    .filter(doc => doc.data().role === 'Supervisor')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as SupportFunction))
                );

                setStyles(stylesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Style)));

                setTimeTables(timeTablesSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    lineId: doc.data().lineId || '',
                    slots: (doc.data().slots || []).map((slot: any) => ({
                        id: slot.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        breakId: slot.breakId || null,
                    })),
                } as TimeTable)));

                setBreaks(breaksSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Break)));

            } catch (error) {
                console.error('Error fetching initial data:', error);
                setError('Failed to load initial data');
            }
        };

        fetchInitialData();
    }, []);

// Time table loading effect
    useEffect(() => {
        if (selectedLineId) {
            const selectedTimeTable = timeTables.find(tt => tt.lineId === selectedLineId) ||
                timeTables.find(tt => tt.name === selectedLine) ||
                timeTables[0];

            if (selectedTimeTable) {
                setAssignedTimeTable(selectedTimeTable);
                setStyleDetails(prev => ({
                    ...prev,
                    outputs: new Array(selectedTimeTable.slots.length).fill(0)
                }));
            }
        }
    }, [selectedLineId, timeTables, selectedLine]);

    // Clock update effect
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            if (assignedTimeTable && manualSlot === 'current') {
                updateCurrentTimeSlot(now);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [assignedTimeTable, manualSlot]);

    const updateCurrentTimeSlot = (now: Date) => {
        if (!assignedTimeTable) return;

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
        }
    };

    const handleLoadBoard = async () => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            setError('Please select all required fields');
            return;
        }

        try {
            const selectedTimeTable = timeTables.find(tt => tt.lineId === selectedLineId) ||
                timeTables.find(tt => tt.name === selectedLine) ||
                timeTables[0];

            if (!selectedTimeTable) {
                throw new Error('No Time Table found for the selected line.');
            }

            setAssignedTimeTable(selectedTimeTable);
            setStyleDetails(prev => ({
                ...prev,
                outputs: Array(selectedTimeTable.slots.length).fill(0),
                balance: selectedStyle.unitsInOrder,
            }));

            setIsStyleModalOpen(true);

        } catch (error) {
            console.error('Error initializing board:', error);
            setError(error instanceof Error ? error.message : 'Failed to initialize board.');
        }
    };

    const handleConfirmStyle = async (target: number) => {
        if (target <= 0) {
            setError('Target must be a positive number');
            return;
        }

        try {
            const sessionRef = await addDoc(collection(db, 'activeSessions'), {
                lineId: selectedLineId,
                supervisorId: selectedSupervisor?.id,
                styleId: selectedStyle?.id,
                startTime: Timestamp.now(),
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            setSessionData({
                sessionId: sessionRef.id,
                lineId: selectedLineId,
                supervisorId: selectedSupervisor?.id || '',
                styleId: selectedStyle?.id || '',
                startTime: Timestamp.now(),
                isActive: true
            });

            setStyleDetails(prev => ({
                ...prev,
                target
            }));

            setIsStyleModalOpen(false);
        } catch (error) {
            setError('Failed to create session');
            console.error(error);
        }
    };

    const handleAddOutput = async () => {
        if (!assignedTimeTable || !sessionData) {
            setError('Production tracking not properly initialized.');
            return;
        }

        try {
            let selectedSlotId: string;
            let slotToUse: TimeTable['slots'][0];

            if (manualSlot === 'current') {
                if (!currentTimeSlot) {
                    throw new Error('No active time slot for current time.');
                }
                selectedSlotId = currentTimeSlot.id;
                slotToUse = currentTimeSlot;
            } else {
                const selectedSlot = assignedTimeTable.slots.find(slot => slot.id === manualSlot);
                if (!selectedSlot) {
                    throw new Error('Invalid slot selection.');
                }
                selectedSlotId = manualSlot;
                slotToUse = selectedSlot;
            }

            await onUnitProduced(selectedSlotId);

            const slotIndex = assignedTimeTable.slots.findIndex(
                slot => slot.id === selectedSlotId
            );

            if (slotIndex !== -1) {
                const updatedOutputs = [...styleDetails.outputs];
                updatedOutputs[slotIndex] += 1;
                setStyleDetails(prev => ({
                    ...prev,
                    outputs: updatedOutputs,
                    balance: prev.balance - 1
                }));
            }
        } catch (error) {
            console.error('Error recording production:', error);
            setError(error instanceof Error ? error.message : 'Failed to record production.');
        }
    };

    const calculateTargetPerSlot = (slot: TimeTable['slots'][0]): number => {
        if (!slot.breakId) {
            return styleDetails.target;
        }

        const breakInfo = breaks.find(b => b.id === slot.breakId);
        if (!breakInfo) {
            return styleDetails.target;
        }

        const effectiveMinutes = 60 - breakInfo.duration;
        return Math.ceil((styleDetails.target / 60) * effectiveMinutes);
    };

    const calculateEfficiency = (output: number, target: number): string => {
        if (!target) return 'N/A';
        return `${((output / target) * 100).toFixed(2)}%`;
    };

    const calculateCumulativeEfficiency = (upToIndex: number): string => {
        if (!assignedTimeTable) return 'N/A';

        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            const slot = assignedTimeTable.slots[i];
            if (!slot) continue;

            totalOutput += styleDetails.outputs[i];
            totalTarget += calculateTargetPerSlot(slot);
        }

        if (!totalTarget) return 'N/A';
        return `${((totalOutput / totalTarget) * 100).toFixed(2)}%`;
    };

    return (
        <div className="production-tracking">
            {!sessionData ? (
                <div className="form-group">
                    <h1>Production Board Setup</h1>

                    <label>
                        Select Line:
                        <select
                            value={selectedLine}
                            onChange={(e) => {
                                const line = productionLines.find(l => l.name === e.target.value);
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
                                const supervisor = supervisors.find(s => s.id === e.target.value);
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
                            value={selectedStyle?.id || ''}
                            onChange={(e) => {
                                const style = styles.find(s => s.id === e.target.value);
                                setSelectedStyle(style || null);
                            }}
                        >
                            <option value="">Select a Style</option>
                            {styles.map((style) => (
                                <option key={style.id} value={style.id}>
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
                <div className="input-display">
                    <div className="board-header">
                        <div className="clock-display">
                            <span className="time">{currentTime.toLocaleTimeString()}</span>
                            <span className="date">{currentTime.toLocaleDateString()}</span>
                        </div>
                        <div className="board-info">
                            <h2>{selectedLine} - {selectedSupervisor?.name}</h2>
                            <h3>Style: {selectedStyle?.styleNumber}</h3>
                        </div>
                    </div>

                    {assignedTimeTable && (
                        <div className="time-table-section">
                            <div className="slot-selection">
                                <label>
                                    Select Time Slot:
                                    <select
                                        value={manualSlot}
                                        onChange={(e) => setManualSlot(e.target.value)}
                                    >
                                        <option value="current">Current Time (Real-time)</option>
                                        {assignedTimeTable.slots.map((slot, index) => (
                                            <option key={slot.id} value={slot.id}>
                                                Hour {index + 1} ({slot.startTime} - {slot.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button className="output-button" onClick={handleAddOutput}>
                                    Unit Produced
                                </button>
                            </div>

                            <table className="timetable">
                                <thead>
                                <tr>
                                    <th>Hour</th>
                                    <th>Time Slot</th>
                                    <th>Target</th>
                                    <th>Output</th>
                                    <th>Efficiency</th>
                                    <th>Cumulative</th>
                                </tr>
                                </thead>
                                <tbody>
                                {assignedTimeTable.slots.map((slot, index) => {
                                    const target = calculateTargetPerSlot(slot);
                                    const output = styleDetails.outputs[index];
                                    const breakInfo = breaks.find(b => b.id === slot.breakId);
                                    const isCurrentSlot = manualSlot === 'current' ?
                                        currentTimeSlot?.id === slot.id :
                                        manualSlot === slot.id;

                                    return (
                                        <tr key={slot.id} className={isCurrentSlot ? 'current-slot' : ''}>
                                            <td>Hour {index + 1}</td>
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

                            <div className="style-details">
                                <h3>Style Information</h3>
                                <p>Description: {selectedStyle?.description}</p>
                                <p>Units in Order: {selectedStyle?.unitsInOrder}</p>
                                <p>Balance: {styleDetails.balance}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isStyleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Set Production Target</h2>
                        <label>
                            Target Units per Hour:
                            <input
                                type="number"
                                min="1"
                                value={styleDetails.target}
                                onChange={(e) => setStyleDetails(prev => ({
                                    ...prev,
                                    target: parseInt(e.target.value) || 0
                                }))}
                            />
                        </label>
                        <div className="modal-buttons">
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
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="error-dismiss-button">✕</button>
                </div>
            )}
        </div>
    );
};

export default ProductionTracking;