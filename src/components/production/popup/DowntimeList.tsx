// src/components/production/popup/DowntimeList.tsx
import React, { useState } from 'react';
import DowntimeActionPopup from './DowntimeActionPopup';
import './DowntimeList.css';
import { DowntimeCard } from '../../../interfaces/DowntimeCard';
import { SupportFunction } from '../../../interfaces/SupportFunction';

interface DowntimeListProps {
    downtimes: DowntimeCard[];
    onUpdate: (updatedDowntime: DowntimeCard) => void;
    mechanics: SupportFunction[];
    supervisor: SupportFunction | null;
}

const DowntimeList: React.FC<DowntimeListProps> = ({ downtimes, onUpdate, mechanics, supervisor }) => {
    const [selectedDowntime, setSelectedDowntime] = useState<DowntimeCard | null>(null);
    const [showActionPopup, setShowActionPopup] = useState<boolean>(false);

    const handleSelectDowntime = (downtime: DowntimeCard) => {
        setSelectedDowntime(downtime);
        setShowActionPopup(true);
    };

    // Handler matching the onAction signature expected by DowntimeActionPopup
    const handleAction = async (action: 'mechanicReceived' | 'resolved', mechanicId?: string): Promise<void> => {
        if (!selectedDowntime) return;

        const updatedDowntime: DowntimeCard = { ...selectedDowntime };
        const now = new Date();

        if (action === 'mechanicReceived' && mechanicId) {
            updatedDowntime.mechanicId = mechanicId;
            updatedDowntime.mechanicReceivedTime = now;
            updatedDowntime.status = 'Mechanic Received';
        } else if (action === 'resolved') {
            updatedDowntime.endTime = now;
            updatedDowntime.status = 'Resolved';
        }

        updatedDowntime.updatedAt = now;

        onUpdate(updatedDowntime);
        setShowActionPopup(false);
        setSelectedDowntime(null);
    };

    return (
        <div className="downtime-list">
            <h1>Downtime Records</h1>
            <ul>
                {downtimes.map((dt) => (
                    <li key={dt.docId}>
                        <span>{dt.category} - {dt.reason}</span>
                        <button onClick={() => handleSelectDowntime(dt)}>Manage</button>
                    </li>
                ))}
            </ul>
            {showActionPopup && selectedDowntime && (
                <DowntimeActionPopup
                    downtime={selectedDowntime}
                    onClose={() => {
                        setShowActionPopup(false);
                        setSelectedDowntime(null);
                    }}
                    onAction={handleAction} // Pass the correctly typed handler
                    mechanics={mechanics}
                    supervisor={supervisor}
                />
            )}
        </div>
    );
};

export default DowntimeList;