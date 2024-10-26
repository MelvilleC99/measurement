import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
    ReworkItem,
    RejectRecord,
    convertTimestampToDate
} from '../../../../types';

interface MetricsCounterProps {
    sessionId: string | undefined;
    metrics: {
        rejects: number;
        reworks: number;
        late: number;
        absent: number;
    };
}

interface EventRecord {
    id: string;
    type: 'reject' | 'rework' | 'late' | 'absent';
    timestamp: Timestamp;
    description: string;
    count?: number;
    operator?: string;
    reason?: string;
}

const MetricsCounter: React.FC<MetricsCounterProps> = ({ sessionId, metrics }) => {
    const [recentEvents, setRecentEvents] = useState<EventRecord[]>([]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchRecentEvents = async () => {
            if (!sessionId) return;

            try {
                // Fetch recent events from different collections
                const [rejectsSnap, reworksSnap, attendanceSnap] = await Promise.all([
                    getDocs(query(
                        collection(db, 'rejects'),
                        where('sessionId', '==', sessionId)
                    )),
                    getDocs(query(
                        collection(db, 'reworks'),
                        where('sessionId', '==', sessionId)
                    )),
                    getDocs(query(
                        collection(db, 'attendance'),
                        where('sessionId', '==', sessionId)
                    ))
                ]);

                // Process reject records
                const rejectEvents: EventRecord[] = rejectsSnap.docs.map(doc => {
                    const data = doc.data() as RejectRecord;
                    return {
                        id: doc.id,
                        type: 'reject',
                        timestamp: data.createdAt,
                        description: data.comments || '',
                        count: data.count,
                        reason: data.reason,
                        operator: 'QC'
                    };
                });

                // Process rework records
                const reworkEvents: EventRecord[] = reworksSnap.docs.map(doc => {
                    const data = doc.data() as ReworkItem;
                    return {
                        id: doc.id,
                        type: 'rework',
                        timestamp: data.createdAt,
                        description: data.comments || '',
                        count: data.count,
                        reason: data.reason,
                        operator: 'QC'
                    };
                });

                // Process attendance records
                const attendanceEvents: EventRecord[] = attendanceSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        type: data.type as 'late' | 'absent',
                        timestamp: data.createdAt,
                        description: data.reason || '',
                        operator: data.employeeName || ''
                    };
                });

                // Combine and sort all events by timestamp
                const allEvents = [...rejectEvents, ...reworkEvents, ...attendanceEvents]
                    .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

                setRecentEvents(allEvents);
            } catch (error) {
                setError('Failed to fetch recent events');
                console.error(error);
            }
        };

        fetchRecentEvents();
        // Update every 30 seconds
        const interval = setInterval(fetchRecentEvents, 30000);

        return () => clearInterval(interval);
    }, [sessionId]);

    const getEventColor = (type: string): string => {
        switch (type) {
            case 'reject':
                return 'bg-red-100 border-red-500';
            case 'rework':
                return 'bg-yellow-100 border-yellow-500';
            case 'late':
                return 'bg-orange-100 border-orange-500';
            case 'absent':
                return 'bg-purple-100 border-purple-500';
            default:
                return 'bg-gray-100 border-gray-500';
        }
    };

    return (
        <div className="metrics-counter">
            {/* Counter Boxes */}
            <div className="counters-grid">
                <div className="counter-box reject-counter">
                    <h3>Rejects</h3>
                    <span className="counter-value">{metrics.rejects}</span>
                </div>

                <div className="counter-box rework-counter">
                    <h3>Reworks</h3>
                    <span className="counter-value">{metrics.reworks}</span>
                </div>

                <div className="counter-box late-counter">
                    <h3>Late</h3>
                    <span className="counter-value">{metrics.late}</span>
                </div>

                <div className="counter-box absent-counter">
                    <h3>Absent</h3>
                    <span className="counter-value">{metrics.absent}</span>
                </div>
            </div>

            {/* Recent Events List */}
            <div className="recent-events">
                <h3>Recent Events</h3>
                <div className="events-list">
                    {recentEvents.map(event => (
                        <div
                            key={event.id}
                            className={`event-item ${getEventColor(event.type)}`}
                        >
                            <div className="event-header">
                                <span className="event-type">{event.type}</span>
                                <span className="event-time">
                                    {convertTimestampToDate(event.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            {event.count && (
                                <div className="event-count">
                                    Count: {event.count}
                                </div>
                            )}
                            {event.reason && (
                                <div className="event-reason">
                                    Reason: {event.reason}
                                </div>
                            )}
                            {event.description && (
                                <div className="event-description">
                                    {event.description}
                                </div>
                            )}
                            {event.operator && (
                                <div className="event-operator">
                                    By: {event.operator}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
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

export default MetricsCounter;