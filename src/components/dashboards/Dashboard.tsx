// src/components/dashboards/Dashboard.tsx

import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const handleReturn = () => {
        navigate('/');
    };

    return (
        <div className="dashboard-container">
            {/* Banner */}
            <header className="dashboard-banner">
                <button className="return-button" onClick={handleReturn}>
                    &larr; Return
                </button>
                <h1 className="dashboard-heading">Analytics Dashboard</h1>
            </header>

            {/* Sidebar and Main Content Area */}
            <div className="dashboard-sidebar">
                {/* Sidebar */}
                <aside>
                    <h2 className="sidebar-title">Dashboards</h2>
                    <ul className="sidebar-menu">
                        <li className="sidebar-item"><Link to="/analytics/maintenance">Maintenance</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/quality">Quality</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/production">Production</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/downtime">Downtime</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/style-change-over">Style Change Over</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/financial">Financial</Link></li>
                        <li className="sidebar-item"><Link to="/analytics/hr">HR</Link></li>
                    </ul>
                </aside>

                {/* Main Content Area */}
                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Dashboard;