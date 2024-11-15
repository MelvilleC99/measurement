// src/components/production/productionboard/ProductionBoard.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    getDocs,
    query,
    where,
    getDoc,
    increment,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import LoginManager from './components/LoginManager';
import ProductionTracking from './components/ProductionTracking';
import RecordEvents from './components/RecordEvents';
import DowntimeTracking from './components/DowntimeTracking';
import MetricsCounter from './components/MetricsCounter';
import Overtime from './components/Overtime';
import { SessionData, OvertimeSchedule, TimeTableAssignment, TimeTable } from '../../../types';
import './ProductionBoard.css';
import {
    Box,
    Button,
    Typography,
    Snackbar,
    Alert,
} from '@mui/material';

interface MetricsState {
    rejects: number;
    reworks: number;
    late: number;
    absent: number;
}

interface DetailNames {
    lineName: string;
    supervisorName: string;
    styleName: string;
}

const ProductionBoard: React.FC = () => {
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [detailNames, setDetailNames] = useState<DetailNames>({
        lineName: '',
        supervisorName: '',
        styleName: '',
    });
    const [metrics, setMetrics] = useState<MetricsState>({
        rejects: 0,
        reworks: 0,
        late: 0,
        absent: 0,
    });
    const [error, setError] = useState<string>('');
    const [overtimeSchedule, setOvertimeSchedule] = useState<OvertimeSchedule | null>(null);
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState<boolean>(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch actual names when session data changes
    useEffect(() => {
        const fetchData = async () => {
            if (!sessionData) return;

            try {
                const [lineDoc, supervisorDoc, styleDoc] = await Promise.all([
                    getDoc(doc(db, 'productionLines', sessionData.lineId)),
                    getDoc(doc(db, 'supportFunctions', sessionData.supervisorId)),
                    getDoc(doc(db, 'styles', sessionData.styleId)),
                ]);

                // Get line name
                const lineName = lineDoc.data()?.name || 'Unknown Line';

                // Get supervisor name
                const supervisorData = supervisorDoc.data();
                const supervisorName = supervisorData
                    ? `${supervisorData.name} ${supervisorData.surname} (${supervisorData.employeeNumber})`
                    : 'Unknown Supervisor';

                // Get style name
                const styleData = styleDoc.data();
                const styleName = styleData
                    ? `${styleData.styleNumber} - ${styleData.styleName}`
                    : 'Unknown Style';

                setDetailNames({
                    lineName,
                    supervisorName,
                    styleName,
                });

            } catch (err) {
                console.error('Error fetching names:', err);
                setError('Failed to load detail names');
            }
        };

        fetchData();
    }, [sessionData]);

    // Implement real-time listener for overtime schedule assignments
    useEffect(() => {
        if (!sessionData) return;

        const lineDocRef = doc(db, 'productionLines', sessionData.lineId);

        const unsubscribe = onSnapshot(lineDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const lineData = docSnap.data() as any; // Replace 'any' with your ProductionLine type if defined
                const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

                const activeOvertime = (lineData.timeTableAssignments || []).find((assignment: TimeTableAssignment) =>
                    assignment.timeTableName === 'Overtime' &&
                    assignment.fromDate <= today &&
                    assignment.toDate >= today
                );

                if (activeOvertime) {
                    // Fetch the overtime TimeTable
                    const timeTableDocRef = doc(db, 'timeTable', activeOvertime.timeTableId);
                    const timeTableSnap = await getDoc(timeTableDocRef);
                    if (timeTableSnap.exists()) {
                        const timeTableData = timeTableSnap.data() as TimeTable;
                        setOvertimeSchedule({
                            id: activeOvertime.id,
                            productionLineIds: [sessionData.lineId],
                            timeTableId: activeOvertime.timeTableId,
                            startDate: activeOvertime.fromDate,
                            endDate: activeOvertime.toDate,
                            isOvertime: timeTableData.isOvertime,
                            createdAt: timeTableData.createdAt,
                            name: timeTableData.name || 'Overtime',
                            description: timeTableData.description || 'Overtime Schedule',
                        });
                        console.log('Active overtime schedule:', activeOvertime);
                    } else {
                        setOvertimeSchedule(null);
                        console.log('Overtime TimeTable does not exist.');
                    }
                } else {
                    setOvertimeSchedule(null);
                    console.log('No active overtime schedule.');
                }
            } else {
                setOvertimeSchedule(null);
                console.log('Production Line does not exist.');
            }
        });

        // Cleanup listener on unmount or when sessionData changes
        return () => unsubscribe();
    }, [sessionData]);

    const handleUnitProduced = async (
        slotId: string,
        target: number,
        assignedTimeTableId: string,
        unitProduced: number
    ) => {
        if (!sessionData) return;
        try {
            await addDoc(collection(db, 'production'), {
                sessionId: sessionData.sessionId,
                slotId,
                lineId: sessionData.lineId,
                supervisorId: sessionData.supervisorId,
                styleId: sessionData.styleId,
                target: target,
                assignedTimeTableId: assignedTimeTableId,
                unitProduced: unitProduced,
                timestamp: Timestamp.now(),
                createdAt: Timestamp.now(),
            });
            console.log('Production unit recorded for slot:', slotId);

            // Update unitsProduced in the style document atomically
            const styleDocRef = doc(db, 'styles', sessionData.styleId);
            await updateDoc(styleDocRef, {
                unitsProduced: increment(unitProduced),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            setError('Failed to record production');
            console.error('Error recording production:', error);
        }
    };

    const handleLoginSuccess = (newSession: SessionData) => {
        console.log('handleLoginSuccess called with:', newSession);
        setSessionData(newSession);
    };

    const handleEventRecorded = (eventType: keyof MetricsState, count: number) => {
        setMetrics((prev) => ({
            ...prev,
            [eventType]: prev[eventType] + count,
        }));
        console.log(`Event recorded: ${eventType} += ${count}`);
    };

    const handleEndShift = async () => {
        if (!window.confirm('Are you sure you want to end the shift?')) {
            return;
        }

        try {
            if (sessionData) {
                await updateDoc(doc(db, 'activeSessions', sessionData.sessionId), {
                    isActive: false,
                    endTime: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                console.log('Session ended:', sessionData.sessionId);

                const downtimesQuery = query(
                    collection(db, 'downtimes'),
                    where('sessionId', '==', sessionData.sessionId),
                    where('status', '==', 'Open')
                );

                const downtimesSnapshot = await getDocs(downtimesQuery);
                const closePromises = downtimesSnapshot.docs.map((docSnap) =>
                    updateDoc(doc(db, 'downtimes', docSnap.id), {
                        status: 'Closed',
                        endTime: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    })
                );

                await Promise.all(closePromises);
                console.log('Closed all active downtimes for session:', sessionData.sessionId);
            }

            setSessionData(null);
            setMetrics({
                rejects: 0,
                reworks: 0,
                late: 0,
                absent: 0,
            });
            setOvertimeSchedule(null); // Reset overtime schedule
            console.log('Shift ended and state reset');
        } catch (error) {
            console.error('Error ending shift:', error);
            setError('Failed to end shift');
        }
    };

    const handleStartOvertime = () => {
        setIsOvertimeModalOpen(true);
    };

    // Updated handleOvertimeConfirm to accept selectedStyleId
    const handleOvertimeConfirm = async (newTarget: number, selectedStyleId: string) => {
        setIsOvertimeModalOpen(false);

        if (!sessionData || !overtimeSchedule) return;

        try {
            // End the current session
            await updateDoc(doc(db, 'activeSessions', sessionData.sessionId), {
                isActive: false,
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log('Current session ended:', sessionData.sessionId);

            // Create new overtime session
            const sessionRef = await addDoc(collection(db, 'activeSessions'), {
                lineId: sessionData.lineId,
                supervisorId: sessionData.supervisorId,
                styleId: selectedStyleId, // Use the confirmed style
                target: newTarget,
                timeTableId: overtimeSchedule.timeTableId,
                startTime: Timestamp.now(),
                isActive: true,
                isOvertime: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            const newOvertimeSession: SessionData = {
                sessionId: sessionRef.id,
                lineId: sessionData.lineId,
                supervisorId: sessionData.supervisorId,
                styleId: selectedStyleId,
                target: newTarget,
                timeTableId: overtimeSchedule.timeTableId,
                startTime: Timestamp.now(),
                isActive: true,
                isOvertime: true,
            };

            setSessionData(newOvertimeSession);
            console.log('Overtime session started with ID:', sessionRef.id);
        } catch (error) {
            console.error('Error starting overtime session:', error);
            setError('Failed to start overtime session.');
        }
    };

    const handleOvertimeCancel = () => {
        setIsOvertimeModalOpen(false);
    };

    return (
        <div className="board-container">
            {!sessionData ? (
                <LoginManager onLoginSuccess={handleLoginSuccess}/>
            ) : (
                <div className="board-content">
                    {/* Heading Banner */}
                    <div className="heading-banner">
                        <div className="heading-left">
                            <h1>Production Dashboard</h1>
                            <div className="heading-details">
                                <p>Date: {new Date().toLocaleDateString()}</p>
                                <p>Time: {new Date().toLocaleTimeString()}</p>
                                <p>Line: {detailNames.lineName}</p>
                                <p>Supervisor: {detailNames.supervisorName}</p>
                                <p>Style: {detailNames.styleName}</p>
                            </div>
                        </div>
                        <div className="heading-right">
                            <div className="target-info">
                                <p>Target Units per Hour: {sessionData.target}</p>
                            </div>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleEndShift}
                                sx={{marginBottom: 2}}
                            >
                                End Shift
                            </Button>
                            {/* Removed "Start Overtime" button from here */}
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="main-grid">
                        {/* Left Side - Production Tracking */}
                        <div className="left-panel">
                            <ProductionTracking
                                sessionData={sessionData}
                                onUnitProduced={handleUnitProduced}
                                handleStartOvertime={handleStartOvertime} // Passing the function
                                overtimeSchedule={overtimeSchedule} // Passing the schedule
                            />
                        </div>

                        {/* Right Side - Monitoring Panels */}
                        <div className="right-panel">
                            <div className="monitoring-panel">
                                <MetricsCounter
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    supervisorId={sessionData.supervisorId}
                                />
                            </div>

                            <div className="monitoring-panel">
                                <DowntimeTracking
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    userRole="Supervisor"
                                    userId={sessionData.supervisorId}
                                />
                            </div>

                            <div className="monitoring-panel">
                                <RecordEvents
                                    sessionId={sessionData.sessionId}
                                    lineId={sessionData.lineId}
                                    supervisorId={sessionData.supervisorId}
                                    onEventRecorded={handleEventRecorded}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                            <button onClick={() => setError('')}>✕</button>
                        </div>
                    )}

                    {/* Overtime Modal */}
                    {isOvertimeModalOpen && (
                        <Overtime
                            onConfirm={handleOvertimeConfirm}
                            onCancel={handleOvertimeCancel}
                            currentStyleId={sessionData.styleId} // Pass currentStyleId
                        />
                    )}

                    {/* Snackbar for Notifications */}
                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={6000}
                        onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                    >
                        <Alert
                            onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                            severity={snackbar.severity}
                            sx={{width: '100%'}}
                        >
                            {snackbar.message}
                        </Alert>
                    </Snackbar>
                </div>
            )}
        </div>
    );
}
    export default ProductionBoard;

