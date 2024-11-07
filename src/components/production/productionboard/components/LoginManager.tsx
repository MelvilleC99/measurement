import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    getDoc as getSingleDoc,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
    ProductionLine,
    SupportFunction,
    Style,
    SessionData,
    TimeTableAssignment,
} from '../../../../types';
import './LoginManager.css';

interface LoginManagerProps {
    onLoginSuccess: (sessionData: SessionData) => void;
}

const LoginManager: React.FC<LoginManagerProps> = ({ onLoginSuccess }) => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedLineId, setSelectedLineId] = useState('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
    const [password, setPassword] = useState('');
    const [selectedStyleId, setSelectedStyleId] = useState('');
    const [target, setTarget] = useState(0);
    const [currentStep, setCurrentStep] = useState<'login' | 'sessionOptions' | 'confirm'>('login');
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const linesSnapshot = await getDocs(collection(db, 'productionLines'));
                const supervisorsSnapshot = await getDocs(
                    query(collection(db, 'supportFunctions'), where('role', '==', 'Supervisor'))
                );
                const stylesSnapshot = await getDocs(collection(db, 'styles'));

                const linesData = linesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as ProductionLine[];

                const supervisorsData = supervisorsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as SupportFunction[];

                const stylesData = stylesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Style[];

                setProductionLines(linesData);
                setSupervisors(supervisorsData);
                setStyles(stylesData);
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError('Failed to load initial data.');
            }
        };

        fetchData();
    }, []);

    // Handle initial login
    const handleInitialLogin = async () => {
        setLoading(true);
        setError('');

        try {
            // Authenticate supervisor
            const supervisorDoc = await getSingleDoc(doc(db, 'supportFunctions', selectedSupervisorId));
            const supervisorData = supervisorDoc.data() as SupportFunction;

            if (!supervisorData || supervisorData.password !== password) {
                setError('Incorrect password.');
                setLoading(false);
                return;
            }

            // Check for active session on this line
            const sessionsQuery = query(
                collection(db, 'activeSessions'),
                where('lineId', '==', selectedLineId),
                where('isActive', '==', true)
            );

            const sessionSnap = await getDocs(sessionsQuery);

            console.log(`Active sessions found: ${sessionSnap.size}`);

            if (!sessionSnap.empty) {
                // If an active session is found, set it and prompt for options
                const sessionDoc = sessionSnap.docs[0];
                const sessionData = sessionDoc.data() as SessionData;

                // Fetch the assigned TimeTable ID based on current date
                const assignedTimeTableId = await getCurrentTimeTableId(selectedLineId);

                if (!assignedTimeTableId) {
                    setError('No active TimeTable assigned to the production line for today.');
                    setLoading(false);
                    return;
                }

                sessionData.timeTableId = assignedTimeTableId;

                // Optionally, update the session in the database to include timeTableId
                await updateDoc(doc(db, 'activeSessions', sessionDoc.id), {
                    timeTableId: assignedTimeTableId,
                    updatedAt: Timestamp.now(),
                });

                setActiveSession({
                    ...sessionData,
                    sessionId: sessionDoc.id,
                    supervisorId: selectedSupervisorId,
                });

                setCurrentStep('sessionOptions');
                console.log('Existing session found:', sessionDoc.id);
            } else {
                // No active session, proceed to confirm style and target
                setCurrentStep('confirm');
                console.log('No active session found, proceeding to confirmation step');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to authenticate. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch the current time table ID based on today's date
    const getCurrentTimeTableId = async (lineId: string): Promise<string | null> => {
        try {
            const productionLineDocRef = doc(db, 'productionLines', lineId);
            const productionLineSnap = await getSingleDoc(productionLineDocRef);

            if (!productionLineSnap.exists()) {
                setError('Selected production line does not exist.');
                return null;
            }

            const productionLineData = productionLineSnap.data() as ProductionLine;
            const timeTableAssignments = productionLineData.timeTableAssignments || [];

            if (timeTableAssignments.length === 0) {
                setError('No TimeTable assigned to the selected production line.');
                return null;
            }

            const today = new Date().setHours(0, 0, 0, 0);

            // Find the time table assignment that includes today's date
            const activeAssignment = timeTableAssignments.find((assignment: TimeTableAssignment) => {
                const fromDate = new Date(assignment.fromDate).setHours(0, 0, 0, 0);
                const toDate = new Date(assignment.toDate).setHours(0, 0, 0, 0);
                return today >= fromDate && today <= toDate;
            });

            if (!activeAssignment) {
                setError('No active TimeTable assigned to the production line for today.');
                return null;
            }

            return activeAssignment.timeTableId;
        } catch (err) {
            console.error('Error fetching production line data:', err);
            setError('Failed to fetch production line data.');
            return null;
        }
    };

    // Continue existing session
    const handleContinueSession = () => {
        if (activeSession) {
            onLoginSuccess(activeSession);
            console.log('Continuing existing session:', activeSession.sessionId);
        }
    };

    // Start new session
    const handleStartNewSession = () => {
        setCurrentStep('confirm');
        console.log('Starting new session');
    };

    // Confirm style and target, and start session
    const handleConfirmAndStart = async () => {
        setLoading(true);
        setError('');

        try {
            // Fetch the assigned TimeTable ID based on current date
            const assignedTimeTableId = await getCurrentTimeTableId(selectedLineId);

            if (!assignedTimeTableId) {
                setError('No active TimeTable assigned to the production line for today.');
                setLoading(false);
                return;
            }

            // Create new session
            const sessionRef = await addDoc(collection(db, 'activeSessions'), {
                lineId: selectedLineId,
                supervisorId: selectedSupervisorId,
                styleId: selectedStyleId,
                target: target,
                timeTableId: assignedTimeTableId,
                startTime: Timestamp.now(),
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            const newSession: SessionData = {
                sessionId: sessionRef.id,
                lineId: selectedLineId,
                supervisorId: selectedSupervisorId,
                styleId: selectedStyleId,
                target: target,
                timeTableId: assignedTimeTableId,
                startTime: Timestamp.now(),
                isActive: true,
            };

            onLoginSuccess(newSession);
            console.log('New session created with ID:', sessionRef.id);
        } catch (err) {
            console.error('Error creating new session:', err);
            setError('Failed to create new session.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-manager">
            <h2>Production Board Login</h2>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="error-dismiss-button">
                        ✕
                    </button>
                </div>
            )}

            {currentStep === 'login' && (
                <div className="login-form">
                    <div className="input-container">
                        <label htmlFor="line-select">Select Line:</label>
                        <select
                            id="line-select"
                            value={selectedLineId}
                            onChange={(e) => setSelectedLineId(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a Line</option>
                            {productionLines.map((line) => (
                                <option key={line.id} value={line.id}>
                                    {line.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-container">
                        <label htmlFor="supervisor-select">Select Supervisor:</label>
                        <select
                            id="supervisor-select"
                            value={selectedSupervisorId}
                            onChange={(e) => setSelectedSupervisorId(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a Supervisor</option>
                            {supervisors.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                    {`${sup.name} ${sup.surname} (${sup.employeeNumber})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-container">
                        <label htmlFor="password-input">Password:</label>
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            placeholder="********"
                        />
                    </div>

                    <button
                        className="login-button"
                        onClick={handleInitialLogin}
                        disabled={!selectedLineId || !selectedSupervisorId || !password || loading}
                    >
                        {loading ? 'Verifying...' : 'Login'}
                    </button>
                </div>
            )}

            {currentStep === 'sessionOptions' && activeSession && (
                <div className="session-options">
                    <h3>Active Session Detected</h3>
                    <p>
                        Would you like to continue with the existing session or start a new one?
                    </p>
                    <div className="session-buttons">
                        <button
                            className="continue-button"
                            onClick={handleContinueSession}
                            disabled={loading}
                        >
                            Continue Existing Session
                        </button>
                        <button
                            className="new-session-button"
                            onClick={handleStartNewSession}
                            disabled={loading}
                        >
                            Start New Session
                        </button>
                    </div>
                </div>
            )}

            {currentStep === 'confirm' && (
                <div className="confirmation-modal">
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>Confirm Style and Set Target</h2>

                            <div className="input-container">
                                <label htmlFor="style-select">Select Style:</label>
                                <select
                                    id="style-select"
                                    value={selectedStyleId}
                                    onChange={(e) => setSelectedStyleId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Select a Style</option>
                                    {styles.map((style) => (
                                        <option key={style.id} value={style.id}>
                                            {`${style.styleNumber} - ${style.styleName} (Balance: ${
                                                style.unitsInOrder - (style.unitsProduced || 0)
                                            })`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-container">
                                <label htmlFor="target-input">Set Target Units per Hour:</label>
                                <input
                                    id="target-input"
                                    type="number"
                                    min="1"
                                    value={target}
                                    onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                                    disabled={loading}
                                    placeholder="e.g., 100"
                                />
                            </div>

                            <div className="modal-buttons">
                                <button
                                    className="confirm-button"
                                    onClick={handleConfirmAndStart}
                                    disabled={loading || !selectedStyleId || target <= 0}
                                >
                                    {loading ? 'Setting...' : 'Confirm'}
                                </button>
                                <button
                                    className="cancel-button"
                                    onClick={() => {
                                        if (activeSession) {
                                            setCurrentStep('sessionOptions');
                                        } else {
                                            setCurrentStep('login');
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginManager;
