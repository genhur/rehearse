import { useState } from 'react';
import { Outlet } from 'react-router';
import { SessionHistoryPanel } from './SessionHistoryPanel';

export function AppLayout() {
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
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
    </div>
  );
}