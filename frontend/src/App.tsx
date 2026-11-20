import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FluidSimulation } from './components/fluid/FluidSimulation';
import { Navbar } from './components/layout/Navbar';
import { AnalyzeVideo } from './pages/AnalyzeVideo';
import { PredictionHistory } from './pages/PredictionHistory';
import { ModelInsights } from './pages/ModelInsights';
import { About } from './pages/About';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Full-screen WebGL Fluid Simulation Canvas */}
      <FluidSimulation />

      {/* Radial dark scrim overlay for content readability */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(4,5,12,0.46) 0%, rgba(4,5,12,0.78) 100%)',
        }}
      />

      {/* Floating Top Navigation */}
      <Navbar />

      {/* Main Viewport Content */}
      <main className="relative z-10 w-full min-h-screen">
        <Routes>
          <Route path="/" element={<AnalyzeVideo />} />
          <Route path="/analyze" element={<AnalyzeVideo />} />
          <Route path="/history" element={<PredictionHistory />} />
          <Route path="/insights" element={<ModelInsights />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
