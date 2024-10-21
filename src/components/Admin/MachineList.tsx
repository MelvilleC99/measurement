import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import Papa, { ParseResult } from 'papaparse'; // For CSV parsing
import { db } from '../../firebase';
import './MachineList.css';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputText } from 'primereact/inputtext'; // For cleaner input fields
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'; // For delete confirmation

interface Machine {
    id: string;
    type: string;
    make: string;
    model: string;
    assetNumber: string;
}

const MachineList: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [type, setType] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [assetNumber, setAssetNumber] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        const machineSnapshot = await getDocs(collection(db, 'machines'));
        const machineData = machineSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Machine[];
        setMachines(machineData);
    };

    const openModal = (machine?: Machine) => {
        if (machine) {
            setSelectedMachine(machine);
            setType(machine.type);
            setMake(machine.make);
            setModel(machine.model);
            setAssetNumber(machine.assetNumber);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setSelectedMachine(null);
        setType('');
        setMake('');
        setModel('');
        setAssetNumber('');
    };

    const handleSaveMachine = async () => {
        if (!type || !make || !model || !assetNumber) {
            alert('Please fill out all fields');
            return;
        }

        try {
            if (selectedMachine) {
                const machineDoc = doc(db, 'machines', selectedMachine.id);
                await updateDoc(machineDoc, {
                    type,
                    make,
                    model,
                    assetNumber,
                });
            } else {
                await addDoc(collection(db, 'machines'), {
                    type,
                    make,
                    model,
                    assetNumber,
                });
            }

            resetForm();
            setIsModalOpen(false);
            fetchMachines();
        } catch (error) {
            console.error('Error saving machine:', error);
        }
    };

    const handleDeleteMachine = async (id: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this machine?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                const machineDoc = doc(db, 'machines', id);
                await deleteDoc(machineDoc);
                fetchMachines();
            },
        });
    };

    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: (result: ParseResult<{ [key: string]: string }>) => {
                const data = result.data;
                data.forEach(async (row) => {
                    await addDoc(collection(db, 'machines'), {
                        type: row['Type'],
                        make: row['Make'],
                        model: row['Model'],
                        assetNumber: row['Asset Number'],
                    });
                });
                fetchMachines();
            },
            skipEmptyLines: true,
        });
    };

    const downloadTemplate = () => {
        const csvContent = 'data:text/csv;charset=utf-8,Type,Make,Model,Asset Number\n';
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'machine_template.csv');
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="machine-admin-container">
            <ConfirmDialog />
            <div className="toolbar">
                <Button onClick={() => openModal()}>Add Machine</Button>
                <Button onClick={() => document.getElementById('csvFileInput')?.click()}>Upload CSV</Button>
                <Button onClick={downloadTemplate}>Download CSV Template</Button>
                <input
                    type="file"
                    id="csvFileInput"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleCSVUpload}
                />
            </div>

            <div className="main-content">
                <h2>Machines</h2>
                <InputText
                    className="search-box"
                    type="text"
                    placeholder="Search by Asset Number"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="table-container">
                    <table className="machine-list-table">
                        <thead>
                        <tr>
                            <th>Type</th>
                            <th>Make</th>
                            <th>Model</th>
                            <th>Asset Number</th>
                            <th>Edit</th>
                            <th>Delete</th>
                        </tr>
                        </thead>
                        <tbody>
                        {machines
                            .filter((machine) =>
                                machine.assetNumber.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((machine) => (
                                <tr key={machine.id}>
                                    <td>{machine.type}</td>
                                    <td>{machine.make}</td>
                                    <td>{machine.model}</td>
                                    <td>{machine.assetNumber}</td>
                                    <td>
                                        <IconButton onClick={() => openModal(machine)}>
                                            <EditIcon />
                                        </IconButton>
                                    </td>
                                    <td>
                                        <IconButton onClick={() => handleDeleteMachine(machine.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{selectedMachine ? 'Edit Machine' : 'Add Machine'}</h2>
                        <div className="input-container">
                            <label htmlFor="type">Type:</label>
                            <InputText
                                id="type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            />
                            <label htmlFor="make">Make:</label>
                            <InputText
                                id="make"
                                value={make}
                                onChange={(e) => setMake(e.target.value)}
                            />
                            <label htmlFor="model">Model:</label>
                            <InputText
                                id="model"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            />
                            <label htmlFor="assetNumber">Asset Number:</label>
                            <InputText
                                id="assetNumber"
                                value={assetNumber}
                                onChange={(e) => setAssetNumber(e.target.value)}
                            />
                        </div>
                        <div className="modal-buttons">
                            <Button className="save-btn" onClick={handleSaveMachine}>
                                {selectedMachine ? 'Save Changes' : 'Save'}
                            </Button>
                            <Button className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            {selectedMachine && (
                                <Button
                                    className="delete-btn"
                                    onClick={() => handleDeleteMachine(selectedMachine.id)}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MachineList;