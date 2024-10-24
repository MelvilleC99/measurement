// src/components/production/popup/ParentComponent.tsx
import React, { useState } from 'react';
import DowntimeList from './DowntimeList';
import DowntimePopup from './DowntimePopup';
import './ParentComponent.css';
import { DowntimeCard } from '../../../interfaces/DowntimeCard';
import { SupportFunction } from '../../../interfaces/SupportFunction';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase'; // Adjust the import path as needed

const ParentComponent: React.FC = () => {
    const [downtimes, setDowntimes] = useState<DowntimeCard[]>([]);
    const [showPopup, setShowPopup] = useState<boolean>(false);

    // Example data for mechanics and supervisor
    const mechanics: SupportFunction[] = [
        { id: 'mech1', name: 'John', surname: 'Doe', password: 'password123' },
        { id: 'mech2', name: 'Jane', surname: 'Smith', password: 'password123' },
    ];

    const supervisor: SupportFunction | null = { id: 'sup1', name: 'Alice', surname: 'Brown', password: 'password123' };

    const downtimeCategories = [
        { categoryName: 'Style Change Over', reasons: ['Change to Style A', 'Change to Style B'] },
        { categoryName: 'Supply', reasons: ['Supply Shortage', 'Delivery Delay'] },
        { categoryName: 'Maintenance', reasons: ['Machine Failure', 'Routine Check'] },
        // Add more categories as needed
    ];

    const handleUpdateDowntime = async (updatedDowntime: DowntimeCard) => {
        setDowntimes(prev => {
            const index = prev.findIndex(dt => dt.docId === updatedDowntime.docId);
            if (index !== -1) {
                const updatedList = [...prev];
                updatedList[index] = updatedDowntime;
                return updatedList;
            }
            return [...prev, updatedDowntime];
        });

        // Update Firestore
        if (updatedDowntime.docId.startsWith('manualDocId')) {
            // Handle manual downtime card creation (assuming manualDocId prefixes new cards)
            try {
                const docRef = await addDoc(collection(db, 'downtimes'), {
                    ...updatedDowntime,
                    createdAt: Timestamp.fromDate(updatedDowntime.createdAt),
                    updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
                });
                // Update the docId with the Firestore-generated ID
                setDowntimes(prev => prev.map(dt => dt.docId === updatedDowntime.docId ? { ...dt, docId: docRef.id } : dt));
            } catch (e) {
                console.error("Error adding document: ", e);
            }
        } else {
            // Update existing Firestore document
            try {
                const docRef = doc(db, 'downtimes', updatedDowntime.docId);
                await updateDoc(docRef, {
                    ...updatedDowntime,
                    updatedAt: Timestamp.fromDate(updatedDowntime.updatedAt),
                });
            } catch (e) {
                console.error("Error updating document: ", e);
            }
        }
    };

    const handleSubmit = (data: DowntimeCard) => {
        // Handle submission logic
        handleUpdateDowntime(data);
    };

    return (
        <div className="parent-component">
            <button onClick={() => setShowPopup(true)}>Add Downtime</button>
            <DowntimeList
                downtimes={downtimes}
                onUpdate={handleUpdateDowntime}
                mechanics={mechanics}
                supervisor={supervisor}
            />
            {showPopup && (
                <DowntimePopup
                    onClose={() => setShowPopup(false)}
                    downtimeCategories={downtimeCategories}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

export default ParentComponent;