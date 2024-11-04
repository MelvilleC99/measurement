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
    and,
    getDoc as getSingleDoc,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ProductionLine, SupportFunction, Style, SessionData } from '../../../../types';
import './LoginManager.css';

interface LoginManagerProps {
    onLoginSuccess: (sessionData: SessionData) => void;
}

const LoginManager: React.FC<LoginManagerProps> = ({ onLoginSuccess }) => {
    // Step tracking
    const [currentStep, setCurrentStep] = useState<'login' | 'sessionOptions' | 'confirm'>('login');

    // Initial login data
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // Confirmation data
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [target, setTarget] = useState<number>(0);

    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Active session data
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [linesSnap, supervisorsSnap, stylesSnap] = await Promise.all([
                    getDocs(collection(db, 'productionLines')),
                    getDocs(query(collection(db, 'supportFunctions'), where('role', '==', 'Supervisor'))),
                    getDocs(collection(db, 'styles')),
                ]);

                const lines = linesSnap.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name,
                    active: doc.data().active || false,
                    assignedTimeTable: doc.data().assignedTimeTable || '',
                    createdAt: doc.data().createdAt,
                    updatedAt: doc.data().updatedAt,
                })) as ProductionLine[];
                setProductionLines(lines);

                const sups = supervisorsSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as SupportFunction[];
                setSupervisors(sups);

                const loadedStyles = stylesSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Style[];
                setStyles(loadedStyles);
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError('Failed to load initial data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle initial login with fixed authentication
    const handleInitialLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
            if (!selectedSupervisor) {
                setError('Selected supervisor not found.');
                setLoading(false);
                return;
            }

            console.log(
                `Attempting to log in supervisor: ${selectedSupervisor.name} ${selectedSupervisor.surname} (${selectedSupervisor.employeeNumber})`
            );

            // Modified query to check for employee number and password
            const loginQuery = query(
                collection(db, 'supportFunctions'),
                and(
                    where('employeeNumber', '==', selectedSupervisor.employeeNumber),
                    where('password', '==', password),
                    where('role', '==', 'Supervisor')
                )
            );

            const loginSnap = await getDocs(loginQuery);

            if (loginSnap.empty) {
                setError('Invalid password. Please try again.');
                setPassword(''); // Clear password for security
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

                // Check if timeTableId is present, if not, fetch it from the production line
                if (!sessionData.timeTableId) {
                    const productionLineDocRef = doc(db, 'productionLines', selectedLineId);
                    const productionLineSnap = await getSingleDoc(productionLineDocRef);

                    if (!productionLineSnap.exists()) {
                        setError('Selected production line does not exist.');
                        setLoading(false);
                        return;
                    }

                    const productionLineData = productionLineSnap.data() as ProductionLine;
                    const assignedTimeTableId = productionLineData.assignedTimeTable;

                    if (!assignedTimeTableId) {
                        setError('No TimeTable assigned to the selected production line.');
                        setLoading(false);
                        return;
                    }

                    sessionData.timeTableId = assignedTimeTableId;

                    // Optionally, update the session in the database to include timeTableId
                    await updateDoc(doc(db, 'activeSessions', sessionDoc.id), {
                        timeTableId: assignedTimeTableId,
                        updatedAt: Timestamp.now(),
                    });
                }

                setActiveSession({
                    sessionId: sessionDoc.id,
                    lineId: sessionData.lineId,
                    supervisorId: selectedSupervisorId,
                    styleId: sessionData.styleId,
                    target: sessionData.target,
                    startTime: sessionData.startTime,
                    isActive: sessionData.isActive,
                    timeTableId: sessionData.timeTableId, // Ensure this is included
                });

                setCurrentStep('sessionOptions');
                console.log('Existing session found:', sessionDoc.id);
            } else {
                // No active session, proceed to confirm style and target
                setCurrentStep('confirm');
                console.log('No active session found, proceeding to confirmation step');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Failed to authenticate. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle continuing an existing session
    const handleContinueSession = () => {
        if (activeSession) {
            onLoginSuccess(activeSession);
            console.log('Continuing existing session:', activeSession.sessionId);
        } else {
            setError('No active session to continue.');
        }
    };

    // Handle starting a new session
    const handleStartNewSession = async () => {
        setError('');
        setLoading(true);

        try {
            if (!activeSession) {
                setError('No active session found to start a new one.');
                setLoading(false);
                return;
            }

            // Deactivate the existing session
            await updateDoc(doc(db, 'activeSessions', activeSession.sessionId), {
                isActive: false,
                endTime: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            console.log('Deactivated existing session:', activeSession.sessionId);

            // Clear the active session state
            setActiveSession(null);

            // Proceed to confirm style and target
            setCurrentStep('confirm');
            console.log('Proceeding to confirmation step for new session.');
        } catch (err) {
            console.error('Error deactivating existing session:', err);
            setError('Failed to start a new session.');
        } finally {
            setLoading(false);
        }
    };

    // Handle confirmation and session creation
    const handleConfirmAndStart = async () => {
        setError('');
        setLoading(true);

        try {
            const selectedStyle = styles.find((s) => s.id === selectedStyleId);
            if (!selectedStyle) {
                setError('Please select a valid style.');
                setLoading(false);
                return;
            }

            if (target <= 0) {
                setError('Target must be a positive number.');
                setLoading(false);
                return;
            }

            // Fetch the assigned TimeTable for the selected line
            const productionLineDocRef = doc(db, 'productionLines', selectedLineId);
            const productionLineSnap = await getSingleDoc(productionLineDocRef);

            if (!productionLineSnap.exists()) {
                setError('Selected production line does not exist.');
                setLoading(false);
                return;
            }

            const productionLineData = productionLineSnap.data() as ProductionLine;
            const assignedTimeTableId = productionLineData.assignedTimeTable;

            if (!assignedTimeTableId) {
                setError('No TimeTable assigned to the selected production line.');
                setLoading(false);
                return;
            }

            // Create a new session
            const sessionRef = await addDoc(collection(db, 'activeSessions'), {
                lineId: selectedLineId,
                supervisorId: selectedSupervisorId,
                styleId: selectedStyleId,
                target: target,
                timeTableId: assignedTimeTableId, // Include timeTableId
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
                timeTableId: assignedTimeTableId, // Include timeTableId
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
                    <p>Would you like to continue with the existing session or start a new one?</p>
                    <div className="session-buttons">
                        <button className="continue-button" onClick={handleContinueSession} disabled={loading}>
                            Continue Existing Session
                        </button>
                        <button className="new-session-button" onClick={handleStartNewSession} disabled={loading}>
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
                                            // If starting a new session, allow canceling
                                            setCurrentStep('sessionOptions');
                                        } else {
                                            // If no active session, go back to login
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
