import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Home from './frontend/pages/Home';
import Login from './frontend/pages/login';
import Signup from './frontend/pages/signup';
import Dashboard from './frontend/pages/dashboard';
import Appliances from './frontend/pages/appliances';
import CreateReport from './frontend/pages/createReport';
import AddAppliance from './frontend/pages/addAppliance';
import Profile from './frontend/pages/profile';
import CostData from './frontend/pages/costData';
import ReportView from './frontend/pages/ReportView';
import Reports from './frontend/pages/Reports';
import './App.css';
import './frontend/pages/CommonPages.css';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appliances" element={<Appliances />} />
          <Route path="/create-report" element={<CreateReport />} />
          <Route path="/add-appliance" element={<AddAppliance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cost-data" element={<CostData />} />
          <Route path="/report-view" element={<ReportView />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;