import { Button } from './Button';
import { ArrowLeft, History, Circle } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showHistoryButton?: boolean;
  status?: 'active' | 'complete' | 'idle';
  onHistoryClick?: () => void;
}

export function AppHeader({ 
  title, 
  subtitle, 
  showBackButton = true,
  showHistoryButton = true, 
  status,
  onHistoryClick 
}: AppHeaderProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
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
          {/* Left: Home navigation */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {showBackButton ? (
              <Button
                onClick={handleBackClick}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Rehearse</span>
              </Button>
            ) : (
              <div className="px-2 py-1">
                <span 
                  className="text-sm font-medium tracking-wider uppercase text-muted-foreground/60"
                  style={{ letterSpacing: '0.15em' }}
                >
                  Rehearse
                </span>
              </div>
            )}
          </div>

          {/* Center: Session title and subtitle */}
          <div className="flex-1 text-center px-4 min-w-0">
            {title && (
              <div>
                <h1 className="text-lg font-medium truncate">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Controls and status */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {status && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusIndicator()}
                <span>{getStatusLabel()}</span>
              </div>
            )}
            
            {showHistoryButton && (
              <Button
                onClick={onHistoryClick}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <History className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}