import React, { useState } from 'react';
import './SupportFunctions.css';

interface SupportFunction {
    id: number;
    name: string;
    surname: string;
    employeeNumber: string;
    role: string;
    hasPassword: boolean;
}

const SupportFunctions: React.FC = () => {
    const [functions, setFunctions] = useState<SupportFunction[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedFunction, setSelectedFunction] = useState<SupportFunction | null>(null);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isAssigningPassword, setIsAssigningPassword] = useState(false);

    const roles = ['Supervisor', 'Examiner', 'QA', 'Mechanic'];

    // Open the modal to add a new support function
    const openModal = () => setIsModalOpen(true);

    // Close the modal
    const closeModal = () => {
        setIsModalOpen(false);
        resetFields();
    };

    // Reset input fields
    const resetFields = () => {
        setName('');
        setSurname('');
        setEmployeeNumber('');
        setRole('');
        setPassword('');
        setConfirmPassword('');
        setIsAssigningPassword(false);
    };

    // Save the new support function
    const handleSave = () => {
        if (!name || !surname || !employeeNumber || !role) {
            alert('Please fill out all fields.');
            return;
        }

        const newFunction: SupportFunction = {
            id: functions.length + 1,
            name,
            surname,
            employeeNumber,
            role,
            hasPassword: isAssigningPassword,
        };

        setFunctions([...functions, newFunction]);
        closeModal();
    };

    // Open the password modal
    const openPasswordModal = () => setIsPasswordModalOpen(true);

    // Close the password modal
    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        resetFields();
    };

    // Handle password change or addition
    const handlePasswordChange = () => {
        if (password !== confirmPassword || password.length < 6) {
            alert('Passwords must match and be at least 6 characters.');
            return;
        }

        alert('Password set/changed successfully.');
        closePasswordModal();
    };

    // Select function to edit, delete, or change password
    const selectFunction = (func: SupportFunction) => {
        setSelectedFunction(func);
    };

    return (
        <div className="support-functions-container">
            <div className="support-functions-card">
                <div className="card-header">
                    <h1 className="title">Support Functions</h1>
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <button className="create-button" onClick={openModal}>
                        Add Support Function
                    </button>
                    <table className="support-functions-table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Surname</th>
                            <th>Employee Number</th>
                            <th>Role</th>
                            <th>Password Assigned</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {functions.map((func) => (
                            <tr key={func.id} onClick={() => selectFunction(func)}>
                                <td>{func.name}</td>
                                <td>{func.surname}</td>
                                <td>{func.employeeNumber}</td>
                                <td>{func.role}</td>
                                <td>{func.hasPassword ? 'Yes' : 'No'}</td>
                                <td>
                                    <button onClick={openPasswordModal}>Add/Change Password</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Support Function Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Add Support Function</h2>
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Surname"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Employee Number"
                            value={employeeNumber}
                            onChange={(e) => setEmployeeNumber(e.target.value)}
                        />
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="">Select Role</option>
                            {roles.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>

                        {/* Add Password Button */}
                        <button className="assign-password-button" onClick={openPasswordModal}>
                            Add Password
                        </button>

                        <div className="modal-buttons">
                            <button onClick={handleSave}>Save</button>
                            <button onClick={closeModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{selectedFunction ? 'Change Password' : 'Set Password'}</h2>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Retype Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <div className="modal-buttons">
                            <button onClick={handlePasswordChange}>Save</button>
                            <button onClick={closePasswordModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportFunctions;