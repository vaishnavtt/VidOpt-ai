import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { AnalyzeVideo } from './pages/AnalyzeVideo';
import { PredictionHistory } from './pages/PredictionHistory';
import { ModelInsights } from './pages/ModelInsights';
import { About } from './pages/About';

const routeHeaders: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Platform Dashboard',
    subtitle: 'Real-time video transcoding time analytics and forecasting',
  },
  '/analyze': {
    title: 'Analyze & Predict',
    subtitle: 'Upload video metadata and calculate estimated transcoding duration',
  },
  '/history': {
    title: 'Prediction Records',
    subtitle: 'Review and manage previous transcoding duration estimates',
  },
  '/insights': {
    title: 'Model Benchmarking',
    subtitle: 'Empirical model comparison, error curves, and feature importance',
  },
  '/about': {
    title: 'Project Architecture',
    subtitle: 'Methodology, hardware benchmarks, and dataset citations',
  },
};

const AppContent: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentHeader = routeHeaders[location.pathname] || {
    title: 'VidOpt AI',
    subtitle: 'Intelligent Video Transcoding Forecaster',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main content body */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header
          title={currentHeader.title}
          subtitle={currentHeader.subtitle}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-6 sm:p-8 lg:p-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<AnalyzeVideo />} />
            <Route path="/history" element={<PredictionHistory />} />
            <Route path="/insights" element={<ModelInsights />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
