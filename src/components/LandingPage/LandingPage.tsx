import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-container">
            <div className="landing-card">
                <div className="card-header">
                    <h1 className="company-name">VISIBLE</h1>
                    <p className="tagline">
                        Empowering you through real-time visibility and analytics to achieve operational excellence
                    </p>
                </div>
                <div className="card-content">
                    <h2 className="dashboard-title">ABC - Dashboard</h2>
                    <div className="button-group">
                        <button className="landing-button" onClick={() => navigate('/admin')}>
                            Admin
                        </button>
                        <button className="landing-button" onClick={() => navigate('/production-board')}>
                            Production
                        </button>
                        <button className="landing-button" onClick={() => navigate('/analytics')}>
                            Analytics
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;