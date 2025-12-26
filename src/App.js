import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ArbitrationPage from './pages/ArbitrationPage';
import MarketDetailPage from './pages/MarketDetailPage';
import RegisterProviderPage from './pages/RegisterProviderPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50">
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/arbitration" element={<ArbitrationPage />} />
            <Route path="/market/:id" element={<MarketDetailPage />} />
            <Route path="/register-provider" element={<RegisterProviderPage />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
