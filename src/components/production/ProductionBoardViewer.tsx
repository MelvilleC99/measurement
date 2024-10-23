import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    BasicInfo,
    TimeTable,
    SupportFunction,
    ReworkItem,
    Reject,
    Downtime,
    DowntimeCategory,
    Measurement,
    TimeSlot
} from '../../types';
import './ProductionBoardViewer.css';

interface SessionData {
    id: string;
    basicInfo: BasicInfo;
    supervisorId: string;
    supervisor?: SupportFunction;
    startTime: Timestamp;
    isActive: boolean;
}

interface ProductionData {
    measurements: Measurement[];
    rejects: Reject[];
    reworks: ReworkItem[];
    downtimes: Downtime[];
    totalRejects: number;
    totalReworks: number;
    activeDowntimes: number;
}

const ProductionBoardViewer: React.FC = () => {
    // Active sessions and selection state
    const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Production data state
    const [productionData, setProductionData] = useState<ProductionData>({
        measurements: [],
        rejects: [],
        reworks: [],
        downtimes: [],
        totalRejects: 0,
        totalReworks: 0,
        activeDowntimes: 0
    });

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Set up clock
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Set up active sessions listener
        const sessionsQuery = query(
            collection(db, 'activeSessions'),
            where('isActive', '==', true)
        );

        const unsubscribeSessions = onSnapshot(sessionsQuery, async (snapshot) => {
            try {
                const sessionsData: SessionData[] = [];

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    // Fetch supervisor details
                    if (data.supervisorId) {
                        const supervisorDoc = await getDocs(
                            query(
                                collection(db, 'supportFunctions'),
                                where('id', '==', data.supervisorId)
                            )
                        );
                        const supervisor = supervisorDoc.docs[0]?.data() as SupportFunction;

                        sessionsData.push({
                            id: doc.id,
                            basicInfo: data.basicInfo,
                            supervisorId: data.supervisorId,
                            supervisor,
                            startTime: data.startTime,
                            isActive: data.isActive
                        });
                    }
                }

                setActiveSessions(sessionsData);
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching sessions:', err);
                setError('Failed to load active sessions');
                setIsLoading(false);
            }
        });

        return () => {
            clearInterval(clockInterval);
            unsubscribeSessions();
        };
    }, []);

    useEffect(() => {
        if (selectedSession) {
            setupSessionListeners(selectedSession.id);
        }
    }, [selectedSession]);

    const setupSessionListeners = (sessionId: string) => {
        // Set up listeners for measurements
        const measurementsQuery = query(
            collection(db, 'measurements'),
            where('sessionId', '==', sessionId)
        );

        // Set up listeners for rejects
        const rejectsQuery = query(
            collection(db, 'rejects'),
            where('sessionId', '==', sessionId)
        );

        // Set up listeners for reworks
        const reworksQuery = query(
            collection(db, 'reworks'),
            where('sessionId', '==', sessionId)
        );

        // Set up listeners for downtimes
        const downtimesQuery = query(
            collection(db, 'downtimes'),
            where('sessionId', '==', sessionId)
        );

        const unsubscribeMeasurements = onSnapshot(measurementsQuery, (snapshot) => {
            const measurements = snapshot.docs.map(doc => doc.data() as Measurement);
            setProductionData(prev => ({ ...prev, measurements }));
        });

        const unsubscribeRejects = onSnapshot(rejectsQuery, (snapshot) => {
            const rejects = snapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data()
            })) as Reject[];
            const totalRejects = rejects.reduce((sum, r) => sum + r.count, 0);
            setProductionData(prev => ({ ...prev, rejects, totalRejects }));
        });

        const unsubscribeReworks = onSnapshot(reworksQuery, (snapshot) => {
            const reworks = snapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data()
            })) as ReworkItem[];
            const totalReworks = reworks.reduce((sum, r) => sum + r.count, 0);
            setProductionData(prev => ({ ...prev, reworks, totalReworks }));
        });

        const unsubscribeDowntimes = onSnapshot(downtimesQuery, (snapshot) => {
            const downtimes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Downtime[];
            const activeDowntimes = downtimes.filter(d => d.status === 'Open').length;
            setProductionData(prev => ({ ...prev, downtimes, activeDowntimes }));
        });

        return () => {
            unsubscribeMeasurements();
            unsubscribeRejects();
            unsubscribeReworks();
            unsubscribeDowntimes();
        };
    };

    const calculateEfficiency = (output: number, target: number): string => {
        if (!target) return '0.0%';
        return ((output / target) * 100).toFixed(1) + '%';
    };

    const calculateCumulativeEfficiency = (measurements: Measurement[]): string => {
        const totalOutput = measurements.reduce((sum, m) => sum + m.output, 0);
        const totalTarget = measurements.reduce((sum, m) => sum + m.target, 0);
        return calculateEfficiency(totalOutput, totalTarget);
    };
    if (isLoading) {
        return (
            <div className="loading-container">
                <h2>Loading production boards...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Error: {error}</h2>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    if (!selectedSession) {
        return (
            <div className="active-lines-selection">
                <h1>Active Production Lines</h1>
                <div className="lines-grid">
                    {activeSessions.map(session => (
                        <div
                            key={session.id}
                            className="line-card"
                            onClick={() => setSelectedSession(session)}
                        >
                            <h2>Line: {session.basicInfo.lineName}</h2>
                            <div className="line-details">
                                <p>Product: {session.basicInfo.productName}</p>
                                <p>Reference: {session.basicInfo.productReference}</p>
                                <p>Target: {session.basicInfo.hourlyTarget} units/hour</p>
                                <p>Supervisor: {session.supervisor?.name} {session.supervisor?.surname}</p>
                                <p>Started: {session.startTime.toDate().toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="production-board-container">
            <div className="board-header">
                <div className="header-left">
                    <div className="time-display">
                        <span className="current-time">{currentTime.toLocaleTimeString()}</span>
                        <span className="current-date">{currentTime.toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="header-center">
                    <h1>{selectedSession.basicInfo.lineName} - Production Board</h1>
                    <p className="supervisor-info">
                        Supervisor: {selectedSession.supervisor?.name} {selectedSession.supervisor?.surname}
                    </p>
                </div>

                <div className="header-right">
                    <button
                        className="change-line-button"
                        onClick={() => setSelectedSession(null)}
                    >
                        Change Line
                    </button>
                </div>
            </div>

            <div className="board-content">
                <div className="left-panel">
                    <div className="production-table">
                        <table>
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
                            {productionData.measurements.map((measurement, index) => {
                                const cumulativeEfficiency = calculateCumulativeEfficiency(
                                    productionData.measurements.slice(0, index + 1)
                                );

                                return (
                                    <tr key={measurement.hour}>
                                        <td>Hour {index + 1}</td>
                                        <td>{measurement.hour}</td>
                                        <td>{measurement.target}</td>
                                        <td>{measurement.output}</td>
                                        <td>{calculateEfficiency(measurement.output, measurement.target)}</td>
                                        <td>{cumulativeEfficiency}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="product-info panel">
                        <h3>Product Information</h3>
                        <div className="info-content">
                            <p><strong>Name:</strong> {selectedSession.basicInfo.productName}</p>
                            <p><strong>Reference:</strong> {selectedSession.basicInfo.productReference}</p>
                            <p><strong>Description:</strong> {selectedSession.basicInfo.productDescription}</p>
                            <p><strong>Units in Order:</strong> {selectedSession.basicInfo.unitsInOrder}</p>
                            <p><strong>Delivery Date:</strong> {selectedSession.basicInfo.deliveryDate}</p>
                            <p><strong>Target:</strong> {selectedSession.basicInfo.hourlyTarget} units/hour</p>
                            <p><strong>Breakeven:</strong> {selectedSession.basicInfo.breakevenTarget} units/hour</p>
                        </div>
                    </div>

                    <div className="statistics panel">
                        <h3>Production Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <label>Total Output:</label>
                                <span>
                                    {productionData.measurements.reduce((sum, m) => sum + m.output, 0)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <label>Total Rejects:</label>
                                <span>{productionData.totalRejects}</span>
                            </div>
                            <div className="stat-item">
                                <label>Total Reworks:</label>
                                <span>{productionData.totalReworks}</span>
                            </div>
                            <div className="stat-item">
                                <label>Overall Efficiency:</label>
                                <span>
                                    {calculateCumulativeEfficiency(productionData.measurements)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="active-issues panel">
                        <h3>Active Issues</h3>
                        <div className="downtimes-list">
                            {productionData.downtimes
                                .filter(d => d.status === 'Open')
                                .map(downtime => (
                                    <div key={downtime.id} className="downtime-item">
                                        <p><strong>Category:</strong> {downtime.category}</p>
                                        <p><strong>Reason:</strong> {downtime.reason}</p>
                                        <p><strong>Started:</strong> {downtime.startTime.toDate().toLocaleTimeString()}</p>
                                        <p><strong>Duration:</strong> {
                                            Math.floor(
                                                (currentTime.getTime() - downtime.startTime.toDate().getTime()) / 60000
                                            )
                                        } minutes</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionBoardViewer;