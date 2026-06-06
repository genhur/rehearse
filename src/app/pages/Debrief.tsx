import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

const scores = [
  { name: 'Clarity', value: 82 },
  { name: 'Confidence', value: 75 },
  { name: 'Empathy', value: 88 },
  { name: 'Assertiveness', value: 68 },
  { name: 'Handling Objections', value: 79 },
];

const timeline = [
  {
    time: '0:45',
    event: 'Trust dropped after minimizing runway concerns.',
    type: 'negative' as const,
  },
  {
    time: '2:30',
    event: 'Trust recovered after sharing a concrete plan.',
    type: 'positive' as const,
  },
];

const replayMoment = {
  original: '"It\'s not a huge issue."',
  interpretation: 'You appeared to downplay a serious problem.',
  alternative: '"I want to be transparent about the situation and discuss our options together."',
  impact: 'Higher trust and credibility.',
};

export function Debrief() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="mb-6">Simulation Complete</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-6">Timeline</h2>
            <div className="space-y-4">
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-16 text-muted-foreground">
                    {item.time}
                  </div>
                  <div className="flex gap-3 items-start">
                    {item.type === 'negative' ? (
                      <TrendingDown className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    )}
                    <p>{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-6">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scores.map((score) => (
                <div
                  key={score.name}
                  className="bg-card border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3>{score.name}</h3>
                    <span className="text-muted-foreground">{score.value}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.value}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="h-full bg-foreground rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-4">What Went Well</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Shared specific timeline and concrete next steps</li>
              <li>• Acknowledged Maya's concerns directly</li>
              <li>• Maintained calm tone under pressure</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-4">Opportunities</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Lead with transparency instead of softening the message</li>
              <li>• Invite collaboration earlier in the conversation</li>
              <li>• Prepare more detailed financial scenarios</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="mb-6">Replay Moment</h2>
            <div className="space-y-6">
              <div>
                <p className="text-muted-foreground mb-2">What you said</p>
                <p className="p-4 bg-secondary rounded-xl">{replayMoment.original}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">How the other person interpreted it</p>
                <p className="p-4 bg-secondary rounded-xl">{replayMoment.interpretation}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Alternative response</p>
                <p className="p-4 bg-secondary rounded-xl border-2 border-[#10b981]">
                  {replayMoment.alternative}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Expected result</p>
                <p className="p-4 bg-secondary rounded-xl">{replayMoment.impact}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => navigate('/')} variant="secondary" className="flex-1">
              Back to Home
            </Button>
            <Button onClick={() => navigate(-2)} className="flex-1">
              Try Again
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
