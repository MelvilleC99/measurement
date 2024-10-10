// src/App.tsx

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LineSetup from './components/LineSetup/LineSetup';
import ProductionDashboard from './components/ProductionDashboard/ProductionDashboard';
import './App.css';

// Define interfaces for shared state
export interface BasicInfo {
  lineName: string;
  productName: string;
  productReference: string;
  productDescription: string;
  unitsInOrder: number;
  deliveryDate: string;
  costOfProduct: number;
  hourlyTarget: number;
  breakevenTarget: number;
}

export interface BreakTime {
  type: 'Lunch' | 'Tea';
  duration: number; // in minutes
}

export interface TimeSlot {
  id: number;
  startTime: string; // "08:00"
  endTime: string;   // "09:00"
  break?: BreakTime; // Optional break associated with this slot
}

export interface TimeTable {
  name: string;
  days: string[];
  timeSlots: TimeSlot[];
}

export interface ProductionTarget {
  workDays: string[];
  timeTables: TimeTable[];
}

const App: React.FC = () => {
  // Shared state to hold Line Setup data
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    lineName: '',
    productName: '',
    productReference: '',
    productDescription: '',
    unitsInOrder: 0,
    deliveryDate: '',
    costOfProduct: 0,
    hourlyTarget: 0,
    breakevenTarget: 0,
  });

  const [productionTarget, setProductionTarget] = useState<ProductionTarget>({
    workDays: [],
    timeTables: [],
  });

  return (
      <Router>
        <Routes>
          <Route
              path="/"
              element={
                <LineSetup
                    basicInfo={basicInfo}
                    setBasicInfo={setBasicInfo}
                    productionTarget={productionTarget}
                    setProductionTarget={setProductionTarget}
                />
              }
          />
          <Route
              path="/dashboard"
              element={
                <ProductionDashboard
                    basicInfo={basicInfo}
                    productionTarget={productionTarget}
                />
              }
          />
        </Routes>
      </Router>
  );
};

export default App;