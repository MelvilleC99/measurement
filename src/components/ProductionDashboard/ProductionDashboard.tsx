// src/components/ProductionDashboard/ProductionDashboard.tsx
import React, { useEffect, useState } from 'react';
import { BasicInfo, ProductionTarget, Measurement, ActiveDowntime, DowntimeLog } from '../../types';
import './ProductionDashboard.css';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

interface ProductionDashboardProps {
    basicInfo: BasicInfo;
    productionTarget: ProductionTarget;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({
                                                                     basicInfo,
                                                                     productionTarget,
                                                                 }) => {
    const navigate = useNavigate();
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [selectedHour, setSelectedHour] = useState<number>(0);
    const [activeDowntimes, setActiveDowntimes] = useState<ActiveDowntime[]>([]);
    const [downtimeLogs, setDowntimeLogs] = useState<DowntimeLog[]>([]);
    const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
    const [downtimeReason, setDowntimeReason] = useState<string>('');

    // Initialize measurements based on the selected timetable
    useEffect(() => {
        const initializeMeasurements = () => {
            const newMeasurements: Measurement[] = [];
            const timetable = productionTarget.timeTables.find((tt) =>
                tt.days.includes(new Date().toLocaleDateString(undefined, { weekday: 'long' }))
            );

            if (timetable) {
                timetable.timeSlots.forEach((slot) => {
                    const hourLabel = `${slot.startTime} - ${slot.endTime}`;
                    let adjustedTarget = basicInfo.hourlyTarget;

                    if (slot.break) {
                        adjustedTarget = Math.ceil(
                            (basicInfo.hourlyTarget / 60) * (60 - slot.break.duration)
                        );
                    }

                    newMeasurements.push({
                        hour: hourLabel,
                        target: adjustedTarget,
                        output: 0,
                        hourlyEfficiency: 0,
                        cumulativeEfficiency: 0,
                    });
                });
            }

            setMeasurements(newMeasurements);
        };

        initializeMeasurements();
    }, [productionTarget, basicInfo.hourlyTarget]);

    // Handle unit production
    const handleUnitProduced = () => {
        setMeasurements((prev) => {
            const updated = [...prev];
            if (selectedHour < updated.length) {
                updated[selectedHour].output += 1;
                updated[selectedHour].hourlyEfficiency = Math.ceil(
                    (updated[selectedHour].output / updated[selectedHour].target) * 100
                );

                const cumulativeOutput = updated
                    .slice(0, selectedHour + 1)
                    .reduce((acc, curr) => acc + curr.output, 0);
                const cumulativeTarget = updated
                    .slice(0, selectedHour + 1)
                    .reduce((acc, curr) => acc + curr.target, 0);
                updated[selectedHour].cumulativeEfficiency = Math.ceil(
                    (cumulativeOutput / cumulativeTarget) * 100
                );
            }
            return updated;
        });
    };

    // Convert milliseconds to a readable time format (HH:MM:SS)
    const msToTime = (duration: number): string => {
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)) % 60);
        let hours = Math.floor(duration / (1000 * 60 * 60));

        const pad = (num: number) => String(num).padStart(2, '0');

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    return (
        <div className="dashboard-container">
            <h1>Production Dashboard</h1>
            {/* Production Measurement */}
            <div className="measurement-container">
                <h2>Production Measurement</h2>
                <table>
                    <thead>
                    <tr>
                        <th>Working Hour</th>
                        <th>Target</th>
                        <th>Output</th>
                        <th>Hourly Efficiency (%)</th>
                        <th>Cumulative Efficiency (%)</th>
                    </tr>
                    </thead>
                    <tbody>
                    {measurements.map((m, idx) => (
                        <tr key={idx}>
                            <td>{m.hour}</td>
                            <td>{m.target}</td>
                            <td>{m.output}</td>
                            <td>{m.hourlyEfficiency}%</td>
                            <td>{m.cumulativeEfficiency}%</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {/* Downtime Management */}
            <div className="downtime-container">
                <div className="active-downtimes">
                    <h2>Active Downtimes</h2>
                    {activeDowntimes.length === 0 ? (
                        <p>No active downtimes.</p>
                    ) : (
                        activeDowntimes.map((dt) => (
                            <div key={dt.id} className="downtime-block">
                                <p>Reason: {dt.reason}</p>
                                <p>Time Open: {msToTime(new Date().getTime() - dt.startTime.getTime())}</p>
                            </div>
                        ))
                    )}
                </div>
                <div className="downtime-logs">
                    <h2>Downtime Logs</h2>
                    {downtimeLogs.length === 0 ? (
                        <p>No downtime logs available.</p>
                    ) : (
                        <ul>
                            {downtimeLogs.map((log) => (
                                <li key={log.id}>
                                    {log.reason} - Time Lost: {log.timeLost}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {/* Buttons */}
            <div className="buttons">
                <button className="unit-produced" onClick={handleUnitProduced}>Record Output</button>
                <button className="record-downtime" onClick={() => setModalIsOpen(true)}>Record Downtime</button>
            </div>
            {/* Downtime Modal */}
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                contentLabel="Record Downtime"
                className="modal"
                overlayClassName="overlay"
            >
                <h2>Record Downtime</h2>
                <input
                    type="text"
                    placeholder="Enter Downtime Reason"
                    value={downtimeReason}
                    onChange={(e) => setDowntimeReason(e.target.value)}
                />
                <button onClick={() => {
                    if (downtimeReason.trim()) {
                        const newDowntime = {
                            id: activeDowntimes.length + 1,
                            reason: downtimeReason,
                            startTime: new Date(),
                        };
                        setActiveDowntimes([...activeDowntimes, newDowntime]);
                        setModalIsOpen(false);
                    }
                }}>Save</button>
            </Modal>
        </div>
    );
};

export default ProductionDashboard;