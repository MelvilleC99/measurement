// src/components/dashboards/DowntimeDashboard.tsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Downtime } from '../../types';
import './DowntimeDashboard.css';

/* Temporarily commenting out Chart.js related code
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);
*/

const DowntimeDashboard: React.FC = () => {
    const [downtimes, setDowntimes] = useState<Downtime[]>([]);
    const [filter, setFilter] = useState({
        timePeriod: '7',
        category: 'All',
        line: 'All',
        reason: 'All',
    });

    const [lines, setLines] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [reasons, setReasons] = useState<string[]>([]);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    // Handle filter changes
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilter((prev) => ({ ...prev, [name]: value }));
    };

    // Format duration function
    const formatDuration = (startTime: Date): string => {
        const diffMs = currentTime.getTime() - startTime.getTime();
        const diffTotalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffTotalMinutes / 60);
        const minutes = diffTotalMinutes % 60;
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes}`;
    };

    return (
        <div className="downtime-dashboard-container">
            {error && <p className="error-message">{error}</p>}
            <div className="dashboard-content">
                <div className="active-downtime-section">
                    <h2>Current Open Downtimes</h2>
                    <div className="filters">
                        <label>
                            Category Selection:
                            <select name="category" value={filter.category} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Line Selection:
                            <select name="line" value={filter.line} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                {lines.map((line) => (
                                    <option key={line} value={line}>{line}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Reason Code Selection:
                            <select name="reason" value={filter.reason} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                {reasons.map((res) => (
                                    <option key={res} value={res}>{res}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Time Period (Days):
                            <select name="timePeriod" value={filter.timePeriod} onChange={handleFilterChange}>
                                <option value="7">Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="all">All Time</option>
                            </select>
                        </label>
                    </div>

                    {loading ? (
                        <p>Loading downtimes...</p>
                    ) : (
                        <p>Downtime data will be displayed here</p>
                        /* Commenting out the problematic section
                        <div className="downtime-cards-container">
                            {filteredDowntimes.length > 0 ? (
                                filteredDowntimes.map((dt) => {
                                    const durationMs = currentTime.getTime() - dt.startTime.toDate().getTime();
                                    const durationMinutes = Math.floor(durationMs / (1000 * 60));
                                    const isLong = durationMinutes > 5;

                                    return (
                                        <div
                                            key={dt.id}
                                            className={`downtime-card ${isLong ? 'alert' : ''}`}
                                        >
                                            <div className="downtime-time">
                                                {formatDuration(dt.startTime.toDate())}
                                            </div>
                                            <div className="downtime-info">
                                                <p><strong>Category:</strong> {dt.category}</p>
                                                <p><strong>Line:</strong> {dt.productionLineId}</p>
                                                <p><strong>Reason:</strong> {dt.reason}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p>No open downtimes found.</p>
                            )}
                        </div>
                        */
                    )}
                </div>

                {/* Commenting out the Trend Section
                <div className="trend-section">
                    <h2>Downtime Trends</h2>
                    <div className="trend-chart">
                        <Bar data={trendData} options={trendOptions} />
                    </div>
                </div>
                */}
            </div>
        </div>
    );
};

export default DowntimeDashboard;