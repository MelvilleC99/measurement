import React, { useState, useEffect } from 'react';
import Absent from './Absent';
import Late from './Late';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { AbsentFormData, LateFormData } from '../types';
import { SupportFunction } from '../../../../types';
import './HRFlow.css';

interface HRFlowProps {
    productionLineId: string;
}

const HRFlow: React.FC<HRFlowProps> = ({ productionLineId }) => {
    const [activeTab, setActiveTab] = useState<'absent' | 'late'>('absent');
    const [error, setError] = useState<string>('');
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupportFunction | null>(null);

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const supervisorsRef = collection(db, 'supportFunctions');
                const q = query(supervisorsRef, where('role', '==', 'Supervisor'));
                const querySnapshot = await getDocs(q);
                const supervisorsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction));
                setSupervisors(supervisorsData);
            } catch (err) {
                console.error('Error fetching supervisors:', err);
                setError('Failed to load supervisors.');
            }
        };

        fetchSupervisors();
    }, []);

    const handleAbsentSubmit = async (data: AbsentFormData): Promise<void> => {
        try {
            if (!selectedSupervisor) {
                throw new Error('Supervisor must be selected');
            }
            const enrichedData: AbsentFormData = {
                ...data,
                productionLineId,
                supervisorId: selectedSupervisor.id
            };
            console.log('Absent Data:', enrichedData);
            alert('Absent data submitted successfully.');
            setActiveTab('late');
        } catch (err) {
            console.error('Error handling absent submission:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit absent data.');
        }
    };

    const handleLateSubmit = async (data: LateFormData): Promise<void> => {
        try {
            if (!selectedSupervisor) {
                throw new Error('Supervisor must be selected');
            }
            const enrichedData: LateFormData = {
                ...data,
                productionLineId,
                supervisorId: selectedSupervisor.id
            };
            console.log('Late Arrival Data:', enrichedData);
            alert('Late arrival data submitted successfully.');
            setActiveTab('absent');
        } catch (err) {
            console.error('Error handling late submission:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit late arrival data.');
        }
    };

    return (
        <div className="hr-flow-container">
            <h1>HR Flow</h1>

            <div className="supervisor-selection">
                <select
                    value={selectedSupervisor?.id || ''}
                    onChange={(e) => {
                        const supervisor = supervisors.find(s => s.id === e.target.value);
                        setSelectedSupervisor(supervisor || null);
                    }}
                    className="supervisor-select"
                >
                    <option value="">Select Supervisor</option>
                    {supervisors.map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                            {supervisor.name} {supervisor.surname}
                        </option>
                    ))}
                </select>
            </div>

            <div className="tabs">
                <button
                    className={`tab-button ${activeTab === 'absent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('absent')}
                >
                    Absent
                </button>
                <button
                    className={`tab-button ${activeTab === 'late' ? 'active' : ''}`}
                    onClick={() => setActiveTab('late')}
                >
                    Late Arrival
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'late' ? (
                    <Late
                        onClose={() => setActiveTab('absent')}
                        onSubmit={handleLateSubmit}
                        productionLineId={productionLineId}

                    />
                ) : (
                    <Absent
                        onClose={() => setActiveTab('late')}
                        onSubmit={handleAbsentSubmit}
                        productionLineId={productionLineId}

                    />
                )}
            </div>

            {error && (
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button
                        onClick={() => setError('')}
                        className="error-dismiss"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};

export default HRFlow;