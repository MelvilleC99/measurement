// ProductionBoardViewer.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import './ProductionBoardViewer.css';

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

interface ActiveSession {
    id: string;
    productionLineId: string;
    supervisorId: string;
    styleId: string;
    startTime: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    hourlyTarget: number;
}

interface ProductionData {
    id: string;
    sessionId: string;
    productionLineId: string;
    supervisorId: string;
    styleId: string;
    date: Date;
    timeSlot: string;
    unitsProduced: number;
    breakId?: string | null;
}

interface Reject {
    id: string;
    sessionId: string;
    productionLineId: string;
    supervisorId: string;
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
    timestamp: Date;
}

interface ReworkItem {
    id: string;
    sessionId: string;
    productionLineId: string;
    supervisorId: string;
    count: number;
    reason: string;
    operation: string;
    startTime: Date;
    endTime?: Date;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
}

interface DowntimeItem {
    id: string;
    sessionId: string;
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

const ProductionBoardViewer: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [productionData, setProductionData] = useState<ProductionData[]>([]);
    const [rejects, setRejects] = useState<Reject[]>([]);
    const [reworks, setReworks] = useState<ReworkItem[]>([]);
    const [downtimes, setDowntimes] = useState<DowntimeItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
    const [assignedTimeTable, setAssignedTimeTable] = useState<TimeTable | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active sessions
                const activeSessionsQuery = query(
                    collection(db, 'activeSessions'),
                    where('isActive', '==', true)
                );
                const activeSessionsSnapshot = await getDocs(activeSessionsQuery);
                const sessionsData: ActiveSession[] = activeSessionsSnapshot.docs.map(
                    (doc) => ({
                        id: doc.id,
                        productionLineId: doc.data().productionLineId,
                        supervisorId: doc.data().supervisorId,
                        styleId: doc.data().styleId,
                        startTime: doc.data().startTime.toDate(),
                        isActive: doc.data().isActive,
                        createdAt: doc.data().createdAt.toDate(),
                        updatedAt: doc.data().updatedAt.toDate(),
                        hourlyTarget: doc.data().hourlyTarget || 0,
                    })
                );
                setActiveSessions(sessionsData);

                // Fetch production lines
                const linesSnapshot = await getDocs(collection(db, 'productionLines'));
                const linesData: ProductionLine[] = linesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name,
                    description: doc.data().description,
                }));
                setProductionLines(linesData);

                // Fetch supervisors
                const supervisorsSnapshot = await getDocs(collection(db, 'supportFunctions'));
                const supervisorsData: SupportFunction[] = supervisorsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    employeeNumber: doc.data().employeeNumber,
                    role: doc.data().role,
                    hasPassword: doc.data().hasPassword,
                    password: doc.data().password,
                }));
                setSupervisors(supervisorsData);

                // Fetch styles
                const stylesSnapshot = await getDocs(collection(db, 'styles'));
                const stylesData: Style[] = stylesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    styleNumber: doc.data().styleNumber,
                    styleName: doc.data().styleName,
                    description: doc.data().description,
                    unitsInOrder: doc.data().unitsInOrder,
                    deliveryDate: doc.data().deliveryDate,
                }));
                setStyles(stylesData);

                // Fetch time tables
                const timeTablesSnapshot = await getDocs(collection(db, 'timeTables'));
                const fetchedTimeTables: TimeTable[] = timeTablesSnapshot.docs.map((doc) => {
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

                // Fetch production data
                const productionSnapshot = await getDocs(collection(db, 'production'));
                const productionData: ProductionData[] = productionSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    sessionId: doc.data().sessionId,
                    productionLineId: doc.data().productionLineId,
                    supervisorId: doc.data().supervisorId,
                    styleId: doc.data().styleId,
                    date: doc.data().date.toDate(),
                    timeSlot: doc.data().timeSlot,
                    unitsProduced: doc.data().unitsProduced,
                    breakId: doc.data().breakId || null,
                }));
                setProductionData(productionData);

                // Fetch rejects
                const rejectsSnapshot = await getDocs(collection(db, 'rejects'));
                const rejectsData: Reject[] = rejectsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    sessionId: doc.data().sessionId,
                    productionLineId: doc.data().productionLineId,
                    supervisorId: doc.data().supervisorId,
                    count: doc.data().count,
                    reason: doc.data().reason,
                    recordedAsProduced: doc.data().recordedAsProduced,
                    qcApprovedBy: doc.data().qcApprovedBy,
                    timestamp: doc.data().timestamp.toDate(),
                }));
                setRejects(rejectsData);

                // Fetch reworks
                const reworksSnapshot = await getDocs(collection(db, 'reworks'));
                const reworksData: ReworkItem[] = reworksSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    sessionId: doc.data().sessionId,
                    productionLineId: doc.data().productionLineId,
                    supervisorId: doc.data().supervisorId,
                    count: doc.data().count,
                    reason: doc.data().reason,
                    operation: doc.data().operation,
                    startTime: doc.data().startTime.toDate(),
                    endTime: doc.data().endTime ? doc.data().endTime.toDate() : undefined,
                    status: doc.data().status,
                }));
                setReworks(reworksData);

                // Fetch downtimes
                const downtimesSnapshot = await getDocs(collection(db, 'downtimes'));
                const downtimesData: DowntimeItem[] = downtimesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    sessionId: doc.data().sessionId,
                    productionLineId: doc.data().productionLineId,
                    supervisorId: doc.data().supervisorId,
                    mechanicId: doc.data().mechanicId,
                    startTime: doc.data().startTime.toDate(),
                    mechanicReceivedTime: doc.data().mechanicReceivedTime
                        ? doc.data().mechanicReceivedTime.toDate()
                        : undefined,
                    endTime: doc.data().endTime ? doc.data().endTime.toDate() : undefined,
                    category: doc.data().category,
                    reason: doc.data().reason,
                    status: doc.data().status,
                    createdAt: doc.data().createdAt.toDate(),
                    updatedAt: doc.data().updatedAt.toDate(),
                }));
                setDowntimes(downtimesData);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('Failed to load data. Please try again.');
                setLoading(false);
            }
        };

        fetchData();

        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Helper functions
    const getLineName = (lineId: string): string => {
        const line = productionLines.find((l) => l.id === lineId);
        return line ? line.name : 'Unknown Line';
    };

    const getSupervisorName = (supervisorId: string): string => {
        const supervisor = supervisors.find((s) => s.id === supervisorId);
        return supervisor ? `${supervisor.name} ${supervisor.surname}` : 'Unknown Supervisor';
    };

    const getStyleInfo = (styleId: string): {
        styleNumber: string;
        styleName: string;
        description: string;
        unitsInOrder: number;
        deliveryDate: string;
    } => {
        const style = styles.find((s) => s.id === styleId);
        return style
            ? {
                styleNumber: style.styleNumber,
                styleName: style.styleName,
                description: style.description,
                unitsInOrder: style.unitsInOrder,
                deliveryDate: style.deliveryDate,
            }
            : {
                styleNumber: 'Unknown',
                styleName: 'Unknown',
                description: '',
                unitsInOrder: 0,
                deliveryDate: '',
            };
    };

    const calculateOutputs = (sessionId: string, slots: TimeSlot[]): number[] => {
        const sessionProduction = productionData.filter((p) => p.sessionId === sessionId);

        const outputs = slots.map((slot) => {
            const slotProduction = sessionProduction.filter((p) => p.timeSlot === slot.id);
            return slotProduction.reduce((sum, p) => sum + p.unitsProduced, 0);
        });

        return outputs;
    };

    // Calculate target per time slot
    const calculateTargetPerSlot = (slot: TimeSlot, hourlyTarget: number): number => {
        if (slot.breakId) {
            const breakDuration =
                breaks.find((b) => b.id === slot.breakId)?.duration || 0;
            return Math.ceil((hourlyTarget / 60) * (60 - breakDuration));
        } else {
            return hourlyTarget;
        }
    };

    // Calculate efficiency
    const calculateEfficiency = (output: number, target: number): string => {
        return target ? ((output / target) * 100).toFixed(2) + '%' : 'N/A';
    };

    // Calculate cumulative efficiency
    const calculateCumulativeEfficiency = (outputs: number[], targets: number[], upToIndex: number): string => {
        let totalOutput = 0;
        let totalTarget = 0;

        for (let i = 0; i <= upToIndex; i++) {
            totalOutput += outputs[i];
            totalTarget += targets[i];
        }

        return totalTarget
            ? ((totalOutput / totalTarget) * 100).toFixed(2) + '%'
            : 'N/A';
    };

    const handleSelectLine = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lineId = e.target.value;
        setSelectedLineId(lineId);

        const session = activeSessions.find((s) => s.productionLineId === lineId);
        setSelectedSession(session || null);

        if (session) {
            const timeTable =
                timeTables.find((tt) => tt.lineId === session.productionLineId) ||
                timeTables.find((tt) => tt.name === getLineName(session.productionLineId)) ||
                timeTables[0]; // Default to the first time table if no match is found

            setAssignedTimeTable(timeTable || null);
        } else {
            setAssignedTimeTable(null);
        }
    };

    return (
        <div className="production-board-viewer">
            <h1>Production Board Viewer</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <>
                    <label>
                        Select Line:
                        <select value={selectedLineId} onChange={handleSelectLine}>
                            <option value="">Select a Line</option>
                            {activeSessions.map((session) => {
                                const lineName = getLineName(session.productionLineId);
                                return (
                                    <option key={session.productionLineId} value={session.productionLineId}>
                                        {lineName}
                                    </option>
                                );
                            })}
                        </select>
                    </label>

                    {selectedSession && assignedTimeTable && (
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
                                        {getLineName(selectedSession.productionLineId)} - Supervisor: {getSupervisorName(selectedSession.supervisorId)} - Style Number: {getStyleInfo(selectedSession.styleId).styleNumber}
                                    </h2>
                                </div>
                                <div className="right-section">
                                    {/* No End Shift button */}
                                </div>
                            </div>

                            <div className="main-content">
                                <div className="left-content">
                                    {/* No Slot Selection and Unit Produced button */}

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

                                                const targetPerSlot = calculateTargetPerSlot(slot, selectedSession.hourlyTarget);
                                                const outputs = calculateOutputs(selectedSession.id, assignedTimeTable.slots);
                                                const output = outputs[index];

                                                const targets = assignedTimeTable.slots.map((slt) => calculateTargetPerSlot(slt, selectedSession.hourlyTarget));

                                                return (
                                                    <tr key={slot.id}>
                                                        <td>Hour {index + 1}</td>
                                                        <td>
                                                            {slot.startTime} - {slot.endTime}
                                                            {breakInfo && (
                                                                <span className="break-indicator">
                                    {' '}
                                                                    (Break: {breakInfo.breakType} - {breakInfo.duration} mins)
                                  </span>
                                                            )}
                                                        </td>
                                                        <td>{targetPerSlot}</td>
                                                        <td>{output}</td>
                                                        <td>
                                                            {calculateEfficiency(output, targetPerSlot)}
                                                        </td>
                                                        <td>{calculateCumulativeEfficiency(outputs, targets, index)}</td>
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
                                        {selectedSession && (
                                            <>
                                                <p>
                                                    <strong>Description:</strong> {getStyleInfo(selectedSession.styleId).description}
                                                </p>
                                                <p>
                                                    <strong>Delivery Date:</strong> {getStyleInfo(selectedSession.styleId).deliveryDate}
                                                </p>
                                                <p>
                                                    <strong>Units in Order:</strong> {getStyleInfo(selectedSession.styleId).unitsInOrder}
                                                </p>
                                                {/* You can calculate remaining balance if needed */}
                                            </>
                                        )}
                                    </div>

                                    <div className="rejects-reworks-box">
                                        <h3>Rejects and Reworks</h3>
                                        <div className="counters">
                                            <div className="counter reject-counter">
                                                <p>Total Rejects:</p>
                                                <span>
                          {rejects
                              .filter((r) => r.sessionId === selectedSession.id)
                              .reduce((sum, r) => sum + r.count, 0)}
                        </span>
                                            </div>
                                            <div className="counter rework-counter">
                                                <p>Total Reworks:</p>
                                                <span>
                          {reworks
                              .filter((rw) => rw.sessionId === selectedSession.id)
                              .reduce((sum, rw) => sum + rw.count, 0)}
                        </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="downtime-box">
                                        <h3>Open Downtime Elements</h3>
                                        <div className="downtime-list">
                                            {downtimes
                                                .filter(
                                                    (dt) =>
                                                        dt.sessionId === selectedSession.id &&
                                                        dt.status !== 'Resolved'
                                                )
                                                .map((dt) => (
                                                    <div key={dt.id} className="downtime-item">
                                                        <p>
                                                            <strong>Ref:</strong> {dt.id.slice(-4)}
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

                                    {/* No buttons for Downtime, Reject, Rework */}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductionBoardViewer;
