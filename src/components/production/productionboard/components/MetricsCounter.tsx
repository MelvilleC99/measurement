// src/components/production/productionboard/components/MetricsCounter.tsx

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkItem, RejectRecord } from '../../downtime/types';
import ReworkUpdate from '../../downtime/rework/ReworkUpdate';
import './MetricsCounter.css';

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
    createdAt: Timestamp;
    description: string;
    count?: number;
    operator?: string;
    reason?: string;
    status?: string;
}

// Helper function for timestamp conversion
const convertTimestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};

const MetricsCounter: React.FC<MetricsCounterProps> = ({ sessionId, metrics }) => {
    const [recentEvents, setRecentEvents] = useState<EventRecord[]>([]);
    const [error, setError] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedType, setSelectedType] = useState<'reject' | 'rework' | 'late' | 'absent' | null>(null);
    const [modalEvents, setModalEvents] = useState<EventRecord[]>([]);
    const [isReworkUpdateOpen, setIsReworkUpdateOpen] = useState<boolean>(false);
    const [currentMetrics, setCurrentMetrics] = useState(metrics);

    const fetchRecentEvents = async () => {
        if (!sessionId) return;

        try {
            // Fetch rejects including those converted from reworks
            const rejectsSnap = await getDocs(query(
                collection(db, 'rejects'),
                where('sessionId', '==', sessionId)
            ));

            // Fetch only open reworks
            const reworksSnap = await getDocs(query(
                collection(db, 'reworks'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            ));

            const attendanceSnap = await getDocs(query(
                collection(db, 'attendance'),
                where('sessionId', '==', sessionId)
            ));

            // Process reject records
            const rejectEvents: EventRecord[] = rejectsSnap.docs.map(doc => {
                const data = doc.data() as RejectRecord;
                return {
                    id: doc.id,
                    type: 'reject',
                    createdAt: data.createdAt,
                    description: data.comments || '',
                    count: data.count,
                    reason: data.reason,
                    operator: 'QC'
                };
            });

            // Process rework records - only include open ones
            const reworkEvents: EventRecord[] = reworksSnap.docs.map(doc => {
                const data = doc.data() as ReworkItem;
                return {
                    id: doc.id,
                    type: 'rework',
                    createdAt: data.createdAt,
                    description: data.comments || '',
                    count: data.count,
                    reason: data.reason,
                    operator: 'QC',
                    status: data.status
                };
            });

            // Process attendance records
            const attendanceEvents: EventRecord[] = attendanceSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.type as 'late' | 'absent',
                    createdAt: data.createdAt,
                    description: data.reason || '',
                    operator: data.employeeName || ''
                };
            });

            // Combine and sort all events
            const allEvents = [...rejectEvents, ...reworkEvents, ...attendanceEvents]
                .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

            setRecentEvents(allEvents);

            // Update metrics based on current counts
            setCurrentMetrics({
                rejects: rejectEvents.length,
                reworks: reworkEvents.length, // Only open reworks
                late: metrics.late,
                absent: metrics.absent
            });
        } catch (error) {
            setError('Failed to fetch recent events');
            console.error(error);
        }
    };

    useEffect(() => {
        fetchRecentEvents();
        const interval = setInterval(fetchRecentEvents, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    // Handle rework update completion
    const handleReworkUpdateClose = () => {
        setIsReworkUpdateOpen(false);
        fetchRecentEvents(); // Refresh data immediately after rework update
    };

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

    const handleBoxClick = (type: 'reject' | 'rework' | 'late' | 'absent') => {
        setSelectedType(type);
        const filtered = recentEvents.filter(event => event.type === type);
        setModalEvents(filtered);
        if (type === 'rework') {
            setIsReworkUpdateOpen(true);
        } else {
            setIsModalOpen(true);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedType(null);
        setModalEvents([]);
    };

    return (
        <div className="metrics-counter">
            {/* Counter Boxes */}
            <div className="counters-grid">
                <div
                    className={`counter-box reject-counter`}
                    onClick={() => handleBoxClick('reject')}
                >
                    <h3>Rejects</h3>
                    <span className="counter-value">{currentMetrics.rejects}</span>
                </div>

                <div
                    className={`counter-box rework-counter`}
                    onClick={() => handleBoxClick('rework')}
                >
                    <h3>Reworks</h3>
                    <span className="counter-value">{currentMetrics.reworks}</span>
                </div>

                <div
                    className={`counter-box late-counter`}
                    onClick={() => handleBoxClick('late')}
                >
                    <h3>Late</h3>
                    <span className="counter-value">{currentMetrics.late}</span>
                </div>

                <div
                    className={`counter-box absent-counter`}
                    onClick={() => handleBoxClick('absent')}
                >
                    <h3>Absent</h3>
                    <span className="counter-value">{currentMetrics.absent}</span>
                </div>
            </div>

            {/* Popup Modal */}
            {isModalOpen && selectedType && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Events
                            </h2>
                            <button className="modal-close-button" onClick={closeModal}>
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            {modalEvents.length > 0 ? (
                                modalEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className={`event-item ${getEventColor(event.type)}`}
                                    >
                                        <div className="event-header">
                                            <span className="event-type">
                                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                            </span>
                                            <span className="event-time">
                                                {convertTimestampToDate(event.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {event.count !== undefined && (
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
                                                Description: {event.description}
                                            </div>
                                        )}
                                        {event.operator && (
                                            <div className="event-operator">
                                                By: {event.operator}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p>No events to display.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Rework Update Modal */}
            {isReworkUpdateOpen && (
                <ReworkUpdate
                    onClose={handleReworkUpdateClose}
                />
            )}

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="error-dismiss-button">✕</button>
                </div>
            )}
        </div>
    );
}

export default MetricsCounter;