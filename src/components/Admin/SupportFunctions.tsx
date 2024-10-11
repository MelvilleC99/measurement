// src/components/Admin/SupportFunctions.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SupportFunctions.css';

interface SupportFunction {
    id: number;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    role: string;
}

const SupportFunctions: React.FC = () => {
    const navigate = useNavigate();
    const [supportFunctions, setSupportFunctions] = useState<SupportFunction[]>([]);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [role, setRole] = useState('Supervisor');

    const handleAddSupport = () => {
        if (!firstName || !lastName || !employeeNumber) {
            alert('Please fill out all fields.');
            return;
        }

        const newSupport: SupportFunction = {
            id: supportFunctions.length + 1,
            firstName,
            lastName,
            employeeNumber,
            role,
        };

        setSupportFunctions([...supportFunctions, newSupport]);
        setFirstName('');
        setLastName('');
        setEmployeeNumber('');
        setRole('Supervisor');
    };

    return (
        <div className="support-functions-container">
            <div className="support-functions-card">
                <div className="card-header">
                    <h1>Support Functions</h1>
                    <button className="back-button" onClick={() => navigate('/admin')}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Employee Number"
                            value={employeeNumber}
                            onChange={(e) => setEmployeeNumber(e.target.value)}
                        />
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Examiner">Examiner</option>
                            <option value="QA">QA</option>
                            <option value="Mechanic">Mechanic</option>
                        </select>
                        <button className="add-button" onClick={handleAddSupport}>
                            Add Support Function
                        </button>
                    </div>

                    <div className="list-container">
                        <h2>Existing Support Functions</h2>
                        <ul>
                            {supportFunctions.map((sf) => (
                                <li key={sf.id}>
                                    {sf.firstName} {sf.lastName} - {sf.role} (Emp. No: {sf.employeeNumber})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportFunctions;