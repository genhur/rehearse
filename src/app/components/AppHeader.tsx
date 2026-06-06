import { Button } from './Button';
import { ArrowLeft, History, Circle, Home } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showHomeButton?: boolean;
  showHistoryButton?: boolean;
  status?: 'active' | 'complete' | 'idle';
  onHistoryClick?: () => void;
}

export function AppHeader({ 
  title, 
  subtitle, 
  showHomeButton = true,
  showHistoryButton = true, 
  status,
  onHistoryClick 
}: AppHeaderProps) {
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate('/');
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'active':
        return <Circle className="w-2 h-2 text-green-500 fill-current" />;
      case 'complete':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'complete':
        return 'Complete';
      default:
        return null;
    }
  };

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Navigation controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showHomeButton && (
              <Button
                onClick={handleHomeClick}
                variant="ghost"
                size="sm"
                className="p-2 text-muted-foreground hover:text-foreground"
                aria-label="Go home"
              >
                <Home className="w-4 h-4" />
              </Button>
            )}
            
            {showHistoryButton && (
              <Button
                onClick={onHistoryClick}
                variant="ghost"
                size="sm"
                className="p-2 text-muted-foreground hover:text-foreground"
                aria-label="Open rehearsal history"
              >
                <History className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Center: Session title and subtitle */}
          <div className="flex-1 text-left px-4 min-w-0" style={{ marginLeft: '1rem' }}>
            {title && (
              <div>
                <h1 className="text-lg font-medium truncate">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Status and metadata */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {status && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusIndicator()}
                <span>{getStatusLabel()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}