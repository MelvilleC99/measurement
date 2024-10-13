import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [selectedOption, setSelectedOption] = useState<string>('Dashboard');

    const handleNavigation = (option: string) => {
        setSelectedOption(option);
        switch (option) {
            case 'Time Tables':
                navigate('/admin/timetables');
                break;
            case 'Work Days':
                navigate('/admin/workdays');
                break;
            case 'Add Production Lines':
                navigate('/admin/add-lines');
                break;
            case 'Production Schedule':
                navigate('/admin/production-schedule');
                break;
            case 'Downtime':
                navigate('/admin/downtime');
                break;
            case 'Support Functions':
                navigate('/admin/support-functions');
                break;
            case 'Machine List':
                navigate('/admin/machine-list');
                break;
            default:
                break;
        }
    };

    return (
        <div className="admin-dashboard-container">
            <div className="title-block">
                <button className="back-button" onClick={() => navigate('/')}>
                    Back to Home
                </button>
                <h1 className="dashboard-title">Admin Dashboard</h1>
            </div>

            <div className="content-wrapper">
                <div className="toolbar">
                    <button onClick={() => handleNavigation('Time Tables')} className="toolbar-button">Time Tables</button>
                    <button onClick={() => handleNavigation('Work Days')} className="toolbar-button">Work Days</button>
                    <button onClick={() => handleNavigation('Add Production Lines')} className="toolbar-button">Add Production Lines</button>
                    <button onClick={() => handleNavigation('Production Schedule')} className="toolbar-button">Production Schedule</button>
                    <button onClick={() => handleNavigation('Downtime')} className="toolbar-button">Downtime</button>
                    <button onClick={() => handleNavigation('Support Functions')} className="toolbar-button">Support Functions</button>
                    <button onClick={() => handleNavigation('Machine List')} className="toolbar-button">Machine List</button>
                </div>

                <div className="main-content">
                    <p>{selectedOption} content will appear here.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;