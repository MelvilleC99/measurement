// RecordEvents.tsx
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

    const downtimeCategories = [
        { id: 'machine', name: 'Machine' },
        { id: 'quality', name: 'Quality' },
        { id: 'supply', name: 'Supply' },
        { id: 'styleChange', name: 'Style Change' }
    ];

    // Handler for Rework Submission
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

            console.log('Rework Submitted:', reworkDocRef.id); // Debugging

            // Only pass supported event types to onEventRecorded
            onEventRecorded('reworks', data.count);
            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error submitting rework:', error);
            setError('Failed to submit rework.');
        }
    };

    // Handler for Reject Submission
    const handleRejectSubmit = async (data: RejectFormData) => {
        try {
            const rejectDocRef = await addDoc(collection(db, 'rejects'), {
                ...data,
                sessionId,
                status: 'open',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            console.log('Reject Submitted:', rejectDocRef.id); // Debugging

            // Only pass supported event types to onEventRecorded
            onEventRecorded('rejects', data.count);
            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error submitting reject:', error);
            setError('Failed to submit reject.');
        }
    };

    // Handler for Late Submission
    const handleLateSubmit = async (data: LateFormData) => {
        try {
            const attendanceDocRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                type: 'late',
                status: 'late',
                sessionId,
                supervisorId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            console.log('Late Attendance Submitted:', attendanceDocRef.id); // Debugging

            // Only pass supported event types to onEventRecorded
            onEventRecorded('late', 1);
            setIsLateModalOpen(false);
        } catch (error) {
            console.error('Error submitting late attendance:', error);
            setError('Failed to submit late attendance.');
        }
    };

    // Handler for Absent Submission
    const handleAbsentSubmit = async (data: AbsentFormData) => {
        try {
            const attendanceDocRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                type: 'absent',
                status: 'absent',
                sessionId,
                supervisorId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            console.log('Absent Attendance Submitted:', attendanceDocRef.id); // Debugging

            // Only pass supported event types to onEventRecorded
            onEventRecorded('absent', 1);
            setIsAbsentModalOpen(false);
        } catch (error) {
            console.error('Error submitting absence:', error);
            setError('Failed to submit absence.');
        }
    };

    // Handler for Supply Downtime Submission
    const handleSupplySubmit = async (data: SupplyFormData) => {
        try {
            const supplyDocRef = await addDoc(collection(db, 'supplyDowntime'), {
                ...data,
                sessionId,
                status: 'Open',
                createdAt: Timestamp.now(),
                startTime: Timestamp.now()
            });

            console.log('Supply Downtime Submitted:', supplyDocRef.id); // Debugging

            // Removed onEventRecorded call for 'supply' to fix TypeScript error
            // onEventRecorded('supply', 1); // Removed

            setIsSupplyModalOpen(false);
        } catch (err) {
            console.error('Error logging supply downtime:', err);
            setError('Failed to log supply downtime.');
        }
    };

    // Handler for Style Changeover Submission
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
                productionLineId: lineId // Ensure productionLineId is set
            });

            console.log('Style Changeover Submitted:', styleChangeoverDocRef.id); // Debugging

            // Removed onEventRecorded call for 'styleChange' to fix TypeScript error
            // onEventRecorded('styleChange', 1); // Removed

            setIsStyleChangeoverModalOpen(false);
        } catch (error) {
            console.error('Error submitting style changeover:', error);
            setError('Failed to submit style changeover.');
        }
    };

    // Handler for Machine Downtime Submission
    const handleMachineSubmit = async (data: any): Promise<void> => {
        try {
            console.log("Machine downtime data submitted", data);
            // Ensure productionLineId is included
            data.productionLineId = lineId;
            await addDoc(collection(db, 'machineDowntimes'), {
                ...data,
                createdAt: Timestamp.now(),
                status: 'Open',
                mechanicAcknowledged: false,
                mechanicId: null,
                mechanicName: null,
                mechanicAcknowledgedAt: null,
                resolvedAt: null,
                updatedAt: Timestamp.now()
            });

            console.log('Machine Downtime Submitted'); // Debugging

            // Removed onEventRecorded call for 'machine' to fix TypeScript error
            // onEventRecorded('machine', 1); // Removed

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
                                {downtimeCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            if (category.id === 'machine') {
                                                setIsMachineModalOpen(true);
                                            } else if (category.id === 'supply') {
                                                setIsSupplyModalOpen(true);
                                            } else if (category.id === 'styleChange') {
                                                setIsStyleChangeoverModalOpen(true);
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