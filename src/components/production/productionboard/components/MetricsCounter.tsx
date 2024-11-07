import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '../../../../firebase';
import RejectUpdate from '../../downtime/reject/RejectUpdate';
import ReworkUpdate from '../../downtime/rework/ReworkUpdate';
import AbsentUpdate from '../../downtime/hr/AbsentUpdate';
import LateUpdate from '../../downtime/hr/LateUpdate';
import './MetricsCounter.css';

interface MetricsCounterProps {
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface EventCounts {
    rejects: number;
    reworks: number;
    late: number;
    absent: number;
}

type EventType = 'rejects' | 'reworks' | 'late' | 'absent';
type UpdateModalType = EventType | null;

const MetricsCounter: React.FC<MetricsCounterProps> = ({
                                                           sessionId,
                                                           lineId,
                                                           supervisorId,
                                                       }) => {
    const [counts, setCounts] = useState<EventCounts>({
        rejects: 0,
        reworks: 0,
        late: 0,
        absent: 0,
    });
    const [activeUpdateModal, setActiveUpdateModal] = useState<UpdateModalType>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const fetchCounts = async () => {
        try {
            setError(null);
            const [rejects, reworks, late, absent] = await Promise.all([
                fetchRejectCount(),
                fetchReworkCount(),
                fetchLateCount(),
                fetchAbsentCount(),
            ]);

            setCounts({
                rejects,
                reworks,
                late,
                absent,
            });
        } catch (err) {
            console.error('Error fetching counts:', err);
            setError('Failed to update counts');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRejectCount = async (): Promise<number> => {
        try {
            const rejectsQuery = query(
                collection(db, 'rejects'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            );
            const snapshot = await getDocs(rejectsQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching reject count:', error);
            return 0;
        }
    };

    const fetchReworkCount = async (): Promise<number> => {
        try {
            const reworksQuery = query(
                collection(db, 'reworks'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            );
            const snapshot = await getDocs(reworksQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching rework count:', error);
            return 0;
        }
    };

    const fetchLateCount = async (): Promise<number> => {
        try {
            const lateQuery = query(
                collection(db, 'attendance'),
                where('sessionId', '==', sessionId),
                where('type', '==', 'late'),
                where('status', '==', 'late')
            );
            const snapshot = await getDocs(lateQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching late count:', error);
            return 0;
        }
    };

    const fetchAbsentCount = async (): Promise<number> => {
        try {
            const absentQuery = query(
                collection(db, 'attendance'), // Changed from 'absent' to 'attendance'
                where('sessionId', '==', sessionId),
                where('type', '==', 'absent'), // Added filter for 'type'
                where('status', '==', 'absent') // Added filter for 'status'
            );
            const snapshot = await getDocs(absentQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching absent count:', error);
            return 0;
        }
    };

    const handleCounterClick = (type: EventType) => {
        setActiveUpdateModal(type);
    };

    const handleCloseModal = () => {
        setActiveUpdateModal(null);
        fetchCounts();
    };

    const getCounterClass = (type: EventType): string => {
        switch (type) {
            case 'rejects':
                return 'counter-card counter-reject';
            case 'reworks':
                return 'counter-card counter-rework';
            case 'late':
                return 'counter-card counter-late';
            case 'absent':
                return 'counter-card counter-absent';
            default:
                return 'counter-card';
        }
    };

    if (isLoading) {
        return (
            <div className="metrics-counter">
                <div className="loading-spinner">Loading metrics...</div>
            </div>
        );
    }

    return (
        <div className="metrics-counter">
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)} className="error-dismiss-button">
                        ×
                    </button>
                </div>
            )}

            <div className="grid">
                {Object.entries(counts).map(([type, count]) => (
                    <div
                        key={type}
                        className={getCounterClass(type as EventType)}
                        onClick={() => handleCounterClick(type as EventType)}
                    >
                        <div className="counter-content">
                            <h3 className="counter-title">{type}</h3>
                            <span className="counter-value">{count}</span>
                        </div>
                    </div>
                ))}
            </div>

            {activeUpdateModal === 'rejects' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <RejectUpdate
                            onClose={handleCloseModal}
                            onUpdate={fetchCounts}
                            lineId={lineId}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                        />
                    </div>
                </div>
            )}

            {activeUpdateModal === 'reworks' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <ReworkUpdate
                            onClose={handleCloseModal}
                            onUpdate={fetchCounts}
                            lineId={lineId}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                        />
                    </div>
                </div>
            )}

            {activeUpdateModal === 'late' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <LateUpdate
                            onClose={handleCloseModal}
                            onUpdate={fetchCounts}
                            lineId={lineId}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                        />
                    </div>
                </div>
            )}

            {activeUpdateModal === 'absent' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <AbsentUpdate
                            onClose={handleCloseModal}
                            onUpdate={fetchCounts}
                            lineId={lineId}
                            supervisorId={supervisorId}
                            sessionId={sessionId}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricsCounter;