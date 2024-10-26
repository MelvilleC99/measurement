import React, { useState } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    where,
    query
} from 'firebase/firestore';
import { db } from '../../../firebase';
import ProductionTracking from './components/ProductionTracking';
import RecordEvents from './components/RecordEvents';
import DowntimeTracking from './components/DowntimeTracking';
import MetricsCounter from './components/MetricsCounter';
import './ProductionBoard.css';

export interface SessionData {
    id: string;
    lineId: string;
    supervisorId: string;
    styleId: string;
    startTime: Timestamp;
}

export interface ProductionTrackingProps {
    sessionData: SessionData | null;
    onUnitProduced: (slotId: string) => Promise<void>;
    setSessionData: React.Dispatch<React.SetStateAction<SessionData | null>>;
}

const ProductionBoard: React.FC = () => {
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [metrics, setMetrics] = useState({
        rejects: 0,
        reworks: 0,
        late: 0,
        absent: 0
    });
    const [error, setError] = useState<string>('');

    const handleUnitProduced = async (slotId: string) => {
        if (!sessionData) return;
        try {
            await addDoc(collection(db, 'production'), {
                sessionId: sessionData.id,
                slotId,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now()
            });
        } catch (error) {
            setError('Failed to record production');
            console.error(error);
        }
    };

    const handleEventRecorded = (eventType: 'rejects' | 'reworks' | 'late' | 'absent', count: number) => {
        setMetrics(prev => ({
            ...prev,
            [eventType]: prev[eventType] + count
        }));
    };

    const handleEndShift = async () => {
        if (!window.confirm('Are you sure you want to end the shift?')) {
            return;
        }

        try {
            if (sessionData) {
                await updateDoc(doc(db, 'activeSessions', sessionData.id), {
                    isActive: false,
                    endTime: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });

                // Close any open downtimes
                const downtimesQuery = query(
                    collection(db, 'downtimes'),
                    where('sessionId', '==', sessionData.id),
                    where('status', '==', 'Open')
                );

                const downtimesSnapshot = await getDocs(downtimesQuery);

                const closePromises = downtimesSnapshot.docs.map(doc =>
                    updateDoc(doc.ref, {
                        status: 'Closed',
                        endTime: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    })
                );

                await Promise.all(closePromises);
            }

            setSessionData(null);
            setMetrics({
                rejects: 0,
                reworks: 0,
                late: 0,
                absent: 0
            });
        } catch (error) {
            console.error('Error ending shift:', error);
            setError('Failed to end shift');
        }
    };

    return (
        <div className="board-container">
            <div className="main-section">
                <ProductionTracking
                    sessionData={sessionData}
                    onUnitProduced={handleUnitProduced}
                    setSessionData={setSessionData}
                />
            </div>

            {sessionData && (
                <>
                    <div className="monitoring-section">
                        <div className="section-counters">
                            <MetricsCounter
                                metrics={metrics}
                                sessionId={sessionData.id}
                            />
                        </div>

                        <div className="section-downtimes">
                            <DowntimeTracking
                                sessionId={sessionData.id}
                                lineId={sessionData.lineId}
                            />
                        </div>

                        <div className="section-inputs">
                            <RecordEvents
                                sessionId={sessionData.id}
                                lineId={sessionData.lineId}
                                supervisorId={sessionData.supervisorId}
                                onEventRecorded={handleEventRecorded}
                            />
                        </div>
                    </div>

                    <button
                        className="end-shift-button"
                        onClick={handleEndShift}
                    >
                        End Shift
                    </button>
                </>
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}
        </div>
    );
};

export default ProductionBoard;