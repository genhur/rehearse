import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, User, Briefcase, Heart, Circle } from 'lucide-react';
import { Button } from './Button';
import { getSessions, type RehearsalSession } from '../../../lib/sessions';
import { useNavigate } from 'react-router';

interface SessionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionHistoryPanel({ isOpen, onClose }: SessionHistoryPanelProps) {
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setSessions(getSessions());
    }
  }, [isOpen]);

  const getCategoryIcon = (category: RehearsalSession['category']) => {
    switch (category) {
      case 'professional':
        return <Briefcase className="w-4 h-4" />;
      case 'personal':
        return <Heart className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: RehearsalSession['category']) => {
    switch (category) {
      case 'professional':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'personal':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleSessionClick = (session: RehearsalSession) => {
    onClose();
    if (session.status === 'active') {
      navigate(`/conversation/${session.id}`);
    } else if (session.latestReport) {
      navigate(`/debrief/${session.id}`);
    } else {
      navigate(`/conversation/${session.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Rehearsals</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Your practiced conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {sessions.map((session) => (
                    <motion.button
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className="w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">
                              {session.title}
                            </h3>
                            <div className="flex items-center gap-1">
                              {session.status === 'active' && (
                                <Circle className="w-2 h-2 text-green-500 fill-current" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(session.category)}`}>
                              {getCategoryIcon(session.category)}
                              {session.category.charAt(0).toUpperCase() + session.category.slice(1)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {session.scenario}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(session.createdAt)}</span>
                            <span>
                              {session.attempts.length} attempt{session.attempts.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}