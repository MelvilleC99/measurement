import React from 'react';
import { useNavigate } from 'react-router-dom';
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
                <h1 className="dashboard-heading">Dashboard</h1>
            </header>

            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <h2 className="sidebar-title">Dashboards</h2>
                <ul className="sidebar-menu">
                    <li className="sidebar-item">Maintenance</li>
                    <li className="sidebar-item">Quality</li>
                    <li className="sidebar-item">Production</li>
                    <li className="sidebar-item">Down time</li>
                    <li className="sidebar-item">Style Change Over</li>
                    <li className="sidebar-item">Financial</li>
                    <li className="sidebar-item">HR</li>
                </ul>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                {/* Future content can be added here */}
                <p>Select an option from the sidebar to view the respective dashboard.</p>
            </main>
        </div>
    );
};

export default Dashboard;