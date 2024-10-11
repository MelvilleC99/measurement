// src/components/Admin/MachineList.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MachineList.css';

interface Machine {
    id: number;
    type: string;
    make: string;
    model: string;
    assetNumber: string;
}

const MachineList: React.FC = () => {
    const navigate = useNavigate();
    const [machines, setMachines] = useState<Machine[]>([]);
    const [type, setType] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [assetNumber, setAssetNumber] = useState('');

    const handleAddMachine = () => {
        if (!type || !make || !model || !assetNumber) {
            alert('Please fill out all fields.');
            return;
        }

        const newMachine: Machine = {
            id: machines.length + 1,
            type,
            make,
            model,
            assetNumber,
        };

        setMachines([...machines, newMachine]);
        setType('');
        setMake('');
        setModel('');
        setAssetNumber('');
    };

    return (
        <div className="machine-list-container">
            <div className="machine-list-card">
                <div className="card-header">
                    <h1>Machine List</h1>
                    <button className="back-button" onClick={() => navigate('/admin')}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Make"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Model"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Asset Number"
                            value={assetNumber}
                            onChange={(e) => setAssetNumber(e.target.value)}
                        />
                        <button className="add-button" onClick={handleAddMachine}>
                            Add Machine
                        </button>
                    </div>

                    <div className="list-container">
                        <h2>Existing Machines</h2>
                        <ul>
                            {machines.map((machine) => (
                                <li key={machine.id}>
                                    {machine.type} - {machine.make} {machine.model} (Asset No: {machine.assetNumber})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineList;