import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '../../../../firebase';
import RejectUpdate from '../../downtime/reject/RejectUpdate';
import ReworkUpdate from '../../downtime/rework/ReworkUpdate';
import AbsentUpdate from '../../downtime/hr/AbsentUpdate';
import LateUpdate from '../../downtime/hr/LateUpdate';

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
    // State Management
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

    // Fetch Functions
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
            return 0; // Return 0 on failure to prevent breaking the app
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
            console.log('Fetched rework count:', snapshot.size); // Debugging log
            return snapshot.size;
        } catch (error) {
            console.error('Error fetching rework count:', error);
            return 0; // Return 0 on failure to prevent breaking the app
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
            return 0; // Return 0 on failure to prevent breaking the app
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
            return 0; // Return 0 on failure to prevent breaking the app
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

    // Effect Hooks
    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    // Event Handlers
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
                return 'border-red-200 bg-red-100 hover:bg-red-200';
            case 'rework':
                return 'border-yellow-200 bg-yellow-100 hover:bg-yellow-200';
            case 'late':
                return 'border-orange-200 bg-orange-100 hover:bg-orange-200';
            case 'absent':
                return 'border-purple-200 bg-purple-100 hover:bg-purple-200';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-4">
                <div className="loading-spinner">Loading metrics...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="absolute top-0 right-0 px-4 py-3"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(counts).map(([type, count]) => (
                    <div
                        key={type}
                        className={`cursor-pointer p-6 rounded-lg border transition-colors ${getCounterClass(type as EventType)}`}
                        onClick={() => handleCounterClick(type as EventType)}
                    >
                        <h3 className="text-lg font-semibold capitalize text-center">{type}</h3>
                        <span className="text-3xl font-bold text-center block mt-2">{count}</span>
                    </div>
                ))}
            </div>

            {showEventDetails && recentEvents.length > 0 && activeUpdateModal && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Recent {activeUpdateModal} Events
                    </h3>
                    <div className="space-y-4">
                        {recentEvents
                            .filter((event) => event.type === activeUpdateModal)
                            .map((event) => (
                                <div
                                    key={event.id}
                                    className="p-4 bg-white rounded-lg shadow border"
                                >
                                    <div className="flex justify-between">
                                        <span className="font-medium">
                                            {event.employeeName || event.reason || 'No description'}
                                        </span>
                                        <span className="text-gray-500">
                                            {event.createdAt.toDate().toLocaleDateString()}
                                        </span>
                                    </div>
                                    {event.count && (
                                        <div className="text-sm text-gray-600">
                                            Count: {event.count}
                                        </div>
                                    )}
                                    {event.comments && (
                                        <div className="text-sm text-gray-600">
                                            {event.comments}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {activeUpdateModal === 'reject' && (
                <RejectUpdate
                    onClose={handleCloseModal}
                    onUpdate={fetchCounts}
                    lineId={lineId}
                    supervisorId={supervisorId}
                    sessionId={sessionId}
                />
            )}

            {activeUpdateModal === 'rework' && (
                <ReworkUpdate
                    onClose={handleCloseModal}
                />
            )}

            {activeUpdateModal === 'late' && (
                <LateUpdate
                    onClose={handleCloseModal}
                    onUpdate={fetchCounts}
                    lineId={lineId}
                    supervisorId={supervisorId}
                    sessionId={sessionId}
                />
            )}

            {activeUpdateModal === 'absent' && (
                <AbsentUpdate
                    onClose={handleCloseModal}
                    onUpdate={fetchCounts}
                    lineId={lineId}
                    supervisorId={supervisorId}
                    sessionId={sessionId}
                />
            )}
        </div>
    );
};

export default MetricsCounter;
