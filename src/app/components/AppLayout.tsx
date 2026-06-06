import { useState } from 'react';
import { Outlet } from 'react-router';
import { Button } from './Button';
import { SessionHistoryPanel } from './SessionHistoryPanel';
import { History } from 'lucide-react';

export function AppLayout() {
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      {/* History Panel Button */}
      <div className="fixed top-6 left-6 z-40">
        <Button
          onClick={() => setIsHistoryPanelOpen(true)}
          variant="ghost"
          size="sm"
          className="p-2 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90"
        >
          <History className="w-5 h-5" />
        </Button>
      </div>

      {/* Session History Panel */}
      <SessionHistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
      />

      {/* Page Content */}
      <Outlet />
    </div>
  );
}