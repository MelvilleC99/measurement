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
import Reject from '../../downtime/reject/Reject';
import Late from '../../downtime/hr/Late';
import Absent from '../../downtime/hr/Absent';
import SupplyLog from '../../downtime/supply/Supply';
import StyleChangeover from '../../downtime/stylechange/StyleChangeover';
import Machine from '../../downtime/machine/Machine';
import {
    ReworkFormData,
    RejectFormData,
    LateFormData,
    AbsentFormData,
    SupplyFormData,
    StyleChangeoverFormData
} from '../../downtime/types';
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
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isLateModalOpen, setIsLateModalOpen] = useState(false);
    const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
    const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
    const [isStyleChangeoverModalOpen, setIsStyleChangeoverModalOpen] = useState(false);
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);
    const [error, setError] = useState<string>('');

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

    const handleReworkSubmit = async (data: ReworkFormData) => {
        try {
            const reworkDocRef = await addDoc(collection(db, 'reworks'), {
                ...data,
                sessionId,
                status: 'Open',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            const refNumber = reworkDocRef.id.slice(-4);
            await updateDoc(doc(db, 'reworks', reworkDocRef.id), {
                refNumber
            });

            console.log('Rework submitted successfully. Count:', data.count);
            onEventRecorded('reworks', data.count);
            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error submitting rework:', error);
            setError('Failed to submit rework.');
        }
    };

    const handleRejectSubmit = async (data: RejectFormData) => {
        try {
            const rejectDocRef = await addDoc(collection(db, 'rejects'), {
                ...data,
                sessionId,
                status: 'Open',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            console.log('Reject submitted successfully. Count:', data.count);
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
                type: 'late',
                status: 'late',
                sessionId,
                supervisorId,
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
                type: 'absent',
                status: 'absent',
                sessionId,
                supervisorId,
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
                sessionId,
                status: 'Open',
                createdAt: Timestamp.now(),
                startTime: Timestamp.now()
            });

            setIsSupplyModalOpen(false);
        } catch (err) {
            console.error('Error logging supply downtime:', err);
            setError('Failed to log supply downtime.');
        }
    };

    const handleStyleChangeoverSubmit = async (data: StyleChangeoverFormData) => {
        try {
            const styleChangeoverDocRef = await addDoc(collection(db, 'styleChangeovers'), {
                ...data,
                sessionId,
                status: 'In Progress',
                createdAt: Timestamp.now(),
                progressSteps: {
                    machineSetupComplete: false,
                    peopleAllocated: false,
                    firstUnitOffLine: false,
                    qcApproved: false
                },
                productionLineId: lineId
            });

            console.log('Style Changeover Submitted:', styleChangeoverDocRef.id);
            setIsStyleChangeoverModalOpen(false);
        } catch (error) {
            console.error('Error submitting style changeover:', error);
            setError('Failed to submit style changeover.');
        }
    };

    const handleMachineSubmit = async (data: any): Promise<void> => {
        try {
            console.log("Machine downtime data submitted", data);
            setIsMachineModalOpen(false);
        } catch (error) {
            console.error("Error logging machine downtime:", error);
            setError("Failed to log machine downtime.");
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
                                <button onClick={() => setIsMachineModalOpen(true)} className="output-button">
                                    Machine
                                </button>
                                <button onClick={() => setIsSupplyModalOpen(true)} className="output-button">
                                    Supply
                                </button>
                                <button onClick={() => setIsStyleChangeoverModalOpen(true)} className="output-button">
                                    Style Change
                                </button>
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
                        sessionId={sessionId}
                        qcs={qcs}
                    />
                )}

                {isRejectModalOpen && (
                    <Reject
                        onClose={() => setIsRejectModalOpen(false)}
                        onSubmit={handleRejectSubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                        sessionId={sessionId}
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

                {isMachineModalOpen && (
                    <Machine
                        onClose={() => setIsMachineModalOpen(false)}
                        onSubmit={handleMachineSubmit}
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