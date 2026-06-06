import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { Button } from '../components/Button';
import { ArrowRight, User, Target, AlertCircle } from 'lucide-react';
import { sessionStorage } from '../../../lib/session';

const scenarioTitles: Record<string, string> = {
  'failed-deal': 'Failed Deal with Cofounder',
  'ask-raise': 'Ask for a Raise',
  'performance-review': 'Difficult Performance Review',
  'end-relationship': 'End a Relationship',
  'family-conversation': 'Difficult Family Conversation',
  'set-boundary': 'Set a Boundary with a Friend',
};

const roleOptions = [
  'Cofounder',
  'Manager',
  'Partner',
  'Friend',
  'Investor',
  'Family Member',
];

export function ScenarioSetup() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [goal, setGoal] = useState('');
  const [worry, setWorry] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  // Get custom scenario from location state if coming from Home page
  const customScenario = location.state?.customScenario;
  const scenarioTitle = customScenario || scenarioTitles[scenarioId || ''] || 'Custom Scenario';

  const handleGenerate = () => {
    setShowProfile(true);
  };

  const handleStart = () => {
    console.log('START_CLICKED');
    
    // Create a new conversation session
    const session = sessionStorage.createSession(
      scenarioTitle,
      selectedRole,
      goal,
      worry
    );
    console.log('SESSION_CREATED', session);
    
    // Navigate to the conversation page
    const route = `/conversation/${session.id}`;
    console.log('NAVIGATING_TO', route);
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="mb-2">Setup Simulation</h1>
          <p className="text-muted-foreground">
            {scenarioTitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <div>
            <label className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" />
              Who are you speaking with?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedRole === role
                      ? 'border-foreground bg-secondary'
                      : 'border-border bg-card hover:border-foreground/20'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" />
              Goal of conversation
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are you trying to accomplish in this conversation?"
              className="w-full p-4 rounded-xl border border-border bg-card min-h-[120px] resize-none focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5" />
              What are you most worried about?
            </label>
            <textarea
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              placeholder="What outcome are you trying to avoid?"
              className="w-full p-4 rounded-xl border border-border bg-card min-h-[120px] resize-none focus:outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          {!showProfile && (
            <Button
              onClick={handleGenerate}
              disabled={!selectedRole || !goal || !worry}
              size="lg"
              className="w-full"
            >
              Generate Simulation
            </Button>
          )}

          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="mb-6">
                <h2 className="mb-1">Maya Chen</h2>
                <p className="text-muted-foreground">Technical Cofounder</p>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-muted-foreground mb-1">Communication Style</p>
                  <p>Direct</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Current State</p>
                  <p>Concerned about runway</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Values</p>
                  <div className="flex flex-wrap gap-2">
                    {['Transparency', 'Team Stability', 'Execution'].map((value) => (
                      <span
                        key={value}
                        className="px-3 py-1 bg-secondary rounded-lg"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleStart} size="lg" className="w-full">
                Start Simulation
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
