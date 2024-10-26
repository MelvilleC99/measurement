import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import Rework from '../../downtime/rework/Rework';
import Reject from '../../downtime/reject/Reject';
import Late from '../../downtime/hr/Late';
import Absent from '../../downtime/hr/Absent';
import {
    ReworkFormData,
    RejectFormData,
    LateFormData,
    AbsentFormData,
    SupportFunction
} from '../../../../types';
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
    const [activeSection, setActiveSection] = useState<'hr' | 'downtime' | null>(null);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isLateModalOpen, setIsLateModalOpen] = useState(false);
    const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);

    // Fetch QCs on component mount
    useEffect(() => {
        const fetchQCs = async () => {
            try {
                const qcsSnapshot = await getDocs(collection(db, 'supportFunctions'));
                const qcsList = qcsSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as SupportFunction))
                    .filter(sf => sf.role === 'QC');
                setQcs(qcsList);
            } catch (error) {
                console.error('Error fetching QCs:', error);
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

    const handleReworkSubmit = async (data: ReworkFormData) => {
        try {
            const reworkDoc = {
                ...data,
                sessionId,
                timestamp: Timestamp.now(),
                status: 'Booked Out'
            };
            await addDoc(collection(db, 'reworks'), reworkDoc);
            onEventRecorded('reworks', data.count);
            setIsReworkModalOpen(false);
        } catch (error) {
            console.error('Error submitting rework:', error);
        }
    };

    const handleRejectSubmit = async (data: RejectFormData) => {
        try {
            const rejectDoc = {
                ...data,
                sessionId,
                timestamp: Timestamp.now()
            };
            await addDoc(collection(db, 'rejects'), rejectDoc);
            onEventRecorded('rejects', data.count);
            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error submitting reject:', error);
        }
    };

    const handleLateSubmit = async (data: LateFormData) => {
        try {
            const lateDoc = {
                ...data,
                sessionId,
                timestamp: Timestamp.now()
            };
            await addDoc(collection(db, 'attendance'), lateDoc);
            onEventRecorded('late', 1);
            setIsLateModalOpen(false);
        } catch (error) {
            console.error('Error submitting late attendance:', error);
        }
    };

    const handleAbsentSubmit = async (data: AbsentFormData) => {
        try {
            const absentDoc = {
                ...data,
                sessionId,
                timestamp: Timestamp.now()
            };
            await addDoc(collection(db, 'attendance'), absentDoc);
            onEventRecorded('absent', 1);
            setIsAbsentModalOpen(false);
        } catch (error) {
            console.error('Error submitting absence:', error);
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
                                        onClick={() => console.log(category.id)}
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
                        supervisorId={supervisorId}
                    />
                )}

                {isAbsentModalOpen && (
                    <Absent
                        onClose={() => setIsAbsentModalOpen(false)}
                        onSubmit={handleAbsentSubmit}
                        productionLineId={lineId}
                        supervisorId={supervisorId}
                    />
                )}
            </div>
        </div>
    );
};

export default RecordEvents;