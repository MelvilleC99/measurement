import React, { useState, useEffect } from 'react';
import './SupportFunctions.css';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';

interface SupportFunction {
    id: string;
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

    const roles = ['Supervisor', 'Examiner', 'QA', 'Mechanic'];

    useEffect(() => {
        const fetchSupportFunctions = async () => {
            const querySnapshot = await getDocs(collection(db, 'supportFunctions'));
            const supportFunctionsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as SupportFunction[];
            setFunctions(supportFunctionsData);
        };
        fetchSupportFunctions();
    }, []);

    const openModal = () => setIsModalOpen(true);

    const closeModal = () => {
        setIsModalOpen(false);
        resetFields();
    };

    const resetFields = () => {
        setName('');
        setSurname('');
        setEmployeeNumber('');
        setRole('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleSave = async () => {
        if (!name || !surname || !employeeNumber || !role) {
            alert('Please fill out all fields.');
            return;
        }

        const newFunction = {
            name,
            surname,
            employeeNumber,
            role,
            hasPassword: false,
        };

        try {
            await addDoc(collection(db, 'supportFunctions'), newFunction);
            setFunctions([...functions, { ...newFunction, id: '' }]);
            closeModal();
        } catch (error) {
            console.error('Error adding support function:', error);
        }
    };

    const openPasswordModal = () => setIsPasswordModalOpen(true);

    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        resetFields();
    };

    const handlePasswordChange = async () => {
        if (password !== confirmPassword || password.length < 6) {
            alert('Passwords must match and be at least 6 characters.');
            return;
        }

        try {
            if (selectedFunction) {
                const docRef = doc(db, 'supportFunctions', selectedFunction.id);
                await updateDoc(docRef, { hasPassword: true });
                setFunctions(
                    functions.map(func =>
                        func.id === selectedFunction.id
                            ? { ...func, hasPassword: true }
                            : func
                    )
                );
            }
            closePasswordModal();
        } catch (error) {
            console.error('Error updating password:', error);
        }
    };

    const selectFunction = (func: SupportFunction) => {
        setSelectedFunction(func);
    };

    return (
        <div className="support-functions-container">
            {/* Heading Bar with Home Button */}
            <div className="header-bar">
                <button className="home-button" onClick={() => window.history.back()}>Home</button>
                <h1 className="title">Support Functions</h1>
            </div>

            <div className="support-functions-content">
                <div className="support-functions-card">
                    <div className="card-content">
                        <button className="create-button green-button" onClick={openModal}>
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
                            {functions.map(func => (
                                <tr key={func.id} onClick={() => selectFunction(func)}>
                                    <td>{func.name}</td>
                                    <td>{func.surname}</td>
                                    <td>{func.employeeNumber}</td>
                                    <td>{func.role}</td>
                                    <td>{func.hasPassword ? 'Yes' : 'No'}</td>
                                    <td>
                                        <button className="edit-button red-button" onClick={openPasswordModal}>
                                            Edit Password
                                        </button>
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
                                onChange={e => setName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Surname"
                                value={surname}
                                onChange={e => setSurname(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Employee Number"
                                value={employeeNumber}
                                onChange={e => setEmployeeNumber(e.target.value)}
                            />
                            <select value={role} onChange={e => setRole(e.target.value)}>
                                <option value="">Select Role</option>
                                {roles.map(r => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>

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
                                onChange={e => setPassword(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Retype Password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            <div className="modal-buttons">
                                <button onClick={handlePasswordChange}>Save</button>
                                <button onClick={closePasswordModal}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportFunctions;