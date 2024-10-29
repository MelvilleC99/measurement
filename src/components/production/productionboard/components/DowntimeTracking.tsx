import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupplyRecord } from '../../downtime/types';
import { StyleChangeoverRecord } from '../../downtime/types';
import SupplyUpdate from '../../../production/downtime/supply/SupplyUpdate';
import StyleChangeUpdate from '../../downtime/stylechange/StyleChangeUpdate';
import './DowntimeTracking.css';

interface DowntimeTrackingProps {
    sessionId: string;
    lineId: string;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({
                                                               sessionId,
                                                               lineId
                                                           }) => {
    const [activeSupplyDowntimes, setActiveSupplyDowntimes] = useState<SupplyRecord[]>([]);
    const [activeStyleChangeovers, setActiveStyleChangeovers] = useState<StyleChangeoverRecord[]>([]);
    const [currentLineStyle, setCurrentLineStyle] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSupplyDowntime, setSelectedSupplyDowntime] = useState<SupplyRecord | null>(null);
    const [selectedStyleChangeover, setSelectedStyleChangeover] = useState<StyleChangeoverRecord | null>(null);
    const [showStyleUpdateModal, setShowStyleUpdateModal] = useState(false);

    useEffect(() => {
        if (!lineId) return;

        const fetchCurrentStyle = async () => {
            try {
                const lineDoc = await getDoc(doc(db, 'productionLines', lineId));
                setCurrentLineStyle(lineDoc.data()?.currentStyle || 'Unknown');
            } catch (error) {
                console.error('Error fetching current style:', error);
                setError('Failed to load current line style');
            }
        };

        fetchCurrentStyle();
    }, [lineId]);

    useEffect(() => {
        if (!sessionId) return;

        setIsLoading(true);
        let supplyUnsubscribe: Unsubscribe;
        let styleUnsubscribe: Unsubscribe;

        try {
            // Subscribe to supply downtimes
            const supplyQuery = query(
                collection(db, 'supplyDowntime'),
                where('status', '==', 'Open')
            );
            supplyUnsubscribe = onSnapshot(supplyQuery, (snapshot) => {
                const fetchedSupplyDowntimes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupplyRecord));
                setActiveSupplyDowntimes(fetchedSupplyDowntimes);
                setIsLoading(false);
            });

            // Subscribe to style changeovers
            const styleQuery = query(
                collection(db, 'styleChangeovers'),
                where('status', '==', 'In Progress')
            );
            styleUnsubscribe = onSnapshot(styleQuery, (snapshot) => {
                console.log('Style changeover snapshot received:', snapshot.size, 'documents');
                const fetchedStyleChangeovers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as StyleChangeoverRecord));
                console.log('Processed style changeovers:', fetchedStyleChangeovers);
                setActiveStyleChangeovers(fetchedStyleChangeovers);
                setIsLoading(false);
            });
        } catch (err) {
            console.error('Error setting up subscriptions:', err);
            setError('Failed to load downtimes');
            setIsLoading(false);
        }

        return () => {
            if (supplyUnsubscribe) supplyUnsubscribe();
            if (styleUnsubscribe) styleUnsubscribe();
        };
    }, [sessionId]);

    const handleSelectSupplyDowntime = (downtime: SupplyRecord) => {
        setSelectedSupplyDowntime(downtime);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
    };

    const handleSelectStyleChangeover = (changeover: StyleChangeoverRecord) => {
        console.log('Style changeover selected:', changeover);
        setSelectedStyleChangeover(changeover);
        setSelectedSupplyDowntime(null);
        setShowStyleUpdateModal(true);
    };

    const handleClose = () => {
        setSelectedSupplyDowntime(null);
        setSelectedStyleChangeover(null);
        setShowStyleUpdateModal(false);
    };

    if (!lineId || !sessionId) return null;

    return (
        <div className="downtime-tracking">
            <div className="active-downtimes">
                <h2>Active Downtimes</h2>
                {isLoading ? (
                    <div className="loading-state">Loading downtimes...</div>
                ) : activeSupplyDowntimes.length === 0 && activeStyleChangeovers.length === 0 ? (
                    <p className="no-downtimes">No active downtimes</p>
                ) : (
                    <div className="downtimes-grid">
                        {/* Supply Downtimes */}
                        {activeSupplyDowntimes.map(downtime => (
                            <div
                                key={downtime.id}
                                className="downtime-card clickable"
                                onClick={() => handleSelectSupplyDowntime(downtime)}
                                style={{ cursor: 'pointer' }}
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
                        {activeStyleChangeovers.map(changeover => (
                            <div
                                key={changeover.id}
                                className="downtime-card clickable"
                                onClick={() => handleSelectStyleChangeover(changeover)}
                                style={{ cursor: 'pointer' }}
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
                                    <p><strong>Target:</strong> {changeover.target}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedSupplyDowntime && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>Close</button>
                        <SupplyUpdate
                            selectedDowntime={selectedSupplyDowntime}
                            onClose={handleClose}
                        />
                    </div>
                </div>
            )}

            {showStyleUpdateModal && selectedStyleChangeover && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-button" onClick={handleClose}>Close</button>
                        <StyleChangeUpdate
                            userRole="Supervisor"
                            userId={selectedStyleChangeover.supervisorId}
                            selectedChangeover={selectedStyleChangeover}
                        />
                    </div>
                </div>
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
