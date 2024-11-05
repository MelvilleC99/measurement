// DowntimeTracking.tsx
import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import MachineUpdate from '../../../production/downtime/machine/MachineUpdate';
import SupplyUpdate from '../../../production/downtime/supply/SupplyUpdate';
import StyleChangeUpdate from '../../downtime/stylechange/StyleChangeUpdate';
import { SupplyRecord, StyleChangeoverRecord } from '../../downtime/types';
import './DowntimeTracking.css';

interface DowntimeTrackingProps {
    sessionId: string;
    lineId: string;
    userRole: 'Supervisor' | 'Mechanic';
    userId: string;
}

interface MachineRecord {
    id: string;
    reason: string;
    machineNumber: string;
    comments: string;
    status: string;
    mechanicAcknowledged: boolean;
    mechanicId?: string;
    mechanicName?: string;
    supervisorId?: string;
    createdAt: any;
    updatedAt: any;
    mechanicAcknowledgedAt?: any;
    resolvedAt?: any;
    productionLineId?: string;
    additionalComments?: string;
}

interface Mechanic {
    employeeNumber: string;
    name: string;
    surname: string;
    password: string;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({ sessionId, lineId, userRole, userId }) => {
    const [activeMachineDowntimes, setActiveMachineDowntimes] = useState<MachineRecord[]>([]);
    const [activeSupplyDowntimes, setActiveSupplyDowntimes] = useState<SupplyRecord[]>([]);
    const [activeStyleChangeovers, setActiveStyleChangeovers] = useState<StyleChangeoverRecord[]>([]);
    const [selectedMachineDowntime, setSelectedMachineDowntime] = useState<MachineRecord | null>(null);
    const [selectedSupplyDowntime, setSelectedSupplyDowntime] = useState<SupplyRecord | null>(null);
    const [selectedStyleChangeover, setSelectedStyleChangeover] = useState<StyleChangeoverRecord | null>(null);
    const [showStyleUpdateModal, setShowStyleUpdateModal] = useState(false);
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [showMachineModal, setShowMachineModal] = useState(false);

    // Fetch mechanics
    useEffect(() => {
        const fetchMechanics = async () => {
            try {
                const mechanicsQuery = query(
                    collection(db, 'supportFunctions'),
                    where('role', '==', 'Mechanic')
                );
                const snapshot = await getDocs(mechanicsQuery);

                if (snapshot.empty) {
                    console.warn('No mechanics found in database');
                    return;
                }

                const fetchedMechanics = snapshot.docs.map(doc => ({
                    employeeNumber: doc.data().employeeNumber,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    password: doc.data().password,
                }));
                setMechanics(fetchedMechanics);
            } catch (err) {
                console.error('Error fetching mechanics:', err);
                setError('Failed to load mechanics');
            }
        };

        fetchMechanics();
    }, []);

    // Set up real-time listeners for downtimes
    useEffect(() => {
        if (!sessionId || !lineId) return;

        setIsLoading(true);
        const unsubscribes: Unsubscribe[] = [];

        try {
            // Subscribe to machine downtimes for specific line with status 'Open'
            const machineQuery = query(
                collection(db, 'machineDowntimes'),
                where('productionLineId', '==', lineId),
                where('status', '==', 'Open')
            );

            const machineUnsubscribe = onSnapshot(machineQuery, (snapshot) => {
                const fetchedMachineDowntimes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    mechanicAcknowledged: doc.data().mechanicAcknowledged ?? false
                })) as MachineRecord[];
                setActiveMachineDowntimes(fetchedMachineDowntimes);
                setIsLoading(false);
            }, (error) => {
                console.error('Error in machine downtimes subscription:', error);
                setError('Failed to load machine downtimes');
                setIsLoading(false);
            });
            unsubscribes.push(machineUnsubscribe);

            // Supply downtimes subscription
            const supplyQuery = query(
                collection(db, 'supplyDowntime'),
                where('status', '==', 'Open'),
                where('productionLineId', '==', lineId)
            );
            const supplyUnsubscribe = onSnapshot(supplyQuery, (snapshot) => {
                const fetchedSupplyDowntimes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SupplyRecord[];
                setActiveSupplyDowntimes(fetchedSupplyDowntimes);
            }, (error) => {
                console.error('Error in supply downtimes subscription:', error);
                setError('Failed to load supply downtimes');
            });
            unsubscribes.push(supplyUnsubscribe);

            // Style changeovers subscription
            const styleQuery = query(
                collection(db, 'styleChangeovers'),
                where('status', '==', 'In Progress'),
                where('productionLineId', '==', lineId)
            );
            const styleUnsubscribe = onSnapshot(styleQuery, (snapshot) => {
                const fetchedStyleChangeovers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as StyleChangeoverRecord[];
                setActiveStyleChangeovers(fetchedStyleChangeovers);
            }, (error) => {
                console.error('Error in style changeovers subscription:', error);
                setError('Failed to load style changeovers');
            });
            unsubscribes.push(styleUnsubscribe);

        } catch (err) {
            console.error('Error setting up subscriptions:', err);
            setError('Failed to load downtimes');
            setIsLoading(false);
        }

        return () => {
            unsubscribes.forEach(unsubscribe => unsubscribe());
        };
    }, [sessionId, lineId]);

    const handleSelectMachineDowntime = (downtimeId: string) => {
        console.log('1. Clicking machine downtime:', downtimeId);
        const selectedDowntime = activeMachineDowntimes.find(downtime => downtime.id === downtimeId);
        console.log('2. Found downtime:', selectedDowntime);
        if (selectedDowntime) {
            console.log('3. User Role:', userRole);
            console.log('4. Mechanic Acknowledged:', selectedDowntime.mechanicAcknowledged);
            setSelectedMachineDowntime(selectedDowntime);
            setShowMachineModal(true);
            console.log('5. Modal should show now');
        }
    };

    const handleSelectSupplyDowntime = (downtime: SupplyRecord) => {
        setSelectedSupplyDowntime(downtime);
        setSelectedMachineDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
        setShowMachineModal(false);
    };

    const handleSelectStyleChangeover = (changeover: StyleChangeoverRecord) => {
        setSelectedStyleChangeover(changeover);
        setSelectedMachineDowntime(null);
        setSelectedSupplyDowntime(null);
        setShowStyleUpdateModal(true);
        setShowMachineModal(false);
    };

    const handleClose = () => {
        setSelectedMachineDowntime(null);
        setSelectedSupplyDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
        setShowMachineModal(false);
        setError('');
    };


    const refreshMachineDowntimes = async () => {
        setSelectedMachineDowntime(null);
        setShowMachineModal(false);
    };

    if (!lineId || !sessionId) return null;

    return (
        <div className="downtime-tracking">
            <div className="active-downtimes">
                <h2>Active Downtimes</h2>
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="error-dismiss-button">&times;</button>
                    </div>
                )}

                {isLoading ? (
                    <div className="loading-state">Loading downtimes...</div>
                ) : (
                    <div className="downtimes-grid">
                        {/* Machine Downtimes */}
                        {activeMachineDowntimes.map((downtime) => (
                            <div
                                key={downtime.id}
                                className={`downtime-card clickable ${downtime.mechanicAcknowledged ? 'acknowledged' : ''}`}
                                onClick={() => handleSelectMachineDowntime(downtime.id)}
                            >
                                <div className="card-header">
                                    <h3>Machine Downtime</h3>
                                    <span className="status">
                                        {downtime.mechanicAcknowledged ? 'Acknowledged' : 'Open'}
                                    </span>
                                    <span className="time">
                                        {downtime.createdAt?.toDate().toLocaleTimeString() || 'Unknown'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p><strong>Reason:</strong> {downtime.reason}</p>
                                    <p><strong>Machine:</strong> {downtime.machineNumber}</p>
                                    <p><strong>Comments:</strong> {downtime.comments}</p>
                                    {downtime.mechanicName && (
                                        <p><strong>Assigned to:</strong> {downtime.mechanicName}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Supply Downtimes */}
                        {activeSupplyDowntimes.map((downtime) => (
                            <div
                                key={downtime.id}
                                className="downtime-card clickable"
                                onClick={() => handleSelectSupplyDowntime(downtime)}
                            >
                                <div className="card-header">
                                    <h3>Supply Downtime</h3>
                                    <span className="time">
                                        {downtime.startTime.toDate().toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p><strong>Reason:</strong> {downtime.reason}</p>
                                    <p><strong>Comments:</strong> {downtime.comments}</p>
                                </div>
                            </div>
                        ))}

                        {/* Style Changeovers */}
                        {activeStyleChangeovers.map((changeover) => (
                            <div
                                key={changeover.id}
                                className="downtime-card clickable"
                                onClick={() => handleSelectStyleChangeover(changeover)}
                            >
                                <div className="card-header">
                                    <h3>Style Changeover</h3>
                                    <span className="time">
                                        {changeover.createdAt.toDate().toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p><strong>Current Style:</strong> {changeover.currentStyle}</p>
                                    <p><strong>Next Style:</strong> {changeover.nextStyle}</p>
                                    <p><strong>Target Time:</strong> {changeover.target} minutes</p>
                                </div>
                            </div>
                        ))}

                        {activeMachineDowntimes.length === 0 &&
                            activeSupplyDowntimes.length === 0 &&
                            activeStyleChangeovers.length === 0 && (
                                <div className="no-downtimes-message">
                                    No active downtimes
                                </div>
                            )}
                    </div>
                )}
            </div>

            {/* Machine Downtime Update Modal */}
            {showMachineModal && selectedMachineDowntime && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>✕</button>
                        <MachineUpdate
                            userRole={userRole}
                            userId={userId}
                            selectedDowntime={selectedMachineDowntime}
                            mechanics={mechanics}
                            onClose={handleClose}
                            onAcknowledgeReceipt={refreshMachineDowntimes}
                        />
                    </div>
                </div>
            )}

            {/* Supply Downtime Update Modal */}
            {selectedSupplyDowntime && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>✕</button>
                        <SupplyUpdate
                            selectedDowntime={selectedSupplyDowntime}
                            onClose={handleClose}
                        />
                    </div>
                </div>
            )}

            {/* Style Changeover Update Modal */}
            {showStyleUpdateModal && selectedStyleChangeover && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>✕</button>
                        <StyleChangeUpdate
                            userRole="Supervisor"
                            userId={selectedStyleChangeover.supervisorId || ''}
                            selectedChangeover={selectedStyleChangeover}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DowntimeTracking;