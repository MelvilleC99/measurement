import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="admin-container">
            <div className="admin-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                    <h1 className="company-name">Admin Dashboard</h1>
                </div>
                <div className="card-content">
                    <div className="button-group">
                        <button className="admin-button" onClick={() => navigate('/timetables')}>
                            Time Tables
                        </button>
                        <button className="admin-button" onClick={() => navigate('/workdays')}>
                            Work Days
                        </button>
                        <button className="admin-button" onClick={() => navigate('/add-lines')}>
                            Add Production Lines
                        </button>
                        <button className="admin-button" onClick={() => navigate('/production-schedule')}>
                            Production Schedule
                        </button>
                        <button className="admin-button" onClick={() => navigate('/downtime')}>
                            Downtime
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;