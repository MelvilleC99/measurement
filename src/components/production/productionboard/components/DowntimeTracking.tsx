import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import Machine from '../../downtime/machine/Machine';
import StyleChange from '../../downtime/stylechange/StyleChangeover';
import {
    Downtime,
    DowntimeWithId,
    MachineFormData,
    StyleChangeoverFormData,
    SupportFunction
} from '../../../../types';

interface DowntimeTrackingProps {
    sessionId: string | undefined;
    lineId: string | undefined;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({ sessionId, lineId }) => {
    const [activeDowntimes, setActiveDowntimes] = useState<DowntimeWithId[]>([]);
    const [downtimeCategories, setDowntimeCategories] = useState<{ id: string; name: string; }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [isStyleChangeModalOpen, setIsStyleChangeModalOpen] = useState(false);
    const [mechanics, setMechanics] = useState<SupportFunction[]>([]);
    const [supervisorId, setSupervisorId] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [categoriesSnap, mechanicsSnap] = await Promise.all([
                    getDocs(collection(db, 'downtimeCategories')),
                    getDocs(query(
                        collection(db, 'supportFunctions'),
                        where('role', '==', 'Mechanic')
                    ))
                ]);

                setDowntimeCategories(categoriesSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                })));

                setMechanics(mechanicsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction)));
            } catch (error) {
                setError('Failed to fetch categories and mechanics');
                console.error(error);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        const fetchActiveDowntimes = async () => {
            if (!sessionId) return;

            try {
                const q = query(
                    collection(db, 'downtimes'),
                    where('sessionId', '==', sessionId),
                    where('status', '==', 'Open')
                );
                const snapshot = await getDocs(q);
                setActiveDowntimes(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as DowntimeWithId)));
            } catch (error) {
                setError('Failed to fetch active downtimes');
                console.error(error);
            }
        };

        fetchActiveDowntimes();
        const interval = setInterval(fetchActiveDowntimes, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleCategorySelect = (categoryName: string) => {
        setSelectedCategory(categoryName);
        if (categoryName === 'Machine Breakdown') {
            setIsMachineModalOpen(true);
        } else if (categoryName === 'Style Changeover') {
            setIsStyleChangeModalOpen(true);
        } else {
            handleGenericDowntime(categoryName);
        }
    };

    const handleGenericDowntime = async (category: string) => {
        if (!sessionId || !lineId) return;
        try {
            const downtimeDoc = {
                sessionId,
                category,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                lineId,
                type: 'generic',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            await addDoc(collection(db, 'downtimes'), downtimeDoc);
            refreshDowntimes();
        } catch (error) {
            setError('Failed to record downtime');
            console.error(error);
        }
    };

    const handleMachineDowntimeSubmit = async (data: MachineFormData) => {
        if (!sessionId || !lineId) return;
        try {
            const downtimeDoc = {
                ...data,
                sessionId,
                lineId,
                type: 'machine',
                category: 'Machine Breakdown',
                startTime: Timestamp.now(),
                status: 'Open' as const,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            await addDoc(collection(db, 'downtimes'), downtimeDoc);
            setIsMachineModalOpen(false);
            refreshDowntimes();
        } catch (error) {
            setError('Failed to record machine downtime');
            console.error(error);
        }
    };

    const handleStyleChangeSubmit = async (data: StyleChangeoverFormData) => {
        if (!sessionId || !lineId) return;
        try {
            const downtimeDoc = {
                ...data,
                sessionId,
                lineId,
                type: 'style',
                category: 'Style Changeover',
                startTime: Timestamp.now(),
                status: 'Open' as const,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            await addDoc(collection(db, 'downtimes'), downtimeDoc);
            setIsStyleChangeModalOpen(false);
            refreshDowntimes();
        } catch (error) {
            setError('Failed to record style change');
            console.error(error);
        }
    };

    const handleCloseDowntime = async (downtimeId: string) => {
        try {
            await updateDoc(doc(db, 'downtimes', downtimeId), {
                status: 'Closed',
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            refreshDowntimes();
        } catch (error) {
            setError('Failed to close downtime');
            console.error(error);
        }
    };

    const refreshDowntimes = async () => {
        if (!sessionId) return;

        try {
            const q = query(
                collection(db, 'downtimes'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            );
            const snapshot = await getDocs(q);
            setActiveDowntimes(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DowntimeWithId)));
        } catch (error) {
            setError('Failed to refresh downtimes');
            console.error(error);
        }
    };

    if (!lineId) return null;

    return (
        <div className="downtime-tracking">
            <div className="downtime-categories">
                {downtimeCategories.map(category => (
                    <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.name)}
                        className="category-button"
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="active-downtimes">
                {activeDowntimes.map(downtime => (
                    <div key={downtime.id} className="downtime-card">
                        <div className="card-header">
                            <h3>{downtime.category}</h3>
                            <span className="time">
                                {downtime.startTime.toDate().toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="card-body">
                            {downtime.reason && <p>{downtime.reason}</p>}
                            {downtime.machine && <p>Machine: {downtime.machine}</p>}
                            {downtime.comments && <p>{downtime.comments}</p>}
                        </div>
                        <button
                            onClick={() => handleCloseDowntime(downtime.id)}
                            className="close-button"
                        >
                            Close Downtime
                        </button>
                    </div>
                ))}
            </div>

            {isMachineModalOpen && (
                <Machine
                    onClose={() => setIsMachineModalOpen(false)}
                    onSubmit={handleMachineDowntimeSubmit}
                    mechanics={mechanics}
                    supervisorId={supervisorId}
                    productionLineId={lineId}
                />
            )}

            {isStyleChangeModalOpen && (
                <StyleChange
                    onClose={() => setIsStyleChangeModalOpen(false)}
                    onSubmit={handleStyleChangeSubmit}
                    productionLineId={lineId}
                    supervisorId={supervisorId}
                />
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

export default DowntimeTracking;