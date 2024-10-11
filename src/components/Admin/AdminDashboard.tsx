// src/components/Admin/AdminDashboard.tsx

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
                        <button className="admin-button" onClick={() => navigate('/admin/timetables')}>
                            Time Tables
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/workdays')}>
                            Work Days
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/add-lines')}>
                            Add Production Lines
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/production-schedule')}>
                            Production Schedule
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/downtime')}>
                            Downtime
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/support-functions')}>
                            Support Functions
                        </button>
                        <button className="admin-button" onClick={() => navigate('/admin/machine-list')}>
                            Machine List
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;