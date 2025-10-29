import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './frontend/pages/Home';
import Login from './frontend/pages/login';
import Dashboard from './frontend/pages/dashboard';
import CreateReport from './frontend/pages/createReport';
import AddAppliance from './frontend/pages/addAppliance';
import Profile from './frontend/pages/profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-report" element={<CreateReport />} />
        <Route path="/add-appliance" element={<AddAppliance />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;