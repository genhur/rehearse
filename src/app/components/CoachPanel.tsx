import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MessageCircle, X } from 'lucide-react';
import { Button } from './Button';
import { CoachNote } from '../../../lib/live-coaching';

interface CoachPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  latestNote: CoachNote | null;
  allNotes: CoachNote[];
  onNoteClick: (messageId: string) => void;
  isConversationActive: boolean;
}

export function CoachPanel({ 
  isOpen, 
  onToggle, 
  latestNote, 
  allNotes, 
  onNoteClick, 
  isConversationActive 
}: CoachPanelProps) {
  const [showAllNotes, setShowAllNotes] = useState(false);

  const getSeverityColor = (severity: CoachNote['severity']) => {
    switch (severity) {
      case 'positive': return 'border-green-200 bg-green-50';
      case 'important': return 'border-orange-200 bg-orange-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: CoachNote['severity']) => {
    switch (severity) {
      case 'positive': return '✓';
      case 'important': return '⚠';
      default: return '💡';
    }
  };

  const formatNoteType = (type: CoachNote['type']) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="relative">
      {/* Mobile toggle button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          size="sm"
          className={`rounded-full w-12 h-12 p-0 shadow-lg ${
            allNotes.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : ''
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          {allNotes.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {allNotes.length}
            </span>
          )}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-card/50 backdrop-blur-sm overflow-hidden"
            >
              <CoachContent
                latestNote={latestNote}
                allNotes={allNotes}
                onNoteClick={onNoteClick}
                isConversationActive={isConversationActive}
                showAllNotes={showAllNotes}
                onShowAllToggle={() => setShowAllNotes(!showAllNotes)}
                onClose={() => setShowAllNotes(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden">
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-40"
                onClick={onToggle}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-xl z-50 max-h-[70vh]"
              >
                <div className="p-4">
                  <div className="w-8 h-1 bg-muted rounded-full mx-auto mb-4" />
                  <CoachContent
                    latestNote={latestNote}
                    allNotes={allNotes}
                    onNoteClick={onNoteClick}
                    isConversationActive={isConversationActive}
                    showAllNotes={showAllNotes}
                    onShowAllToggle={() => setShowAllNotes(!showAllNotes)}
                    onClose={onToggle}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface CoachContentProps {
  latestNote: CoachNote | null;
  allNotes: CoachNote[];
  onNoteClick: (messageId: string) => void;
  isConversationActive: boolean;
  showAllNotes: boolean;
  onShowAllToggle: () => void;
  onClose: () => void;
}

function CoachContent({
  latestNote,
  allNotes,
  onNoteClick,
  isConversationActive,
  showAllNotes,
  onShowAllToggle,
  onClose
}: CoachContentProps) {
  const getSeverityColor = (severity: CoachNote['severity']) => {
    switch (severity) {
      case 'positive': return 'border-green-200 bg-green-50';
      case 'important': return 'border-orange-200 bg-orange-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: CoachNote['severity']) => {
    switch (severity) {
      case 'positive': return '✓';
      case 'important': return '⚠';
      default: return '💡';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Coach</h3>
          <div className="hidden md:block">
            {allNotes.length > 1 && (
              <Button
                onClick={onShowAllToggle}
                size="sm"
                variant="ghost"
              >
                {showAllNotes ? 'Latest' : `${allNotes.length} notes`}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showAllNotes ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={onShowAllToggle}
                size="sm"
                variant="ghost"
                className="p-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">All Coach Notes</span>
            </div>
            
            {allNotes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${getSeverityColor(note.severity)}`}
                onClick={() => {
                  onNoteClick(note.messageId);
                  onClose();
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">{getSeverityIcon(note.severity)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{note.text}</p>
                    {note.suggestion && (
                      <p className="text-xs text-gray-600 mt-1">{note.suggestion}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(note.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div>
            {isConversationActive && latestNote ? (
              <motion.div
                key={latestNote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${getSeverityColor(latestNote.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getSeverityIcon(latestNote.severity)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">{latestNote.text}</p>
                    {latestNote.suggestion && (
                      <p className="text-sm text-gray-600 mb-2">{latestNote.suggestion}</p>
                    )}
                    <button
                      onClick={() => onNoteClick(latestNote.messageId)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View in transcript →
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : allNotes.length > 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {allNotes.length} coach note{allNotes.length === 1 ? '' : 's'} from this conversation
                </p>
                <Button
                  onClick={onShowAllToggle}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Review notes
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Coach notes will appear here as you practice</p>
              </div>
            )}

            {allNotes.length > 1 && !isConversationActive && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  onClick={onShowAllToggle}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Review all {allNotes.length} notes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}