import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-container">
            <header className="landing-header">
                <h1 className="company-name">VISIBLE</h1>
                <p className="tagline">Empowering you through real-time visibility and analytics to achieve operational excellence</p>
            </header>

            <div className="options-grid">
                <div className="option-card admin" onClick={() => navigate('/admin')}>
                    <div className="card-icon"></div>
                    <h3>Admin</h3>
                    <p>Manage users, settings, and configurations</p>
                </div>

                <div className="option-card start-line" onClick={() => navigate('/active-line')}>
                    <div className="card-icon"></div>
                    <h3>Start Line</h3>
                    <p>Initiate and monitor active production lines</p>
                </div>

                <div className="option-card production" onClick={() => navigate('/production-board')}>
                    <div className="card-icon"></div>
                    <h3>Production Boards</h3>
                    <p>View live production performance and status</p>
                </div>

                <div className="option-card analytics" onClick={() => navigate('/analytics')}>
                    <div className="card-icon"></div>
                    <h3>Analytics</h3>
                    <p>Access detailed reports and data insights</p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;