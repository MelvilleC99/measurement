import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import MachineUpdate from '../../../production/downtime/machine/MachineUpdate';
import SupplyUpdate from '../../../production/downtime/supply/SupplyUpdate';
import StyleChangeUpdate from '../../downtime/stylechange/StyleChangeUpdate';
import { SupplyRecord, StyleChangeoverRecord, MachineRecord } from '../../downtime/types';
import './DowntimeTracking.css';

interface DowntimeTrackingProps {
    sessionId: string;
    lineId: string;
    userRole: 'Supervisor' | 'Mechanic';
    userId: string;
}

interface Mechanic {
    employeeNumber: string;
    name: string;
    surname: string;
    password: string;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({ sessionId, lineId, userRole, userId }) => {
    // State management
    const [activeMachineDowntimes, setActiveMachineDowntimes] = useState<MachineRecord[]>([]);
    const [activeSupplyDowntimes, setActiveSupplyDowntimes] = useState<SupplyRecord[]>([]);
    const [activeStyleChangeovers, setActiveStyleChangeovers] = useState<StyleChangeoverRecord[]>([]);
    const [currentLineStyle, setCurrentLineStyle] = useState<string>('');
    const [selectedMachineDowntime, setSelectedMachineDowntime] = useState<MachineRecord | null>(null);
    const [selectedSupplyDowntime, setSelectedSupplyDowntime] = useState<SupplyRecord | null>(null);
    const [selectedStyleChangeover, setSelectedStyleChangeover] = useState<StyleChangeoverRecord | null>(null);
    const [showStyleUpdateModal, setShowStyleUpdateModal] = useState(false);
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch current style for the line
    useEffect(() => {
        if (!lineId) return;

        const fetchCurrentStyle = async () => {
            try {
                const lineDoc = await getDoc(doc(db, 'productionLines', lineId));
                if (lineDoc.exists()) {
                    setCurrentLineStyle(lineDoc.data()?.currentStyle || 'Unknown');
                } else {
                    console.warn('Line document not found');
                    setCurrentLineStyle('Unknown');
                }
            } catch (error) {
                console.error('Error fetching current style:', error);
                setError('Failed to load current line style');
            }
        };

        fetchCurrentStyle();
    }, [lineId]);

    // Set up real-time listeners for downtimes
    useEffect(() => {
        if (!sessionId || !lineId) return;

        setIsLoading(true);
        const unsubscribes: Unsubscribe[] = [];

        try {
            // Subscribe to machine downtimes for specific line
            const machineQuery = query(
                collection(db, 'machineDowntimes'),
                where('status', '==', 'Open'),
                where('productionLineId', '==', lineId)
            );
            const machineUnsubscribe = onSnapshot(machineQuery, (snapshot) => {
                const fetchedMachineDowntimes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as MachineRecord[];
                console.log('Fetched Machine Downtimes:', fetchedMachineDowntimes);
                setActiveMachineDowntimes(fetchedMachineDowntimes);
                setIsLoading(false);
            }, (error) => {
                console.error('Error in machine downtimes subscription:', error);
                setError('Failed to load machine downtimes');
                setIsLoading(false);
            });
            unsubscribes.push(machineUnsubscribe);

            // Subscribe to supply downtimes for specific line
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
                console.log('Fetched Supply Downtimes:', fetchedSupplyDowntimes);
                setActiveSupplyDowntimes(fetchedSupplyDowntimes);
            }, (error) => {
                console.error('Error in supply downtimes subscription:', error);
                setError('Failed to load supply downtimes');
            });
            unsubscribes.push(supplyUnsubscribe);

            // Subscribe to style changeovers for specific line
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
                console.log('Fetched Style Changeovers:', fetchedStyleChangeovers);
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
                    id: doc.id,
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

    // Event handlers
    const handleSelectMachineDowntime = (downtimeId: string) => {
        const selectedDowntime = activeMachineDowntimes.find(downtime => downtime.id === downtimeId);
        if (selectedDowntime) {
            setSelectedMachineDowntime(selectedDowntime);
        }
        setSelectedSupplyDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
    };

    const handleSelectSupplyDowntime = (downtime: SupplyRecord) => {
        setSelectedSupplyDowntime(downtime);
        setSelectedMachineDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
    };

    const handleSelectStyleChangeover = (changeover: StyleChangeoverRecord) => {
        setSelectedStyleChangeover(changeover);
        setSelectedMachineDowntime(null);
        setSelectedSupplyDowntime(null);
        setShowStyleUpdateModal(true);
    };

    const handleClose = () => {
        setSelectedMachineDowntime(null);
        setSelectedSupplyDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
    };

    // Re-fetch the latest downtime details
    const refreshMachineDowntimes = async () => {
        const machineQuery = query(
            collection(db, 'machineDowntimes'),
            where('status', '==', 'Open'),
            where('productionLineId', '==', lineId)
        );
        const snapshot = await getDocs(machineQuery);
        const fetchedMachineDowntimes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as MachineRecord[];
        setActiveMachineDowntimes(fetchedMachineDowntimes);
    };

    if (!lineId || !sessionId) return null;

    return (
        <div className="downtime-tracking">
            <div className="active-downtimes">
                <h2>Active Downtimes</h2>
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="error-dismiss-button">✕</button>
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
                                className="downtime-card clickable"
                                onClick={() => handleSelectMachineDowntime(downtime.id)}
                            >
                                <div className="card-header">
                                    <h3>Machine Downtime</h3>
                                    <span className="time">
                                        {downtime.createdAt?.toDate().toLocaleTimeString() || 'Unknown'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p><strong>Reason:</strong> {downtime.reason}</p>
                                    <p><strong>Comments:</strong> {downtime.comments}</p>
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
                                    <p><strong>Current Style:</strong> {currentLineStyle}</p>
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
            {selectedMachineDowntime && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>✕</button>
                        <MachineUpdate
                            userRole={userRole} // Pass correct user role
                            userId={userId} // Pass the current user's ID
                            selectedDowntime={selectedMachineDowntime}
                            mechanics={mechanics}
                            onClose={() => {
                                handleClose();
                                refreshMachineDowntimes(); // Refresh data after updating
                            }}
                            onAcknowledgeReceipt={refreshMachineDowntimes} // Refresh data after mechanic acknowledgment
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
