import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { InputText } from 'primereact/inputtext';
import Button from '@mui/material/Button';

interface Machine {
    id: string;
    type: string;
    make: string;
    model: string;
    assetNumber: string;
    location: string;
}

interface Location {
    id: string;
    factory: string;
    area: string;
    line: string;
}

const AssignMachines: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMachines();
        fetchLocations();
    }, []);

    const fetchMachines = async () => {
        const machineSnapshot = await getDocs(collection(db, 'machines'));
        const machineData = machineSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Machine[];
        setMachines(machineData);
    };

    const fetchLocations = async () => {
        const locationSnapshot = await getDocs(collection(db, 'locations'));
        const locationData = locationSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Location[];
        setLocations(locationData);
    };

    const handleMachineSelection = (machineId: string) => {
        setSelectedMachines((prevSelected) =>
            prevSelected.includes(machineId)
                ? prevSelected.filter((id) => id !== machineId)
                : [...prevSelected, machineId]
        );
    };

    const handleAssignMachines = async () => {
        if (!selectedLocation) {
            alert('Please select a location');
            return;
        }
        const batchUpdate = selectedMachines.map(async (machineId) => {
            const machineDoc = doc(db, 'machines', machineId);
            await updateDoc(machineDoc, { location: selectedLocation });
        });
        await Promise.all(batchUpdate);
        setSelectedMachines([]);
        alert('Machines assigned successfully');
        fetchMachines();
    };

    return (
        <div className="assign-machines-container">
            <h2>Assign Machines to Location</h2>

            <InputText
                className="search-box"
                placeholder="Search by Asset Number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="machine-list">
                {machines
                    .filter((machine) =>
                        machine.assetNumber.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((machine) => (
                        <div key={machine.id}>
                            <input
                                type="checkbox"
                                checked={selectedMachines.includes(machine.id)}
                                onChange={() => handleMachineSelection(machine.id)}
                            />
                            {machine.type} - {machine.assetNumber} - {machine.location || 'No location assigned'}
                        </div>
                    ))}
            </div>

            <h3>Select Location</h3>
            <select
                onChange={(e) => setSelectedLocation(e.target.value)}
                value={selectedLocation || ''}
            >
                <option value="">Select a location</option>
                {locations.map((location) => (
                    <option key={location.id} value={`${location.factory} → ${location.line}`}>
                        {location.factory} {location.area && `→ ${location.area}`} → {location.line}
                    </option>
                ))}
            </select>

            <Button onClick={handleAssignMachines}>Assign Selected Machines</Button>
        </div>
    );
};

export default AssignMachines;
