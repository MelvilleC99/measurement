import React from 'react';
import { Link, useNavigate, Outlet, Routes, Route } from 'react-router-dom';
import './Dashboard.css';
import LiveProductionDashboard from './LiveProduction/LiveProductionDashboard';
import FactoryDashboard from './Factory/factoryDashboard';
import TestDash from './Factory/TestDash'; // Step 1: Import TestDash

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleReturn = () => {
        navigate('/');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-banner">
                <button className="return-button" onClick={handleReturn}>
                    &larr; Return
                </button>
                <h1 className="dashboard-heading">Analytics Dashboard</h1>
            </header>

            <div className="dashboard-sidebar">
                <aside>
                    <h2 className="sidebar-title">Dashboards</h2>
                    <ul className="sidebar-menu">
                        <li className="sidebar-item">
                            <Link to="/analytics/maintenance">Maintenance</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/quality">Quality</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/live-production">Live Production</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/factory">Factory</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/downtime">Downtime</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/style-change-over">Style Change Over</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/financial">Financial</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/hr">HR</Link>
                        </li>
                        <li className="sidebar-item">
                            <Link to="/analytics/test">Test Dashboard</Link> {/* Step 2: Add Test Dashboard link */}
                        </li>
                    </ul>
                </aside>

                <main className="dashboard-main">
                    <Routes>
                        <Route path="live-production" element={<LiveProductionDashboard />} />
                        <Route path="factory" element={<FactoryDashboard />} />
                        <Route path="test" element={<TestDash />} /> {/* Step 3: Add route for TestDash */}
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
