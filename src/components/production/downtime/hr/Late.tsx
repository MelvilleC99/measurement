import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { LateFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './Late.css';

interface LateProps {
    onClose: () => void;
    onSubmit: (data: LateFormData) => Promise<void>;
    productionLineId: string;
}

interface Employee {
    employeeId: string;
    name: string;
    surname: string;
    employeeNumber: string;
    department?: string;
}

const Late: React.FC<LateProps> = ({
                                       onClose,
                                       onSubmit,
                                       productionLineId
                                   }) => {
    // State for employee search and selection
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    // Supervisor selection state
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupportFunction | null>(null);
    const [password, setPassword] = useState<string>('');
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);

    // UI state
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setIsLoading(true);
                const employeesSnapshot = await getDocs(collection(db, 'supportFunctions'),);
                const fetchedEmployees = employeesSnapshot.docs.map(doc => ({
                    employeeId: doc.id,
                    ...doc.data() as Omit<Employee, 'employeeId'>
                }));
                setEmployees(fetchedEmployees);
            } catch (err) {
                console.error('Error fetching employees:', err);
                setError('Failed to load employees');
            } finally {
                setIsLoading(false);
            }
        };

        const fetchSupervisors = async () => {
            try {
                const supportFunctionsRef = collection(db, 'supportFunctions');
                const q = query(
                    supportFunctionsRef,
                    where('role', '==', 'Supervisor'),
                    where('hasPassword', '==', true)
                );

                const querySnapshot = await getDocs(q);
                const supervisorsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction));

                setSupervisors(supervisorsList);
            } catch (err) {
                console.error('Error in fetchSupervisors:', err);
                setError('Failed to fetch supervisors');
            }
        };

        fetchEmployees();
        fetchSupervisors();
    }, []);

    useEffect(() => {
        const filtered = employees.filter(emp => {
            const fullName = `${emp.name} ${emp.surname}`.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            return fullName.includes(searchLower) ||
                emp.employeeNumber.includes(searchLower);
        });
        setFilteredEmployees(filtered);
    }, [searchTerm, employees]);

    const handleEmployeeSelect = (employee: Employee) => {
        setSelectedEmployee(employee);
        setSearchTerm('');
    };

    const handleResolveClick = () => {
        setIsConfirmModalOpen(true);
        setError('');
    };

    const handlePasswordSubmit = async () => {
        if (!selectedSupervisor || !password) {
            setError('Please select a supervisor and enter password');
            return;
        }

        try {
            const supervisorQuery = query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedSupervisor.employeeNumber),
                where('password', '==', password),
                where('role', '==', 'Supervisor'),
                where('hasPassword', '==', true)
            );

            const supervisorSnapshot = await getDocs(supervisorQuery);

            if (supervisorSnapshot.empty) {
                setError('Invalid supervisor credentials');
                return;
            }

            if (!selectedEmployee) return;

            const lateData: LateFormData = {
                employeeId: selectedEmployee.employeeId,
                reason: 'late',
                date: new Date(),
                time: '',
                productionLineId,
                supervisorId: selectedSupervisor.id,
                type: 'late',
                status: 'open'
            };

            await onSubmit(lateData);
            onClose();
        } catch (err) {
            console.error('Error in handlePasswordSubmit:', err);
            setError('Failed to submit late record');
        }
    };

    const handleClose = () => {
        setIsConfirmModalOpen(false);
        setPassword('');
        setSelectedSupervisor(null);
        setError('');
    };

    if (isLoading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="loading-state">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Log Late Arrival</h2>
                    <button
                        onClick={onClose}
                        className="close-button"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError('')} className="error-dismiss">
                            ×
                        </button>
                    </div>
                )}

                {!selectedEmployee ? (
                    <div className="search-section">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or employee number..."
                            className="search-input"
                        />

                        <div className="employee-list">
                            {filteredEmployees.map(emp => (
                                <div
                                    key={emp.employeeId}
                                    className="employee-item"
                                    onClick={() => handleEmployeeSelect(emp)}
                                >
                                    <span className="employee-name">
                                        {emp.name} {emp.surname}
                                    </span>
                                    <span className="employee-number">
                                        {emp.employeeNumber}
                                    </span>
                                </div>
                            ))}
                            {filteredEmployees.length === 0 && searchTerm && (
                                <div className="no-results">
                                    No employees found
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleResolveClick(); }} className="late-form">
                        <div className="selected-employee-info">
                            <h3>Selected Employee</h3>
                            <p>{selectedEmployee.name} {selectedEmployee.surname}</p>
                            <p>Employee #: {selectedEmployee.employeeNumber}</p>
                            <button
                                type="button"
                                onClick={() => setSelectedEmployee(null)}
                                className="change-employee-button"
                            >
                                Change Employee
                            </button>
                        </div>

                        <div className="form-buttons">
                            <button type="submit" className="submit-button">
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {isConfirmModalOpen && (
                    <div className="confirmation-modal">
                        <div className="confirmation-content">
                            <div className="modal-header">
                                <h3>Supervisor Verification</h3>
                                <button className="close-button" onClick={handleClose}>×</button>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Select Supervisor:</label>
                                <select
                                    value={selectedSupervisor?.id || ''}
                                    onChange={(e) => {
                                        const supervisor = supervisors.find(s => s.id === e.target.value);
                                        setSelectedSupervisor(supervisor || null);
                                    }}
                                    className="form-input"
                                    required
                                >
                                    <option value="">Select Supervisor</option>
                                    {supervisors.map((supervisor) => (
                                        <option
                                            key={supervisor.id}
                                            value={supervisor.id}
                                        >
                                            {`${supervisor.name} ${supervisor.surname}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password:</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input"
                                    placeholder="Enter supervisor password"
                                    required
                                />
                            </div>

                            <div className="confirmation-buttons">
                                <button onClick={handlePasswordSubmit} className="confirm-button">
                                    Confirm
                                </button>
                                <button onClick={handleClose} className="cancel-button">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Late;
