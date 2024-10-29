import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { SupplyRecord } from '../../downtime/types';
import SupplyUpdate from '../../downtime/supply/SupplyUpdate';
import './DowntimeTracking.css';

interface DowntimeTrackingProps {
    sessionId: string;
    lineId: string;
}

const DowntimeTracking: React.FC<DowntimeTrackingProps> = ({ sessionId, lineId }) => {
    const [activeDowntimes, setActiveDowntimes] = useState<SupplyRecord[]>([]);
    const [error, setError] = useState<string>('');
    const [selectedDowntime, setSelectedDowntime] = useState<SupplyRecord | null>(null);

    const fetchActiveDowntimes = async () => {
        if (!sessionId) return;

        try {
            const supplyQuery = query(
                collection(db, 'supplyDowntime'),
                where('status', '==', 'Open')
            );

            const supplySnapshot = await getDocs(supplyQuery);
            const fetchedSupplyDowntimes = supplySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SupplyRecord));

            setActiveDowntimes(fetchedSupplyDowntimes);
        } catch (err) {
            setError('Failed to fetch active downtimes');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            await fetchActiveDowntimes();
        };

        fetchData();
        const interval = setInterval(fetchActiveDowntimes, 30000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleSelectDowntime = (downtime: SupplyRecord) => {
        setSelectedDowntime(downtime);
    };

    const handleClose = () => {
        setSelectedDowntime(null);
        fetchActiveDowntimes();
    };

    if (!lineId || !sessionId) return null;

    return (
        <div className="downtime-tracking">
            <div className="active-downtimes">
                <h2>Active Downtimes</h2>
                {activeDowntimes.length === 0 ? (
                    <p className="no-downtimes">No active downtimes</p>
                ) : (
                    <div className="downtimes-grid">
                        {activeDowntimes.map(downtime => (
                            <div
                                key={downtime.id}
                                className="downtime-card clickable"
                                onClick={() => handleSelectDowntime(downtime)}
                            >
                                <div className="card-header">
                                    <h3>{downtime.type}</h3>
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
                    </div>
                )}
            </div>

            {selectedDowntime && (
                <SupplyUpdate
                    selectedDowntime={selectedDowntime}
                    onClose={handleClose}
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
