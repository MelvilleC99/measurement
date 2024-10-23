import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { InputText } from 'primereact/inputtext';
import Button from '@mui/material/Button';

interface Location {
    id: string;
    factory: string;
    area: string;
    line: string;
}

const LocationManager: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [factory, setFactory] = useState('');
    const [area, setArea] = useState('');
    const [line, setLine] = useState('');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        const locationSnapshot = await getDocs(collection(db, 'locations'));
        const locationData = locationSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Location[];
        setLocations(locationData);
    };

    const handleAddLocation = async () => {
        if (!factory || !line) {
            alert('Please fill out both factory and line fields');
            return;
        }
        try {
            await addDoc(collection(db, 'locations'), {
                factory,
                area,
                line,
            });
            setFactory('');
            setArea('');
            setLine('');
            fetchLocations();
        } catch (error) {
            console.error('Error adding location:', error);
        }
    };

    return (
        <div className="location-manager-container">
            <h2>Location Manager</h2>
            <div className="input-container">
                <label>Factory:</label>
                <InputText value={factory} onChange={(e) => setFactory(e.target.value)} />
                <label>Area:</label>
                <InputText value={area} onChange={(e) => setArea(e.target.value)} />
                <label>Line:</label>
                <InputText value={line} onChange={(e) => setLine(e.target.value)} />
            </div>
            <Button onClick={handleAddLocation}>Add Location</Button>

            <h3>Available Locations</h3>
            <ul>
                {locations.map((loc) => (
                    <li key={loc.id}>
                        {loc.factory} {loc.area && `→ ${loc.area}`} → {loc.line}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LocationManager;
