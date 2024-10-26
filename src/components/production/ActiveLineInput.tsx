import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../firebase';
import Rework from './downtime/rework/Rework';
import Reject from './downtime/reject/Reject';
import Machine from './downtime/machine/Machine';
import StyleChange from './downtime/stylechange/StyleChangeover';
import {
    ProductionLine,
    Style,
    SupportFunction,
    TimeTable,
    Break,
    Downtime,
    ReworkItem,
    RejectRecord,
    ReworkFormData,
    RejectFormData,
    MachineFormData,
    StyleChangeoverFormData,
    convertDateToTimestamp
} from '../../types';
import './ActiveLineInput.css';

interface CurrentSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId: string | null;
    isActive: boolean;
}

interface DowntimeCategory {
    id: string;
    name: string;
    reasons: string[];
}

const downtimeTypes = {
    MACHINE: 'Machine Breakdown',
    STYLE_CHANGE: 'Style Changeover',
    OTHER: 'Other'
} as const;

type DowntimeType = typeof downtimeTypes[keyof typeof downtimeTypes];
const ActiveLineInput: React.FC = () => {
    // Data states
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [mechanics, setMechanics] = useState<SupportFunction[]>([]);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [downtimeCategories, setDowntimeCategories] = useState<DowntimeCategory[]>([]);

    // Selection states
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupportFunction | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [manualSlot, setManualSlot] = useState<string>('current');
    const [currentTimeSlot, setCurrentTimeSlot] = useState<CurrentSlot | null>(null);
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);

    // Production tracking states
    const [styleDetails, setStyleDetails] = useState<{
        target: number;
        outputs: number[];
        balance: number;
    }>({
        target: 0,
        outputs: [],
        balance: 0,
    });

    // Modal states
    const [isBoardLoaded, setIsBoardLoaded] = useState(false);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isMachineDowntimeModalOpen, setIsMachineDowntimeModalOpen] = useState(false);
    const [isStyleChangeModalOpen, setIsStyleChangeModalOpen] = useState(false);
    const [selectedDowntimeType, setSelectedDowntimeType] = useState<DowntimeType | null>(null);

    // Tracking states
    const [currentTime, setCurrentTime] = useState(new Date());
    const [rejectCount, setRejectCount] = useState(0);
    const [reworkCount, setReworkCount] = useState(0);
    const [rejects, setRejects] = useState<RejectRecord[]>([]);
    const [reworks, setReworks] = useState<ReworkItem[]>([]);
    const [downtimes, setDowntimes] = useState<Downtime[]>([]);
    const [error, setError] = useState<string>('');

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    linesSnapshot,
                    supportSnapshot,
                    stylesSnapshot,
                    timeTablesSnapshot,
                    breaksSnapshot,
                    downtimeCatSnapshot
                ] = await Promise.all([
                    getDocs(collection(db, 'productionLines')),
                    getDocs(collection(db, 'supportFunctions')),
                    getDocs(collection(db, 'styles')),
                    getDocs(collection(db, 'timeTables')),
                    getDocs(collection(db, 'breaks')),
                    getDocs(collection(db, 'downtimeCategories'))
                ]);

                setProductionLines(linesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProductionLine)));

                const supportData = supportSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction));

                setSupervisors(supportData.filter(sf => sf.role === 'Supervisor'));
                setMechanics(supportData.filter(sf => sf.role === 'Mechanic'));
                setQcs(supportData.filter(sf => sf.role === 'QC'));

                setStyles(stylesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Style)));

                setTimeTables(timeTablesSnapshot.docs.map(doc => ({
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

                setBreaks(breaksSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Break)));

                setDowntimeCategories(downtimeCatSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as DowntimeCategory)));

            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load data. Please try again.');
            }
        };

        fetchData();

        // Update current time and time slot
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
    // Production tracking functions
    const handleAddOutput = async () => {
        if (!assignedTimeTable || !sessionId) {
            setError('Production tracking not properly initialized.');
            return;
        }

        try {
            let selectedSlotId: string;
            let slotToUse: TimeTable['slots'][0];

            // Determine which slot to use for recording output
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

            // Record production in Firestore
            await addDoc(collection(db, 'production'), {
                sessionId,
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor?.id,
                styleId: selectedStyle?.id,
                timeSlot: selectedSlotId,
                unitsProduced: 1,
                timestamp: Timestamp.fromDate(new Date()),
                createdAt: Timestamp.fromDate(new Date()),
            });

            // Update local state
            const slotIndex = assignedTimeTable.slots.findIndex(
                (slot) => slot.id === selectedSlotId
            );

            if (slotIndex !== -1) {
                const updatedOutputs = [...styleDetails.outputs];
                updatedOutputs[slotIndex] += 1;
                const newBalance = styleDetails.balance - 1;

                setStyleDetails(prev => ({
                    ...prev,
                    outputs: updatedOutputs,
                    balance: newBalance,
                }));
            }
        } catch (error) {
            console.error('Error recording production:', error);
            setError(error instanceof Error ? error.message : 'Failed to record production.');
        }
    };

    // Efficiency calculations
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

    // Rework handling
    const handleReworkSubmit = async (formData: ReworkFormData): Promise<void> => {
        try {
            if (!selectedLineId || !selectedSupervisor) {
                throw new Error('Line and supervisor must be selected');
            }

            const newRework: ReworkItem = {
                docId: '',  // Will be set after document creation
                count: formData.count,
                reason: formData.reason,
                operation: formData.operation,
                startTime: Timestamp.now(),
                status: 'Booked Out' as const,
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                qcId: formData.qcId,
                comments: formData.comments,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'reworks'), {
                ...newRework,
                docId: undefined // Remove docId for Firestore
            });

            const reworkWithId: ReworkItem = {
                ...newRework,
                docId: docRef.id
            };

            setReworks(prev => [...prev, reworkWithId]);
            setReworkCount(prev => prev + formData.count);
            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error submitting rework:', error);
            setError(error instanceof Error ? error.message : 'Failed to submit rework.');
        }
    };

    // Reject handling
    const handleRejectSubmit = async (formData: RejectFormData): Promise<void> => {
        try {
            if (!selectedLineId || !selectedSupervisor) {
                throw new Error('Line and supervisor must be selected');
            }

            const newReject: RejectRecord = {
                docId: '',  // Will be set after document creation
                count: formData.count,
                reason: formData.reason,
                operation: formData.operation,
                recordedAsProduced: formData.recordedAsProduced,
                qcApprovedBy: '',
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                comments: formData.comments,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, 'rejects'), {
                ...newReject,
                docId: undefined // Remove docId for Firestore
            });

            const rejectWithId: RejectRecord = {
                ...newReject,
                docId: docRef.id
            };

            setRejects(prev => [...prev, rejectWithId]);
            setRejectCount(prev => prev + formData.count);

            // Adjust production count if needed
            if (formData.recordedAsProduced) {
                const slotId = manualSlot === 'current' ? currentTimeSlot?.id : manualSlot;
                if (slotId) {
                    const slotIndex = assignedTimeTable?.slots.findIndex(
                        slot => slot.id === slotId
                    );

                    if (slotIndex !== undefined && slotIndex !== -1) {
                        const updatedOutputs = [...styleDetails.outputs];
                        updatedOutputs[slotIndex] -= formData.count;
                        setStyleDetails(prev => ({ ...prev, outputs: updatedOutputs }));
                    }
                }
            }

            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error submitting reject:', error);
            setError(error instanceof Error ? error.message : 'Failed to submit reject.');
        }
    };
    // Downtime handling
    const handleDowntimeSelection = (type: DowntimeType) => {
        setSelectedDowntimeType(type);
        switch (type) {
            case downtimeTypes.MACHINE:
                setIsMachineDowntimeModalOpen(true);
                break;
            case downtimeTypes.STYLE_CHANGE:
                setIsStyleChangeModalOpen(true);
                break;
            case downtimeTypes.OTHER:
                setError('Please select a specific downtime category.');
                break;
            default:
                setError('Invalid downtime type selected.');
        }
    };

    const handleMachineDowntimeSubmit = async (machineData: MachineFormData): Promise<void> => {
        try {
            if (!sessionId || !selectedLineId || !selectedSupervisor) {
                throw new Error('Session or required data not initialized.');
            }

            const downtimeDoc = {
                ...machineData,
                type: downtimeTypes.MACHINE,
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await addDoc(collection(db, 'downtimes'), downtimeDoc);
            await refreshDowntimes();
            setIsMachineDowntimeModalOpen(false);
            setSelectedDowntimeType(null);

        } catch (error) {
            console.error('Error submitting machine downtime:', error);
            setError(error instanceof Error ? error.message : 'Failed to submit machine downtime.');
        }
    };

    const handleStyleChangeSubmit = async (styleChangeData: StyleChangeoverFormData): Promise<void> => {
        try {
            if (!sessionId || !selectedLineId || !selectedSupervisor) {
                throw new Error('Session or required data not initialized.');
            }

            const downtimeDoc = {
                ...styleChangeData,
                type: downtimeTypes.STYLE_CHANGE,
                productionLineId: selectedLineId,
                supervisorId: selectedSupervisor.id,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            await addDoc(collection(db, 'downtimes'), downtimeDoc);
            await refreshDowntimes();
            setIsStyleChangeModalOpen(false);
            setSelectedDowntimeType(null);

        } catch (error) {
            console.error('Error submitting style change:', error);
            setError(error instanceof Error ? error.message : 'Failed to submit style change.');
        }
    };

    const refreshDowntimes = async () => {
        try {
            const downtimesSnapshot = await getDocs(
                query(
                    collection(db, 'downtimes'),
                    where('productionLineId', '==', selectedLineId),
                    where('status', '!=', 'Closed')
                )
            );

            setDowntimes(downtimesSnapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data()
            } as Downtime)));
        } catch (error) {
            console.error('Error refreshing downtimes:', error);
            setError('Failed to refresh downtimes list.');
        }
    };

    // Board initialization
    const handleLoadBoard = async () => {
        if (!selectedLine || !selectedSupervisor || !selectedStyle) {
            setError('Please select a line, supervisor, and style.');
            return;
        }

        try {
            const selectedTimeTable = timeTables.find(tt => tt.lineId === selectedLineId) ||
                timeTables.find(tt => tt.name === selectedLine) ||
                timeTables[0];

            if (!selectedTimeTable) {
                throw new Error('No Time Table found for the selected line.');
            }

            // Create active session
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

            // Initialize board state
            setAssignedTimeTable(selectedTimeTable);
            setStyleDetails({
                target: 0,
                outputs: Array(selectedTimeTable.slots.length).fill(0),
                balance: selectedStyle.unitsInOrder,
            });

            if (manualSlot === 'current') {
                updateCurrentTimeSlot(new Date());
            }

            setIsBoardLoaded(true);
            setIsStyleModalOpen(true);
            await refreshDowntimes();

        } catch (error) {
            console.error('Error initializing board:', error);
            setError(error instanceof Error ? error.message : 'Failed to initialize board.');
        }
    };

    // Handle style confirmation
    const handleConfirmStyle = (target: number) => {
        if (target <= 0) {
            setError('Target must be a positive number.');
            return;
        }

        setStyleDetails(prev => ({
            ...prev,
            target: target,
        }));
        setIsStyleModalOpen(false);
    };

    // Handle end of shift
    const handleEndShift = async () => {
        if (!window.confirm('Are you sure you want to end the shift?')) {
            return;
        }

        try {
            if (sessionId) {
                await updateDoc(doc(db, 'activeSessions', sessionId), {
                    isActive: false,
                    endTime: Timestamp.fromDate(new Date()),
                    updatedAt: Timestamp.fromDate(new Date()),
                });

                const openDowntimes = downtimes.filter(dt => dt.status === 'Open');
                for (const downtime of openDowntimes) {
                    await updateDoc(doc(db, 'downtimes', downtime.docId), {
                        status: 'Closed',
                        endTime: Timestamp.fromDate(new Date()),
                        updatedAt: Timestamp.fromDate(new Date()),
                    });
                }
            }

            // Reset states
            setIsBoardLoaded(false);
            setAssignedTimeTable(null);
            setStyleDetails({
                target: 0,
                outputs: [],
                balance: 0,
            });
            setManualSlot('current');
            setSessionId(null);
            setDowntimes([]);
            setCurrentTimeSlot(null);
            setSelectedDowntimeType(null);

        } catch (error) {
            console.error('Error ending shift:', error);
            setError('Failed to end shift properly.');
        }
    };
    return (
        <div className="active-line-container">
            {!isBoardLoaded ? (
                // Initial Setup View
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
                            value={selectedStyle?.styleNumber || ''}
                            onChange={(e) => {
                                const style = styles.find(s => s.styleNumber === e.target.value);
                                setSelectedStyle(style || null);
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
                // Active Production Board View
                <div className="input-display">
                    {/* Header Section */}
                    <div className="board-header">
                        <div className="clock-display">
                            <span className="time">{currentTime.toLocaleTimeString()}</span>
                            <span className="date">{currentTime.toLocaleDateString()}</span>
                        </div>
                        <div className="board-info">
                            <h2>{selectedLine} - {selectedSupervisor?.name}</h2>
                            <h3>Style: {selectedStyle?.styleNumber}</h3>
                        </div>
                        <button className="end-shift-button" onClick={handleEndShift}>
                            End Shift
                        </button>
                    </div>

                    {/* Main Content Grid */}
                    <div className="board-content">
                        {/* Left Section - Production Tracking */}
                        <div className="left-section">
                            {/* Time Slot Selection */}
                            <div className="slot-selection">
                                <label>
                                    Select Time Slot:
                                    <select
                                        value={manualSlot}
                                        onChange={(e) => setManualSlot(e.target.value)}
                                    >
                                        <option value="current">Current Time (Real-time)</option>
                                        {assignedTimeTable?.slots.map((slot, index) => (
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
                            )}
                        </div>

                        {/* Right Section - Monitoring */}
                        <div className="right-section">
                            {/* Style Details */}
                            <div className="style-details">
                                <h3>Style Information</h3>
                                <p>Description: {selectedStyle?.description}</p>
                                <p>Units in Order: {selectedStyle?.unitsInOrder}</p>
                                <p>Balance: {styleDetails.balance}</p>
                            </div>

                            {/* Rejects and Reworks Counters */}
                            <div className="counters">
                                <div className="counter reject-counter">
                                    <label>Rejects</label>
                                    <span>{rejectCount}</span>
                                </div>
                                <div className="counter rework-counter">
                                    <label>Reworks</label>
                                    <span>{reworkCount}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="buttons-box">
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
                                <button
                                    className="button downtime-button"
                                    onClick={() => handleDowntimeSelection(downtimeTypes.MACHINE)}
                                >
                                    Machine
                                </button>
                                <button
                                    className="button downtime-button"
                                    onClick={() => handleDowntimeSelection(downtimeTypes.STYLE_CHANGE)}
                                >
                                    Style Change
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isReworkModalOpen && (
                <Rework
                    onClose={() => setIsReworkModalOpen(false)}
                    onSubmit={handleReworkSubmit}
                    productionLineId={selectedLineId}
                    supervisorId={selectedSupervisor?.id || ''}
                    qcs={qcs}
                />
            )}

            {isRejectModalOpen && (
                <Reject
                    onClose={() => setIsRejectModalOpen(false)}
                    onSubmit={handleRejectSubmit}
                    productionLineId={selectedLineId}
                    supervisorId={selectedSupervisor?.id || ''}
                    qcs={qcs}
                />
            )}

            {isMachineDowntimeModalOpen && (
                <Machine
                    onClose={() => {
                        setIsMachineDowntimeModalOpen(false);
                        setSelectedDowntimeType(null);
                    }}
                    onSubmit={handleMachineDowntimeSubmit}
                    productionLineId={selectedLineId}
                    supervisorId={selectedSupervisor?.id || ''}
                    mechanics={mechanics}
                />
            )}

            {isStyleChangeModalOpen && (
                <StyleChange
                    onClose={() => {
                        setIsStyleChangeModalOpen(false);
                        setSelectedDowntimeType(null);
                    }}
                    onSubmit={handleStyleChangeSubmit}
                    productionLineId={selectedLineId}
                    supervisorId={selectedSupervisor?.id || ''}
                />
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

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}
        </div>
    );
};

export default ActiveLineInput;