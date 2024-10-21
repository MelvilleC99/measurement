import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage/LandingPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import TimeTables from './components/Admin/TimeTables';
import WorkDays from './components/Admin/Workdays';
import ProductionLines from './components/Admin/ProductionLines';
import ProductionSchedule from './components/Admin/ProductionSchedule';
import DowntimePage from './components/Admin/DownTime';
import SupportFunctions from './components/Admin/SupportFunctions';
import MachineList from './components/Admin/MachineList';
import ProductionBoard from './components/production/productionBoard'; // Ensure correct casing
import Dashboard from './components/dashboards/Dashboard'; // Import the new Dashboard component
import './App.css';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/timetables" element={<TimeTables />} />
                <Route path="/admin/workdays" element={<WorkDays />} />
                <Route path="/admin/add-lines" element={<ProductionLines />} />
                <Route path="/admin/production-schedule" element={<ProductionSchedule />} />
                <Route path="/admin/downtime" element={<DowntimePage />} />
                <Route path="/admin/support-functions" element={<SupportFunctions />} />
                <Route path="/admin/machine-list" element={<MachineList />} />

                {/* Add the Production Board route */}
                <Route path="/production-board" element={<ProductionBoard />} />

                {/* Add the Dashboard route */}
                <Route path="/analytics" element={<Dashboard />} />
            </Routes>
        </Router>
    );
};

export default App;