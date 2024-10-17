import React, { useState, useEffect } from 'react';
import './SupportFunctions.css';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputText } from 'primereact/inputtext'; // For cleaner input fields
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'; // For delete confirmation

interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber: string;
    role: string;
    hasPassword: boolean;
}

interface Role {
    id: string;
    name: string;
    description: string;
}

const SupportFunctions: React.FC = () => {
    const [supportFunctions, setSupportFunctions] = useState<SupportFunction[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false); // For adding roles
    const [isViewRolesModalOpen, setIsViewRolesModalOpen] = useState(false); // For viewing roles
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedFunction, setSelectedFunction] = useState<SupportFunction | null>(null);
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const functionsSnapshot = await getDocs(collection(db, 'supportFunctions'));
        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        const functionsData = functionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupportFunction[];
        const rolesData = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setSupportFunctions(functionsData);
        setRoles(rolesData);
    };

    const handleSaveFunction = async () => {
        if (name && surname && employeeNumber && role) {
            if (selectedFunction) {
                const functionDoc = doc(db, 'supportFunctions', selectedFunction.id);
                await updateDoc(functionDoc, { name, surname, employeeNumber, role, hasPassword: !!password });
            } else {
                await addDoc(collection(db, 'supportFunctions'), { name, surname, employeeNumber, role, hasPassword: !!password });
            }
            fetchData();
            setIsFunctionModalOpen(false);
        } else {
            alert('Please fill all the fields');
        }
    };

    const confirmDelete = (id: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this function?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                await deleteDoc(doc(db, 'supportFunctions', id));
                fetchData();
            },
            reject: () => setConfirmDeleteId(null),
        });
    };

    const handleDeleteFunction = async (id: string) => {
        confirmDelete(id);
    };

    const handleDeleteRole = async (id: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this role?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                await deleteDoc(doc(db, 'roles', id));
                fetchData();
            },
            reject: () => setConfirmDeleteId(null),
        });
    };

    const handleSavePassword = async () => {
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        if (selectedFunction) {
            const functionDoc = doc(db, 'supportFunctions', selectedFunction.id);
            await updateDoc(functionDoc, { hasPassword: !!password });
            fetchData();
            setIsPasswordModalOpen(false);
        }
    };

    // Save Role (for Add Role functionality)
    const handleSaveRole = async () => {
        if (roleName && roleDescription) {
            const roleDoc = roles.find(r => r.name === roleName);
            if (roleDoc) {
                await updateDoc(doc(db, 'roles', roleDoc.id), { name: roleName, description: roleDescription });
            } else {
                await addDoc(collection(db, 'roles'), { name: roleName, description: roleDescription });
            }
            setRoleName('');
            setRoleDescription('');
            await fetchData();
            setIsRoleModalOpen(false);
        } else {
            alert("Please provide Role Name and Description");
        }
    };

    const openFunctionModal = (func?: SupportFunction) => {
        if (func) {
            setSelectedFunction(func);
            setName(func.name);
            setSurname(func.surname);
            setEmployeeNumber(func.employeeNumber);
            setRole(func.role);
            setPassword('');
            setConfirmPassword('');
        } else {
            setSelectedFunction(null);
            setName('');
            setSurname('');
            setEmployeeNumber('');
            setRole('');
            setPassword('');
            setConfirmPassword('');
        }
        setIsFunctionModalOpen(true);
    };

    const openPasswordModal = (func: SupportFunction) => {
        setSelectedFunction(func);
        setPassword('');
        setConfirmPassword('');
        setIsPasswordModalOpen(true);
    };

    const openRoleModal = () => {
        setRoleName('');
        setRoleDescription('');
        setIsRoleModalOpen(true); // This opens the modal for adding roles
    };

    const openViewRolesModal = () => {
        setIsViewRolesModalOpen(true); // Open the modal for viewing roles
    };

    return (
        <div className="support-functions-container">
            <ConfirmDialog />

            <div className="toolbar">
                <button onClick={() => openFunctionModal()}>Add Support Function</button>
                <button onClick={openRoleModal}>Add Role</button> {/* Add Role Button */}
                <button onClick={openViewRolesModal}>View Roles</button> {/* View Roles */}
            </div>

            <div className="content-area">
                <h2>Support Functions</h2>
                <table className="support-functions-table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Surname</th>
                        <th>Employee Number</th>
                        <th>Role</th>
                        <th>Has Password</th>
                        <th>Edit</th>
                        <th>Password</th>
                    </tr>
                    </thead>
                    <tbody>
                    {supportFunctions.map((func) => (
                        <tr key={func.id}>
                            <td>{func.name}</td>
                            <td>{func.surname}</td>
                            <td>{func.employeeNumber}</td>
                            <td>{func.role}</td>
                            <td>{func.hasPassword ? 'Yes' : 'No'}</td>
                            <td>
                                <IconButton onClick={() => openFunctionModal(func)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton onClick={() => handleDeleteFunction(func.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </td>
                            <td>
                                <IconButton onClick={() => openPasswordModal(func)}>
                                    <EditIcon />
                                </IconButton>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Function Modal */}
            {isFunctionModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{selectedFunction ? 'Edit Support Function' : 'Add Support Function'}</h2>
                        <div className="input-container">
                            <label htmlFor="name">Name:</label>
                            <InputText id="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
                            <label htmlFor="surname">Surname:</label>
                            <InputText id="surname" value={surname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSurname(e.target.value)} />
                            <label htmlFor="employeeNumber">Employee Number:</label>
                            <InputText id="employeeNumber" value={employeeNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployeeNumber(e.target.value)} />
                            <label htmlFor="role">Role:</label>
                            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="">Select Role</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-buttons">
                            <Button onClick={handleSaveFunction}>Save</Button>
                            <Button onClick={() => setIsFunctionModalOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Role Modal */}
            {isRoleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Add Role</h2>
                        <div className="input-container">
                            <label htmlFor="roleName">Role Name:</label>
                            <InputText id="roleName" value={roleName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoleName(e.target.value)} />
                            <label htmlFor="roleDescription">Role Description:</label>
                            <InputText id="roleDescription" value={roleDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoleDescription(e.target.value)} />
                        </div>
                        <div className="modal-buttons">
                            <Button onClick={handleSaveRole}>Save</Button>
                            <Button onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Roles Modal */}
            {isViewRolesModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>View Roles</h2>
                        <table className="roles-table">
                            <thead>
                            <tr>
                                <th>Role Name</th>
                                <th>Description</th>
                                <th>Edit</th>
                                <th>Delete</th>
                            </tr>
                            </thead>
                            <tbody>
                            {roles.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.name}</td>
                                    <td>{r.description}</td>
                                    <td>
                                        <IconButton onClick={() => openRoleModal()}>
                                            <EditIcon />
                                        </IconButton>
                                    </td>
                                    <td>
                                        <IconButton onClick={() => handleDeleteRole(r.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <div className="modal-buttons">
                            <Button onClick={() => setIsViewRolesModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Change Password</h2>
                        <div className="input-container">
                            <label htmlFor="password">Password:</label>
                            <InputText type="password" id="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
                            <label htmlFor="confirmPassword">Confirm Password:</label>
                            <InputText type="password" id="confirmPassword" value={confirmPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} />
                        </div>
                        <div className="modal-buttons">
                            <Button onClick={handleSavePassword}>Save</Button>
                            <Button onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportFunctions;