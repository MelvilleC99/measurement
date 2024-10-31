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

interface EventRecord {
    id: string;
    type: 'reject' | 'rework' | 'late' | 'absent';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: string;
    count?: number;
    reason?: string;
    comments?: string;
    employeeName?: string;
    employeeNumber?: string;
}

type EventType = 'reject' | 'rework' | 'late' | 'absent';
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
    const [recentEvents, setRecentEvents] = useState<EventRecord[]>([]);
    const [activeUpdateModal, setActiveUpdateModal] = useState<UpdateModalType>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEventDetails, setShowEventDetails] = useState(false);

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

            await fetchAllEvents();
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
                where('status', '==', 'open')
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
                where('status', '==', 'open')
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
                collection(db, 'absent'),
                where('sessionId', '==', sessionId),
                where('returned', '==', false)
            );
            const snapshot = await getDocs(absentQuery);
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching absent count:', error);
            return 0;
        }
    };

    const fetchAllEvents = async () => {
        try {
            const [rejectsData, reworksData, lateData, absentData] = await Promise.all([
                fetchRejectsData(),
                fetchReworksData(),
                fetchLateData(),
                fetchAbsentData(),
            ]);

            const allEvents = [
                ...processEvents(rejectsData, 'reject'),
                ...processEvents(reworksData, 'rework'),
                ...processEvents(lateData, 'late'),
                ...processEvents(absentData, 'absent'),
            ].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

            setRecentEvents(allEvents);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Failed to fetch event details');
        }
    };

    const fetchRejectsData = async (): Promise<DocumentData[]> => {
        const rejectsQuery = query(
            collection(db, 'rejects'),
            where('sessionId', '==', sessionId)
        );
        const snapshot = await getDocs(rejectsQuery);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const fetchReworksData = async (): Promise<DocumentData[]> => {
        const reworksQuery = query(
            collection(db, 'reworks'),
            where('sessionId', '==', sessionId)
        );
        const snapshot = await getDocs(reworksQuery);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const fetchLateData = async (): Promise<DocumentData[]> => {
        const lateQuery = query(
            collection(db, 'attendance'),
            where('sessionId', '==', sessionId),
            where('type', '==', 'late')
        );
        const snapshot = await getDocs(lateQuery);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const fetchAbsentData = async (): Promise<DocumentData[]> => {
        const absentQuery = query(
            collection(db, 'absent'),
            where('sessionId', '==', sessionId)
        );
        const snapshot = await getDocs(absentQuery);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const processEvents = (events: DocumentData[], type: EventType): EventRecord[] => {
        return events.map((event) => ({
            id: event.id,
            type,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            status: event.status,
            count: event.count,
            reason: event.reason,
            comments: event.comments,
            employeeName: event.employeeName,
            employeeNumber: event.employeeNumber,
        }));
    };

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleCounterClick = (type: EventType) => {
        setActiveUpdateModal(type);
        setShowEventDetails(true);
    };

    const handleCloseModal = () => {
        setActiveUpdateModal(null);
        setShowEventDetails(false);
        fetchCounts();
    };

    const getCounterClass = (type: EventType): string => {
        switch (type) {
            case 'reject':
                return 'counter-card counter-reject';
            case 'rework':
                return 'counter-card counter-rework';
            case 'late':
                return 'counter-card counter-late';
            case 'absent':
                return 'counter-card counter-absent';
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
                    <button
                        onClick={() => setError(null)}
                        className="error-dismiss-button"
                    >
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
                        <h3 className="counter-title">{type}</h3>
                        <span className="counter-value">{count}</span>
                    </div>
                ))}
            </div>

            {showEventDetails && recentEvents.length > 0 && activeUpdateModal && (
                <div className="recent-events">
                    <h3 className="recent-events-title">
                        Recent {activeUpdateModal} Events
                    </h3>
                    <div className="event-list">
                        {recentEvents
                            .filter((event) => event.type === activeUpdateModal)
                            .map((event) => (
                                <div key={event.id} className="event-item">
                                    <div className="event-header">
                                        <span className="event-name">
                                            {event.employeeName || event.reason || 'No description'}
                                        </span>
                                        <span className="event-date">
                                            {event.createdAt.toDate().toLocaleDateString()}
                                        </span>
                                    </div>
                                    {event.count && (
                                        <div className="event-details">
                                            Count: {event.count}
                                        </div>
                                    )}
                                    {event.comments && (
                                        <div className="event-details">
                                            {event.comments}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {activeUpdateModal === 'reject' && (
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

            {activeUpdateModal === 'rework' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <ReworkUpdate
                            onClose={handleCloseModal}
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