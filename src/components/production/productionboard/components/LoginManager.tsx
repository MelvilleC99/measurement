import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ProductionLine, SupportFunction, Style } from '../../../../types';
import './LoginManager.css';

interface LoginManagerProps {
    onLoginSuccess: (lineId: string, supervisorId: string, sessionData?: any) => void;
}

type LoginStep = 'initial' | 'sessionCheck';

interface ActiveSession {
    id: string;
    styleId: string;
    styleName?: string;
    styleNumber?: string;
    target: number;
    startTime: Date;
}

const LoginManager: React.FC<LoginManagerProps> = ({ onLoginSuccess }) => {
    // Step tracking
    const [currentStep, setCurrentStep] = useState<LoginStep>('initial');

    // Initial login data
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [supervisors, setSupervisors] = useState<SupportFunction[]>([]);
    const [selectedLine, setSelectedLine] = useState<string>('');
    const [selectedLineData, setSelectedLineData] = useState<ProductionLine | null>(null);
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // Session data
    const [existingSession, setExistingSession] = useState<ActiveSession | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [linesSnap, supervisorsSnap] = await Promise.all([
                    getDocs(collection(db, 'productionLines')),
                    getDocs(query(collection(db, 'supportFunctions'),
                        where('role', '==', 'Supervisor')))
                ]);

                const lines = linesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ProductionLine));
                setProductionLines(lines);

                setSupervisors(supervisorsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportFunction)));

            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError('Failed to load initial data');
            }
        };

        fetchData();
    }, []);

    const handleInitialLogin = async () => {
        setError('');
        setLoading(true);

        try {
            // 1. Verify supervisor password
            const supervisor = supervisors.find(s => s.id === selectedSupervisor);
            if (!supervisor || supervisor.password !== password) {
                setError('Invalid supervisor password');
                setPassword('');
                return;
            }

            // 2. Check for active session on this line
            const sessionsQuery = query(
                collection(db, 'activeSessions'),
                where('lineId', '==', selectedLine),
                where('isActive', '==', true)
            );

            const sessionSnap = await getDocs(sessionsQuery);

            if (!sessionSnap.empty) {
                const sessionDoc = sessionSnap.docs[0];
                const sessionData = sessionDoc.data();

                // Fetch style details
                const styleDoc = await getDoc(doc(db, 'styles', sessionData.styleId));
                const styleData = styleDoc.data();

                setExistingSession({
                    id: sessionDoc.id,
                    styleId: sessionData.styleId,
                    styleName: styleData?.styleName,
                    styleNumber: styleData?.styleNumber,
                    target: sessionData.target,
                    startTime: sessionData.startTime.toDate()
                });

                setCurrentStep('sessionCheck');
            } else {
                // No active session, proceed with new session
                handleStartNewSession();
            }

        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to verify login');
        } finally {
            setLoading(false);
        }
    };

    const handleContinueSession = () => {
        if (!existingSession) return;

        onLoginSuccess(selectedLine, selectedSupervisor, {
            sessionId: existingSession.id,
            styleId: existingSession.styleId,
            target: existingSession.target
        });
    };

    const handleStartNewSession = () => {
        onLoginSuccess(selectedLine, selectedSupervisor);
    };

    if (currentStep === 'sessionCheck' && existingSession) {
        return (
            <div className="login-manager">
                <div className="session-check-container">
                    <h2>Active Session Found</h2>
                    <div className="session-details">
                        <p><strong>Line:</strong> {selectedLineData?.name}</p>
                        <p><strong>Current Style:</strong> {existingSession.styleNumber}</p>
                        <p><strong>Target:</strong> {existingSession.target} units/hour</p>
                        <p><strong>Started:</strong> {existingSession.startTime.toLocaleString()}</p>
                    </div>
                    <div className="session-actions">
                        <button
                            className="continue-button"
                            onClick={handleContinueSession}
                        >
                            Continue This Session
                        </button>
                        <button
                            className="new-button"
                            onClick={handleStartNewSession}
                        >
                            Start New Session
                        </button>
                        <button
                            className="back-button"
                            onClick={() => {
                                setCurrentStep('initial');
                                setExistingSession(null);
                                setPassword('');
                            }}
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-manager">
            <h2>Production Board Login</h2>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            <div className="login-form">
                <label>
                    Select Line:
                    <select
                        value={selectedLine}
                        onChange={(e) => {
                            setSelectedLine(e.target.value);
                            const line = productionLines.find(l => l.id === e.target.value);
                            setSelectedLineData(line || null);
                        }}
                        disabled={loading}
                    >
                        <option value="">Select a Line</option>
                        {productionLines.map((line) => (
                            <option key={line.id} value={line.id}>
                                {line.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Select Supervisor:
                    <select
                        value={selectedSupervisor}
                        onChange={(e) => setSelectedSupervisor(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Select a Supervisor</option>
                        {supervisors.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                                {`${sup.name} ${sup.surname} (${sup.employeeNumber})`}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Enter Password:
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </label>

                <button
                    className="login-button"
                    onClick={handleInitialLogin}
                    disabled={!selectedLine || !selectedSupervisor || !password || loading}
                >
                    {loading ? 'Verifying...' : 'Login'}
                </button>
            </div>
        </div>
    );
};

export default LoginManager;