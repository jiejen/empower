import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Home from './frontend/pages/Home';
import Login from './frontend/pages/login';
import Dashboard from './frontend/pages/dashboard';
import CreateReport from './frontend/pages/createReport';
import AddAppliance from './frontend/pages/addAppliance';
import Profile from './frontend/pages/profile';
import ReportView from './frontend/pages/ReportView';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-report" element={<CreateReport />} />
          <Route path="/add-appliance" element={<AddAppliance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/report-view" element={<ReportView />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;