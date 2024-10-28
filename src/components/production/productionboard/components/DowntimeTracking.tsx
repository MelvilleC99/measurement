import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import StyleChangeover from '../../downtime/stylechange/StyleChangeover';
import Machine from '../../downtime/machine/Machine';
import SupplyLog from '../../downtime/supply/Supply';
import { Downtime } from '../../downtime/types';
import { MachineFormData, MachineProps } from '../../downtime/types';
import { StyleChangeoverFormData, StyleChangeProps } from '../../downtime/types';
import { SupplyFormData, SupplyLogProps } from '../../downtime/types';
import { SupportFunction } from '../../../../types';
import './DowntimeTracking.css';

interface DowntimeTrackingProps {
    sessionId: string;
    lineId: string;
}

interface DowntimeCategory {
    id: string;
    name: string;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({ sessionId, lineId }) => {
    const [activeDowntimes, setActiveDowntimes] = useState<Downtime[]>([]);
    const [downtimeCategories, setDowntimeCategories] = useState<DowntimeCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [isStyleChangeModalOpen, setIsStyleChangeModalOpen] = useState(false);
    const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
    const [mechanics, setMechanics] = useState<SupportFunction[]>([]);
    const [supervisorId, setSupervisorId] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Fetch Active Downtimes
    const fetchActiveDowntimes = async () => {
        if (!sessionId) return;

        try {
            const downtimeQuery = query(
                collection(db, 'downtimes'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            );
            const snapshot = await getDocs(downtimeQuery);
            const fetchedDowntimes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Downtime));
            setActiveDowntimes(fetchedDowntimes);
        } catch (err) {
            console.error('Error fetching active downtimes:', err);
            setError('Failed to fetch active downtimes');
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!sessionId) return;

            try {
                const mechanicsQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Mechanic'),
                    where('active', '==', true)
                );

                const supervisorQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Supervisor'),
                    where('active', '==', true)
                );

                const categoriesSnap = await getDocs(collection(db, 'downtimeCategories'));

                const [mechanicsSnap, supervisorSnap] = await Promise.all([
                    getDocs(mechanicsQuery),
                    getDocs(supervisorQuery)
                ]);

                const fetchedMechanics = mechanicsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction));
                setMechanics(fetchedMechanics);

                if (!supervisorSnap.empty) {
                    const supervisorData = supervisorSnap.docs[0].data();
                    setSupervisorId(supervisorData.employeeNumber || supervisorSnap.docs[0].id);
                }

                const fetchedCategories = categoriesSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                setDowntimeCategories(fetchedCategories);

            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError('Failed to load initial data');
            }
        };

        fetchInitialData();
        fetchActiveDowntimes();
        const interval = setInterval(fetchActiveDowntimes, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleCategorySelect = (categoryName: string) => {
        setSelectedCategory(categoryName);
        switch (categoryName) {
            case 'Machine':
                setIsMachineModalOpen(true);
                break;
            case 'Style Change':
                setIsStyleChangeModalOpen(true);
                break;
            case 'Supply':
                setIsSupplyModalOpen(true);
                break;
            default:
                handleGenericDowntime(categoryName);
        }
    };

    const handleGenericDowntime = async (category: string) => {
        if (!sessionId || !lineId || !supervisorId) return;

        try {
            const downtimeData = {
                type: category,
                category,
                employeeId: supervisorId,
                createdAt: Timestamp.now(),
                productionLineId: lineId,
                reason: category,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                supervisorId: supervisorId,
                updatedAt: Timestamp.now(),
                sessionId
            };

            await addDoc(collection(db, 'downtimes'), downtimeData);
            fetchActiveDowntimes();
        } catch (err) {
            console.error('Error creating generic downtime:', err);
            setError('Failed to create downtime');
        }
    };

    const handleMachineDowntimeSubmit = async (data: MachineFormData) => {
        if (!sessionId || !lineId) return;

        try {
            const downtimeData = {
                type: 'Machine',
                category: 'Machine',
                employeeId: data.supervisorId,
                createdAt: Timestamp.now(),
                productionLineId: lineId,
                reason: data.reason,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                supervisorId: data.supervisorId,
                updatedAt: Timestamp.now(),
                sessionId,
                machine: data.machineNumber,
                comments: data.comments,
                mechanicId: data.mechanicId
            };

            await addDoc(collection(db, 'downtimes'), downtimeData);
            setIsMachineModalOpen(false);
            fetchActiveDowntimes();
        } catch (err) {
            console.error('Error creating machine downtime:', err);
            setError('Failed to create machine downtime');
        }
    };

    const handleStyleChangeSubmit = async (data: StyleChangeoverFormData) => {
        if (!sessionId || !lineId) return;

        try {
            const downtimeData = {
                type: 'Style Change',
                category: 'Style Change',
                employeeId: data.supervisorId,
                createdAt: Timestamp.now(),
                productionLineId: lineId,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                supervisorId: data.supervisorId,
                updatedAt: Timestamp.now(),
                sessionId,
                currentStyle: data.currentStyle,
                nextStyle: data.nextStyle,
                target: data.target
            };

            await addDoc(collection(db, 'downtimes'), downtimeData);
            setIsStyleChangeModalOpen(false);
            fetchActiveDowntimes();
        } catch (err) {
            console.error('Error creating style changeover:', err);
            setError('Failed to create style changeover');
        }
    };

    const handleSupplyDowntimeSubmit = async (data: SupplyFormData) => {
        if (!sessionId || !lineId) return;

        try {
            const downtimeData = {
                type: 'Supply',
                category: 'Supply',
                employeeId: data.supervisorId,
                createdAt: Timestamp.now(),
                productionLineId: lineId,
                reason: data.reason,
                startTime: Timestamp.now(),
                status: 'Open' as const,
                supervisorId: data.supervisorId,
                updatedAt: Timestamp.now(),
                sessionId,
                comments: data.comments
            };

            await addDoc(collection(db, 'downtimes'), downtimeData);
            setIsSupplyModalOpen(false);
            fetchActiveDowntimes();
        } catch (err) {
            console.error('Error creating supply downtime:', err);
            setError('Failed to create supply downtime');
        }
    };

    const handleCloseDowntime = async (downtimeId: string) => {
        try {
            await updateDoc(doc(db, 'downtimes', downtimeId), {
                status: 'Closed',
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            fetchActiveDowntimes();
        } catch (err) {
            console.error('Error closing downtime:', err);
            setError('Failed to close downtime');
        }
    };

    if (!lineId || !sessionId) return null;

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
                            {downtime.reason && <p>Reason: {downtime.reason}</p>}
                            {downtime.machine && <p>Machine: {downtime.machine}</p>}
                            {downtime.comments && <p>Comments: {downtime.comments}</p>}
                            {downtime.mechanicId && <p>Mechanic Assigned</p>}
                            {downtime.currentStyle && (
                                <>
                                    <p>Current Style: {downtime.currentStyle}</p>
                                    <p>Next Style: {downtime.nextStyle}</p>
                                    <p>Target: {downtime.target}</p>
                                </>
                            )}
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
                    productionLineId={lineId}
                    supervisorId={supervisorId}
                />
            )}

            {isStyleChangeModalOpen && (
                <StyleChangeover
                    onClose={() => setIsStyleChangeModalOpen(false)}
                    onSubmit={handleStyleChangeSubmit}
                    productionLineId={lineId}
                    supervisorId={supervisorId}
                />
            )}

            {isSupplyModalOpen && (
                <SupplyLog
                    onClose={() => setIsSupplyModalOpen(false)}
                    onSubmit={handleSupplyDowntimeSubmit}
                    productionLineId={lineId}
                    supervisorId={supervisorId}
                />
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="error-dismiss-button">✕</button>
                </div>
            )}
        </div>
    );
};

export default DowntimeTracking;