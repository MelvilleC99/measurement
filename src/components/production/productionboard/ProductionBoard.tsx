import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    getDocs,
    query,
    where,
    getDoc
} from 'firebase/firestore';
import { db } from '../../../firebase';
import LoginManager from '../productionboard/components/LoginManager';
import ProductionTracking from '../productionboard/components/ProductionTracking';
import RecordEvents from '../productionboard/components/RecordEvents';
import DowntimeTracking from '../productionboard/components/DowntimeTracking';
import MetricsCounter from '../productionboard/components/MetricsCounter';
import { SessionData } from '../../../types';
import './ProductionBoard.css';

interface MetricsState {
    rejects: number;
    reworks: number;
    late: number;
    absent: number;
}

interface DetailNames {
    lineName: string;
    supervisorName: string;
    styleName: string;
}

const ProductionBoard: React.FC = () => {
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [detailNames, setDetailNames] = useState<DetailNames>({
        lineName: '',
        supervisorName: '',
        styleName: ''
    });
    const [metrics, setMetrics] = useState<MetricsState>({
        rejects: 0,
        reworks: 0,
        late: 0,
        absent: 0,
    });
    const [error, setError] = useState<string>('');

    // Fetch actual names when session data changes
    useEffect(() => {
        const fetchNames = async () => {
            if (!sessionData) return;

            try {
                const [lineDoc, supervisorDoc, styleDoc] = await Promise.all([
                    getDoc(doc(db, 'productionLines', sessionData.lineId)),
                    getDoc(doc(db, 'supportFunctions', sessionData.supervisorId)),
                    getDoc(doc(db, 'styles', sessionData.styleId))
                ]);

                // Get line name
                const lineName = lineDoc.data()?.name || 'Unknown Line';

                // Get supervisor name
                const supervisorData = supervisorDoc.data();
                const supervisorName = supervisorData ?
                    `${supervisorData.name} ${supervisorData.surname} (${supervisorData.employeeNumber})` :
                    'Unknown Supervisor';

                // Get style name
                const styleData = styleDoc.data();
                const styleName = styleData ?
                    `${styleData.styleNumber} - ${styleData.styleName}` :
                    'Unknown Style';

                setDetailNames({
                    lineName,
                    supervisorName,
                    styleName
                });
            } catch (err) {
                console.error('Error fetching names:', err);
                setError('Failed to load detail names');
            }
        };

        fetchNames();
    }, [sessionData]);

    const handleUnitProduced = async (slotId: string) => {
        if (!sessionData) return;
        try {
            await addDoc(collection(db, 'production'), {
                sessionId: sessionData.sessionId,
                slotId,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
            });
            console.log('Production unit recorded for slot:', slotId);
        } catch (error) {
            setError('Failed to record production');
            console.error('Error recording production:', error);
        }
    };

    const handleLoginSuccess = (newSession: SessionData) => {
        console.log('handleLoginSuccess called with:', newSession);
        setSessionData(newSession);
    };

    const handleEventRecorded = (eventType: keyof MetricsState, count: number) => {
        setMetrics((prev) => ({
            ...prev,
            [eventType]: prev[eventType] + count,
        }));
        console.log(`Event recorded: ${eventType} += ${count}`);
    };

    const handleEndShift = async () => {
        if (!window.confirm('Are you sure you want to end the shift?')) {
            return;
        }

        try {
            if (sessionData) {
                await updateDoc(doc(db, 'activeSessions', sessionData.sessionId), {
                    isActive: false,
                    endTime: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                console.log('Session ended:', sessionData.sessionId);

                const downtimesQuery = query(
                    collection(db, 'downtimes'),
                    where('sessionId', '==', sessionData.sessionId),
                    where('status', '==', 'Open')
                );

                const downtimesSnapshot = await getDocs(downtimesQuery);
                const closePromises = downtimesSnapshot.docs.map((docSnap) =>
                    updateDoc(doc(db, 'downtimes', docSnap.id), {
                        status: 'Closed',
                        endTime: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    })
                );

                await Promise.all(closePromises);
                console.log('Closed all active downtimes for session:', sessionData.sessionId);
            }

            setSessionData(null);
            setMetrics({
                rejects: 0,
                reworks: 0,
                late: 0,
                absent: 0,
            });
            console.log('Shift ended and state reset');
        } catch (error) {
            console.error('Error ending shift:', error);
            setError('Failed to end shift');
        }
    };

    return (
        <div className="board-container">
            {!sessionData ? (
                <LoginManager onLoginSuccess={handleLoginSuccess} />
            ) : (
                <div className="board-content">
                    {/* Heading Banner */}
                    <div className="heading-banner">
                        <div className="heading-left">
                            <h1>Production Dashboard</h1>
                            <div className="heading-details">
                                <p>Date: {new Date().toLocaleDateString()}</p>
                                <p>Time: {new Date().toLocaleTimeString()}</p>
                                <p>Line: {detailNames.lineName}</p>
                                <p>Supervisor: {detailNames.supervisorName}</p>
                                <p>Style: {detailNames.styleName}</p>
                            </div>
                        </div>
                        <div className="heading-right">
                            <div className="target-info">
                                <p>Target Units per Hour: {sessionData.target}</p>
                            </div>
                            <button
                                className="end-shift-button"
                                onClick={handleEndShift}
                            >
                                End Shift
                            </button>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="main-grid">
                        {/* Left Side - Production Tracking */}
                        <div className="left-panel">
                            <ProductionTracking
                                sessionData={sessionData}
                                onUnitProduced={handleUnitProduced}
                                setSessionData={setSessionData}
                                selectedLineId={sessionData.lineId}
                                selectedSupervisorId={sessionData.supervisorId}
                            />
                        </div>

                        {/* Right Side - Monitoring Panels */}
                        <div className="right-panel">
                            <div className="monitoring-panel">
                                <MetricsCounter
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    supervisorId={sessionData.supervisorId}
                                />
                            </div>

                            <div className="monitoring-panel">
                                <DowntimeTracking
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    userRole="Supervisor"
                                    userId={sessionData.supervisorId}
                                />
                            </div>

                            <div className="monitoring-panel">
                                <RecordEvents
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    supervisorId={sessionData.supervisorId}
                                    onEventRecorded={handleEventRecorded}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                            <button onClick={() => setError('')}>✕</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductionBoard;