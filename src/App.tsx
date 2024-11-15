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
import ProductionBoard from './components/production/productionboard/ProductionBoard';
import ProductionBoardViewer from './components/production/ProductionBoardViewer';
import Dashboard from './components/dashboards/Dashboard';
import DowntimeDashboard from './components/dashboards/DowntimeDashboard';
import LiveProductionDashboard from './components/dashboards/LiveProduction/LiveProductionDashboard';
import FactoryDashboard from "./components/dashboards/Factory/factoryDashboard";
import TestDash from "./components/dashboards/Factory/TestDash"; // Step 1: Import TestDash

const App: React.FC = () => {
    return (
        <Router>
            <div className="min-h-screen bg-background text-foreground">
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

                    {/* Production routes */}
                    <Route path="/active-line" element={<ProductionBoard />} />
                    <Route path="/production-board" element={<ProductionBoardViewer />} />

                    {/* Dashboard routes */}
                    <Route path="/analytics" element={<Dashboard />}>
                        <Route path="downtime" element={<DowntimeDashboard />} />
                        <Route path="live-production" element={<LiveProductionDashboard />} />
                        <Route path="factory" element={<FactoryDashboard />} />
                        <Route path="test" element={<TestDash />} /> {/* Step 2: Add route for TestDash */}
                    </Route>
                </Routes>
            </div>
        </Router>
    );
};

export default App;
