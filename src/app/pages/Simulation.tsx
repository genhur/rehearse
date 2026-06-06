import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';

type SimulationState = 'listening' | 'thinking' | 'speaking';

export function Simulation() {
  const navigate = useNavigate();
  const [state, setState] = useState<SimulationState>('listening');
  const [trust, setTrust] = useState(50);
  const [tension, setTension] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev === 'listening') return 'thinking';
        if (prev === 'thinking') return 'speaking';
        return 'listening';
      });

      setTrust((prev) => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 20)));
      setTension((prev) => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 15)));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleEndSimulation = () => {
    navigate('/debrief');
  };

  const stateColors = {
    listening: '#10b981',
    thinking: '#f59e0b',
    speaking: '#3b82f6',
  };

  const stateLabels = {
    listening: 'Listening',
    thinking: 'Thinking',
    speaking: 'Speaking',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="mb-1">Maya Chen</h2>
            <p className="text-muted-foreground mb-8">Technical Cofounder</p>

            <div className="relative w-64 h-64 mx-auto mb-8">
              <motion.div
                animate={{
                  scale: state === 'speaking' ? [1, 1.1, 1] : 1,
                  opacity: state === 'listening' ? 0.8 : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: state === 'speaking' ? Infinity : 0,
                }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${stateColors[state]}40 0%, ${stateColors[state]}10 70%, transparent 100%)`,
                }}
              />
              <motion.div
                animate={{
                  scale: state === 'thinking' ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 1.5,
                  repeat: state === 'thinking' ? Infinity : 0,
                }}
                className="absolute inset-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: stateColors[state],
                }}
              >
                <span className="text-white">{stateLabels[state]}</span>
              </motion.div>
            </div>

            <p className="text-muted-foreground mb-12">
              Current Mood: <span className="text-foreground">Concerned</span>
            </p>
          </motion.div>

          <div className="space-y-6 mb-12">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span>Trust</span>
                <span className="text-muted-foreground">{Math.round(trust)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '50%' }}
                  animate={{ width: `${trust}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-[var(--trust)] rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span>Tension</span>
                <span className="text-muted-foreground">{Math.round(tension)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '30%' }}
                  animate={{ width: `${tension}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-[var(--tension)] rounded-full"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleEndSimulation} variant="ghost" className="w-full">
            End Simulation
          </Button>
        </div>
      </div>
    </div>
  );
}
