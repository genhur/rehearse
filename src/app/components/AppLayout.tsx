import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SessionHistoryPanel } from './SessionHistoryPanel';
import { InterfaceKit } from 'interface-kit/react';
import { AmbientBackground, AmbientMood } from './AmbientBackground';
import { AmbientProvider, useAmbient } from './AmbientContext';

/** Warm while preparing (home, setup); cool once in the room and reflecting. */
function moodForPath(pathname: string): AmbientMood {
  if (pathname.startsWith('/simulation')) return 'cool';
  if (pathname.startsWith('/conversation')) return 'cool';
  if (pathname.startsWith('/debrief')) return 'cool';
  return 'warm';
}

function AmbientStage() {
  const { pathname } = useLocation();
  const { intensity } = useAmbient();
  return <AmbientBackground mood={moodForPath(pathname)} intensity={intensity} />;
}

export function AppLayout() {
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  return (
    <AmbientProvider>
      <div className="relative min-h-screen">
        <AmbientStage />

        {/* Session History Panel */}
        <SessionHistoryPanel
          isOpen={isHistoryPanelOpen}
          onClose={() => setIsHistoryPanelOpen(false)}
        />

        {/* Page Content with history panel controls */}
        <Outlet context={{
          openHistoryPanel: () => setIsHistoryPanelOpen(true),
          isHistoryPanelOpen
        }} />

        {/* Interface Kit - Development Mode Only */}
        {import.meta.env.DEV && <InterfaceKit />}
      </div>
    </AmbientProvider>
  );
}
