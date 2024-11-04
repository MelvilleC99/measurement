// src/components/Admin/AdminDashboard.tsx

import React, { useState } from 'react';
import './AdminDashboard.css';
import ProductionLines from './ProductionLines';
import TimeTables from './TimeTables';
import WorkDays from './Workdays';
import SupportFunctions from './SupportFunctions';
import MachineList from './MachineList';
import ProductionSchedule from './ProductionSchedule';
import Downtime from './DownTime';
import StyleCard from './StyleCard';
import ProductHierarchyList from './ProductHierarchyList'; // Import the existing component
import ScheduleOvertime from './ScheduleOvertime'; // Import the ScheduleOvertime component
import TestSchedule from './TestSchedule'; // Import the TestSchedule component

const AdminDashboard: React.FC = () => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const handleOptionClick = (option: string) => {
        setSelectedOption(option);
    };

    return (
        <div className="dashboard-container">
            <div className="header">
                <button className="back-button" onClick={() => window.history.back()}>
                    Back to Home
                </button>
                <h1 className="admin-title">Admin Dashboard</h1>
            </div>

            <div className="dashboard-content">
                <div className="toolbar">
                    <button className="toolbar-button" onClick={() => handleOptionClick('ProductionLines')}>
                        Add Production Lines
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('TimeTables')}>
                        Time Tables
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('WorkDays')}>
                        Work Days
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('SupportFunctions')}>
                        Support Functions
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('MachineList')}>
                        Machine List
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('ProductionSchedule')}>
                        Production Schedule
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('Downtime')}>
                        Downtime
                    </button>
                    <button className="toolbar-button" onClick={() => handleOptionClick('StyleCard')}>
                        Load Style
                    </button>
                    {/* Add the new Product Hierarchy button */}
                    <button className="toolbar-button" onClick={() => handleOptionClick('ProductHierarchy')}>
                        Product Hierarchy
                    </button>
                    {/* Add the new Schedule Overtime button */}
                    <button className="toolbar-button" onClick={() => handleOptionClick('ScheduleOvertime')}>
                        Schedule Overtime
                    </button>
                    {/* Add the new Test Schedule button */}
                    <button className="toolbar-button" onClick={() => handleOptionClick('TestSchedule')}>
                        Test Schedule
                    </button>
                </div>

                <div className="content-area">
                    {/* Conditionally Render Components Based on Selected Option */}
                    {!selectedOption && (
                        <div className="default-message">Select an option from the toolbar to begin</div>
                    )}

                    {selectedOption === 'ProductionLines' && <ProductionLines />}
                    {selectedOption === 'TimeTables' && <TimeTables />}
                    {selectedOption === 'WorkDays' && <WorkDays />}
                    {selectedOption === 'SupportFunctions' && <SupportFunctions />}
                    {selectedOption === 'MachineList' && <MachineList />}
                    {selectedOption === 'ProductionSchedule' && <ProductionSchedule />}
                    {selectedOption === 'Downtime' && <Downtime />}
                    {selectedOption === 'StyleCard' && <StyleCard />}
                    {selectedOption === 'ProductHierarchy' && <ProductHierarchyList />}
                    {selectedOption === 'ScheduleOvertime' && <ScheduleOvertime />}
                    {selectedOption === 'TestSchedule' && <TestSchedule />} {/* Render TestSchedule Component */}
                </div>
            </div>
        </div>
    );

};

export default AdminDashboard;
