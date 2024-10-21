// src/components/dashboards/DowntimeDashboard.tsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Downtime } from '../../types';
import './DowntimeDashboard.css';
import { format } from 'date-fns';
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

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const DowntimeDashboard: React.FC = () => {
    const [downtimes, setDowntimes] = useState<Downtime[]>([]);
    const [filter, setFilter] = useState({
        timePeriod: '7', // days
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

    // Update current time every minute for running clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // 60,000 ms = 1 minute

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Query to fetch open downtimes
        const q = query(collection(db, 'downtimes'), where('status', '==', 'Open'));
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const openDowntimes: Downtime[] = [];
                const lineSet: Set<string> = new Set();
                const categorySet: Set<string> = new Set();
                const reasonSet: Set<string> = new Set();

                querySnapshot.forEach((doc) => {
                    const data = doc.data() as Omit<Downtime, 'id'>;
                    openDowntimes.push({ id: doc.id, ...data });
                    lineSet.add(data.productionLineId);
                    categorySet.add(data.category);
                    reasonSet.add(data.reason);
                });

                setDowntimes(openDowntimes);
                setLines(Array.from(lineSet));
                setCategories(Array.from(categorySet));
                setReasons(Array.from(reasonSet));
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching downtimes: ", err);
                setError("Failed to load downtimes.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Handle filter changes
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilter((prev) => ({ ...prev, [name]: value }));
    };

    // Apply filters to downtimes
    const filteredDowntimes = downtimes
        .filter((dt) => {
            const { timePeriod, category, line, reason } = filter;
            const now = new Date();
            let startDate: Date | null = null;

            if (timePeriod !== 'all') {
                startDate = new Date();
                startDate.setDate(now.getDate() - parseInt(timePeriod));
            }

            const dtStartTime = dt.startTime.toDate();

            const matchesTime = timePeriod === 'all' || (startDate && dtStartTime >= startDate);
            const matchesLine = line === 'All' || dt.productionLineId === line;
            const matchesCategory = category === 'All' || dt.category === category;
            const matchesReason = reason === 'All' || dt.reason === reason;

            return matchesTime && matchesLine && matchesCategory && matchesReason;
        })
        // Sort from longest to shortest open
        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());

    // Prepare data for trend chart
    const trendData = {
        labels: Array.from(new Set(downtimes.map(dt => dt.reason))),
        datasets: [
            {
                label: 'Time Lost (minutes)',
                data: Array.from(new Set(downtimes.map(dt => dt.reason))).map(reason => {
                    const total = downtimes
                        .filter(dt => dt.reason === reason)
                        .reduce((acc, dt) => {
                            const duration = (currentTime.getTime() - dt.startTime.toDate().getTime()) / (1000 * 60);
                            return acc + duration;
                        }, 0);
                    return Math.round(total);
                }),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
        ],
    };

    const trendOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Downtime Trend',
            },
        },
    };

    // Function to format duration in hh:mm
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
                {/* Active Downtime Section */}
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
                        <div className="downtime-cards-container">
                            {filteredDowntimes.length > 0 ? (
                                filteredDowntimes.map((dt) => {
                                    // Calculate duration in minutes
                                    const durationMs = currentTime.getTime() - dt.startTime.toDate().getTime();
                                    const durationMinutes = Math.floor(durationMs / (1000 * 60));

                                    // Determine if duration exceeds 5 minutes
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
                                                <p><strong>Production Line:</strong> {dt.productionLineId}</p>
                                                <p><strong>Reason:</strong> {dt.reason}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p>No open downtimes found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Trend Section */}
                <div className="trend-section">
                    <h2>Downtime Trends</h2>
                    <div className="trend-chart">
                        <Bar data={trendData} options={trendOptions} />
                    </div>
                </div>
            </div>
        </div>
    );

};

export default DowntimeDashboard;