import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, memo } from 'react';
import { ThemeProvider } from './context/ThemeProvider';
import Sidebar from './Sidebar';
import Home from './Home';
import Settings from './Settings';
import IamMia from './IamMia';
import Crone from './Crone';
import EmotionDashboard from './EmotionDashboard';
import SkillMarketplace from './SkillMarketplace';
import { lazy, Suspense } from 'react';
import { FileStoreProvider } from './mia_studio/context/FileStoreContext';

const StudioPageLazy = lazy(() => import('./mia_studio/components/StudioPage').then(m => ({ default: m.StudioPage })));
import ZenModeOverlay from './components/ZenModeOverlay';
import ResonantOrchestrator from './components/ResonantOrchestrator';
import { PerformanceOverlay } from './components/PerformanceOverlay';
import { useConfig } from './hooks/useConfig';
import { useMIABootstrap } from './hooks/useMIAQueries';


function App() {
  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell />
      </Router>
    </ThemeProvider>
  );
}

const THEME_BACKGROUNDS: Record<string, string> = {
  aurora: 'radial-gradient(circle at 20% 20%, rgba(0, 255, 204, 0.24), transparent 32%), radial-gradient(circle at 80% 10%, rgba(250, 37, 161, 0.18), transparent 30%), linear-gradient(135deg, #030712 0%, #111827 48%, #050505 100%)',
  graphite: 'linear-gradient(135deg, #050505 0%, #171717 52%, #262626 100%)',
  midnight: 'linear-gradient(135deg, #020617 0%, #172554 42%, #111827 100%)',
  sakura: 'radial-gradient(circle at 80% 15%, rgba(251, 113, 133, 0.22), transparent 34%), linear-gradient(135deg, #1f1117 0%, #3b2430 48%, #09090b 100%)',
};

const resolveBackgroundUrl = (url: string) => {
  if (!url) return '';
  if (!url.startsWith('/')) return url;
  return `http://127.0.0.1:8000${encodeURI(url)}`;
};

const BackgroundLayer = memo(({ bgUrl, bgType }: { bgUrl: string, bgType: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = bgType === 'video'; 
  const isImage = bgType === 'image';
  const isTheme = bgType === 'themes';

  const finalBgUrl = resolveBackgroundUrl(bgUrl);
  const themeBackground = THEME_BACKGROUNDS[bgUrl] || bgUrl;

  // PRIORITY 1: Force Play & Sync on Source Change
  useEffect(() => {
    if (videoRef.current && isVideo) {
      console.log("[Background] Source change detected, enforcing playback...");
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("[Background] Autoplay prevented, waiting for user interaction:", error);
        });
      }
    }
  }, [finalBgUrl, isVideo]);

  // PRIORITY 4: Visibility Lifecycle Control
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
      } else if (isVideo) {
        // Explicitly reload on return if frozen or stalled
        if (videoRef.current && (videoRef.current.paused || videoRef.current.readyState < 2)) {
          videoRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isVideo]);


  if (!bgUrl && !isVideo && !isImage) return null;

  return (
    <div className="fixed inset-0 w-full h-full z-0 transition-all duration-1000">
      {/* NON-UNMOUNT VIDEO ARCHITECTURE */}
      <video 
        ref={videoRef}
        autoPlay loop muted playsInline 
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" 
        src={isVideo ? finalBgUrl : undefined} 
        style={{ 
          opacity: isVideo ? 1 : 0, 
          visibility: isVideo ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }}
      />
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000" 
        style={{ 
          backgroundImage: isImage ? `url("${finalBgUrl}")` : 'none',
          opacity: isImage ? 1 : 0,
          visibility: isImage ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }} 
      />
      <div 
        className="absolute inset-0 w-full h-full transition-opacity duration-1000" 
        style={{ 
          background: isTheme ? themeBackground : bgUrl,
          opacity: (!isVideo && !isImage) ? 1 : 0,
          visibility: (!isVideo && !isImage) ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }} 
      />
      <div 
        className={`absolute inset-0 bg-black pointer-events-none transition-all duration-500`} 
        style={{ opacity: 'calc(1 - var(--ui-opacity, 0.5))' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
    </div>
  );
});

function AppShell() {
  const { config } = useConfig();
  const { isLoading: isBootstrapping } = useMIABootstrap();
  const [isSafeMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [startupPhase, setStartupPhase] = useState(0); // 0 to 3
  const location = useLocation();
  const isStudioRoute = location.pathname.startsWith('/studio');
  const effectiveSidebarCollapsed = sidebarCollapsed || isNarrowViewport;

  // STAGE 4: Staged Startup Sequence & Hardware Detection
  useEffect(() => {
    const timers = [
      setTimeout(() => setStartupPhase(1), 50), // Shorter delays with bootstrap
      setTimeout(() => setStartupPhase(2), 200),
      setTimeout(() => setStartupPhase(3), 400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => setIsNarrowViewport(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  return (
        <div 
          className={`relative min-h-screen bg-background overflow-hidden flex ${isSafeMode ? 'safe-mode' : ''}`}
          style={{ '--ui-opacity': config?.appearance?.ui_opacity ?? 0.5 } as React.CSSProperties}
        >
          {/* Global Loading Overlay for Bootstrap */}
          {isBootstrapping && startupPhase < 3 && (
            <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center font-mono">
              <div className="text-primary text-xl tracking-[0.3em] animate-pulse">INITIATING MIA CORE...</div>
            </div>
          )}

          {/* Phase 1: Background Layer */}
          {startupPhase >= 1 && (
            <BackgroundLayer 
              bgUrl={config?.appearance?.background_url || ''} 
              bgType={config?.appearance?.background_type || 'color'} 
            />
          )}

          {/* Phase 2: Sidebar Navigation */}
          {startupPhase >= 2 && !isStudioRoute && (
            <div 
              className={`transition-all duration-700 ease-in-out relative z-[100] ${isZenMode ? 'opacity-0 -translate-x-20 pointer-events-none' : 'opacity-100 translate-x-0'}`}
            >
              <Sidebar 
                isZenMode={isZenMode} 
                onToggleZen={() => setIsZenMode(!isZenMode)} 
                collapsed={effectiveSidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
              />
            </div>
          )}

          {/* Phase 2: Main Content Area */}
          {startupPhase >= 2 && (
            <main 
              className={`relative z-10 flex-1 h-screen overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-700 ease-in-out ${
                isZenMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
              }`}
              style={{ paddingLeft: isStudioRoute ? 0 : (effectiveSidebarCollapsed ? '5rem' : '16rem') }}
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
                    <Suspense fallback={
                      <div className="h-screen w-full flex items-center justify-center text-primary font-mono animate-pulse bg-transparent">
                        Memuat Studio Module...
                      </div>
                    }>
                      <StudioPageLazy onToggleZen={() => setIsZenMode(true)} />
                    </Suspense>
                  </FileStoreProvider>
                } />
              </Routes>
            </main>
          )}

          {/* Phase 3: Supporting Systems */}
          {startupPhase >= 3 && (
            <>
              <ZenModeOverlay 
                isActive={isZenMode} 
                onExit={() => setIsZenMode(false)} 
              />
              {!isStudioRoute && <ResonantOrchestrator />}
              <PerformanceOverlay />
            </>
          )}
        </div>
  );
}

export default App;
