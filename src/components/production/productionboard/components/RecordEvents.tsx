import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import Rework from '../../downtime/rework/Rework';
import ReworkUpdate from '../../downtime/rework/ReworkUpdate';
import Reject from '../../downtime/reject/Reject';
import Late from '../../downtime/hr/Late';
import Absent from '../../downtime/hr/Absent';
import SupplyLog from '../../downtime/supply/Supply';
import StyleChangeover from '../../downtime/stylechange/StyleChangeover'; // Component
import {
    ReworkFormData,
    RejectFormData,
    LateFormData,
    AbsentFormData,
    SupplyFormData
} from '../../downtime/types';
import { StyleChangeoverFormData } from '../../downtime/types'; // Type import
import { SupportFunction } from '../../../../types';
import './RecordEvents.css';

interface RecordEventsProps {
    sessionId: string;
    lineId: string;
    supervisorId: string;
    onEventRecorded: (eventType: 'rejects' | 'reworks' | 'late' | 'absent', count: number) => void;
}

const RecordEvents: React.FC<RecordEventsProps> = ({
                                                       sessionId,
                                                       lineId,
                                                       supervisorId,
                                                       onEventRecorded
                                                   }) => {
    // State Management
    const [activeSection, setActiveSection] = useState<'hr' | 'downtime' | null>(null);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isReworkUpdateModalOpen, setIsReworkUpdateModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isLateModalOpen, setIsLateModalOpen] = useState(false);
    const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
    const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
    const [isStyleChangeoverModalOpen, setIsStyleChangeoverModalOpen] = useState(false);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [error, setError] = useState<string>('');

    // Fetch QCs on component mount
    useEffect(() => {
        const fetchQCs = async () => {
            try {
                const qcsSnapshot = await getDocs(
                    query(collection(db, 'supportFunctions'),
                        where('role', '==', 'QC'))
                );
                const qcsList = qcsSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as SupportFunction))
                    .filter(sf => sf.role === 'QC');
                setQcs(qcsList);
            } catch (error) {
                console.error('Error fetching QCs:', error);
                setError('Failed to load QCs.');
            }
        };

        fetchQCs();
    }, []);

    const downtimeCategories = [
        { id: 'machine', name: 'Machine' },
        { id: 'quality', name: 'Quality' },
        { id: 'supply', name: 'Supply' },
        { id: 'styleChange', name: 'Style Change' }
    ];

    // Event Handlers
    const handleReworkSubmit = async (data: ReworkFormData) => {
        try {
            const reworkDocRef = await addDoc(collection(db, 'reworks'), {
                ...data,
                status: 'Open',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            const refNumber = reworkDocRef.id.slice(-4);
            await updateDoc(doc(db, 'reworks', reworkDocRef.id), {
                refNumber
            });

            onEventRecorded('reworks', data.count);
            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error submitting rework:', error);
            setError('Failed to submit rework.');
        }
    };

    const handleReworkUpdate = () => {
        setIsReworkUpdateModalOpen(true);
    };

    const handleRejectSubmit = async (data: RejectFormData) => {
        try {
            await addDoc(collection(db, 'rejects'), {
                ...data,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onEventRecorded('rejects', data.count);
            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error submitting reject:', error);
            setError('Failed to submit reject.');
        }
    };

    const handleLateSubmit = async (data: LateFormData) => {
        try {
            await addDoc(collection(db, 'attendance'), {
                ...data,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onEventRecorded('late', 1);
            setIsLateModalOpen(false);
        } catch (error) {
            console.error('Error submitting late attendance:', error);
            setError('Failed to submit late attendance.');
        }
    };

    const handleAbsentSubmit = async (data: AbsentFormData) => {
        try {
            await addDoc(collection(db, 'attendance'), {
                ...data,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            onEventRecorded('absent', 1);
            setIsAbsentModalOpen(false);
        } catch (error) {
            console.error('Error submitting absence:', error);
            setError('Failed to submit absence.');
        }
    };

    const handleSupplySubmit = async (data: SupplyFormData) => {
        try {
            await addDoc(collection(db, 'supplyDowntime'), {
                ...data,
                createdAt: Timestamp.now(),
                startTime: Timestamp.now(),
                status: 'Open' as const,
            });
            setIsSupplyModalOpen(false);
        } catch (err) {
            console.error('Error logging supply downtime:', err);
            setError('Failed to log supply downtime.');
        }
    };

    const handleStyleChangeoverSubmit = async (data: StyleChangeoverFormData) => {
        try {
            await addDoc(collection(db, 'styleChangeovers'), {
                ...data,
                createdAt: Timestamp.now(),
                status: 'In Progress',
                progressSteps: {
                    machineSetupComplete: false,
                    peopleAllocated: false,
                    firstUnitOffLine: false,
                    qcApproved: false
                }
            });
            setIsStyleChangeoverModalOpen(false);
        } catch (error) {
            console.error('Error submitting style changeover:', error);
            setError('Failed to submit style changeover.');
        }
    };

    return (
        <div className="time-table-section">
            <div className="slot-selection">
                {activeSection === null ? (
                    <div className="button-grid">
                        <button
                            onClick={() => setIsRejectModalOpen(true)}
                            className="output-button reject"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => setIsReworkModalOpen(true)}
                            className="output-button rework"
                        >
                            Rework
                        </button>
                        <button
                            onClick={() => setActiveSection('hr')}
                            className="output-button hr"
                        >
                            HR
                        </button>
                        <button
                            onClick={() => setActiveSection('downtime')}
                            className="output-button downtime"
                        >
                            Downtime
                        </button>
                        <button
                            onClick={() => handleReworkUpdate()}
                            className="output-button manage-rework"
                        >
                            Manage Reworks
                        </button>
                    </div>
                ) : (
                    <div className="section-content">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="back-link"
                        >
                            ← Back to Main Menu
                        </button>

                        {activeSection === 'hr' && (
                            <div className="button-grid">
                                <button
                                    onClick={() => setIsLateModalOpen(true)}
                                    className="output-button"
                                >
                                    Late
                                </button>
                                <button
                                    onClick={() => setIsAbsentModalOpen(true)}
                                    className="output-button"
                                >
                                    Absent
                                </button>
                            </div>
                        )}

                        {activeSection === 'downtime' && (
                            <div className="button-grid">
                                {downtimeCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            if (category.id === 'supply') {
                                                setIsSupplyModalOpen(true);
                                            } else if (category.id === 'styleChange') {
                                                setIsStyleChangeoverModalOpen(true);
                                            } else {
                                                console.log(category.id);
                                            }
                                        }}
                                        className="output-button"
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Modals */}
                {isReworkModalOpen && (
                    <Rework
                        onClose={() => setIsReworkModalOpen(false)}
                        onSubmit={handleReworkSubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                        qcs={qcs}
                    />
                )}

                {isReworkUpdateModalOpen && (
                    <ReworkUpdate
                        onClose={() => setIsReworkUpdateModalOpen(false)}
                    />
                )}

                {isRejectModalOpen && (
                    <Reject
                        onClose={() => setIsRejectModalOpen(false)}
                        onSubmit={handleRejectSubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                        qcs={qcs}
                    />
                )}

                {isLateModalOpen && (
                    <Late
                        onClose={() => setIsLateModalOpen(false)}
                        onSubmit={handleLateSubmit}
                        productionLineId={lineId}

                    />
                )}

                {isAbsentModalOpen && (
                    <Absent
                        onClose={() => setIsAbsentModalOpen(false)}
                        onSubmit={handleAbsentSubmit}
                        productionLineId={lineId}

                    />
                )}

                {isSupplyModalOpen && (
                    <SupplyLog
                        onClose={() => setIsSupplyModalOpen(false)}
                        onSubmit={handleSupplySubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                    />
                )}

                {isStyleChangeoverModalOpen && (
                    <StyleChangeover
                        onClose={() => setIsStyleChangeoverModalOpen(false)}
                        onSubmit={handleStyleChangeoverSubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                    />
                )}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="error-dismiss-button">✕</button>
                </div>
            )}
        </div>
    );
};

export default RecordEvents;