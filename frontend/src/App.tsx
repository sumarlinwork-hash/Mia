import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeProvider';
import Sidebar from './Sidebar';
import Home from './Home';
import Settings from './Settings';
import IamMia from './IamMia';
import Crone from './Crone';
import EmotionDashboard from './EmotionDashboard';
import SkillMarketplace from './SkillMarketplace';
import { StudioPage } from './mia_studio/components/StudioPage';
import { FileStoreProvider } from './mia_studio/context/FileStoreContext';
import ZenModeOverlay from './components/ZenModeOverlay';
import ResonantOrchestrator from './components/ResonantOrchestrator';

import type { MIAConfig } from './types/config';

function App() {
  const [config, setConfig] = useState<MIAConfig | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchConfig = () => {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => setConfig(data))
        .catch(() => setTimeout(fetchConfig, 1000));
    };
    
    fetchConfig();

    // Global Config Sync: Listen for browser events (dispatched by ConfigContext WS)
    window.addEventListener('configUpdated', fetchConfig);
    
    return () => {
      window.removeEventListener('configUpdated', fetchConfig);
    };
  }, []);

  const bgUrl = config?.appearance?.background_url || '';
  


  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="relative min-h-screen bg-background overflow-hidden flex">
          
          {config && (
            <div className="fixed inset-0 w-full h-full z-0 transition-all duration-1000">
              {config.appearance.background_type === 'video' ? (
                <video 
                  key={`bg-video-${bgUrl}`}
                  autoPlay loop muted playsInline 
                  className="absolute inset-0 w-full h-full object-cover" 
                  src={bgUrl.startsWith('/') ? `http://127.0.0.1:8000${encodeURI(bgUrl)}` : bgUrl} 
                />
              ) : config.appearance.background_type === 'image' ? (
                <div 
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-all" 
                  style={{ 
                    backgroundImage: `url("${bgUrl.startsWith('/') ? `http://127.0.0.1:8000${bgUrl}` : bgUrl}")`
                  }} 
                />
              ) : (
                <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: bgUrl }} />
              )}
              <div 
                className={`absolute inset-0 bg-black pointer-events-none transition-all duration-500`} 
                style={{ opacity: 1 - (config?.appearance?.ui_opacity ?? 0.5) }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
            </div>
          )}


          {/* Sidebar Navigation */}
          <div 
            className={`transition-all duration-700 ease-in-out relative z-[100] ${isZenMode ? 'opacity-0 -translate-x-20 pointer-events-none' : 'opacity-100 translate-x-0'}`}
          >
            <Sidebar 
              isZenMode={isZenMode} 
              onToggleZen={() => setIsZenMode(!isZenMode)} 
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
            />
          </div>

          {/* Main Content Area */}
          <main 
            className={`relative z-10 flex-1 h-screen overflow-y-auto custom-scrollbar transition-all duration-700 ease-in-out ${
              isZenMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}
            style={{ paddingLeft: sidebarCollapsed ? '5rem' : '16rem' }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/crone" element={<Crone />} />
              <Route path="/iam-mia" element={<IamMia />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/emotion" element={<EmotionDashboard />} />
              <Route path="/skills" element={<SkillMarketplace />} />
              <Route path="/studio" element={
                <FileStoreProvider>
                  <StudioPage />
                </FileStoreProvider>
              } />
            </Routes>
          </main>

          <ZenModeOverlay 
            isActive={isZenMode} 
            onExit={() => setIsZenMode(false)} 
          />
          
          <ResonantOrchestrator />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
