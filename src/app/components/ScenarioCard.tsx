import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';

interface ScenarioCardProps {
  id: string;
  title: string;
  difficulty: string;
  skills: string[];
}

export function ScenarioCard({ id, title, difficulty, skills }: ScenarioCardProps) {
  const navigate = useNavigate();

  const difficultyColors = {
    'High Stakes': 'text-[#ef4444]',
    'Moderate': 'text-[#f59e0b]',
    'Practice': 'text-[#10b981]',
  };

  return (
    <motion.button
      onClick={() => navigate(`/setup/${id}`)}
      whileHover={{ y: -2 }}
      className="group relative bg-card border border-border rounded-2xl p-6 text-left transition-all hover:border-foreground/20 hover:shadow-lg w-full"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="mb-2">{title}</h3>
          <p className={`mb-4 ${difficultyColors[difficulty as keyof typeof difficultyColors] || 'text-muted-foreground'}`}>
            {difficulty}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-muted-foreground">Skills:</span>
            {skills.map((skill, i) => (
              <span key={i} className="text-foreground">
                {skill}
                {i < skills.length - 1 && ','}
              </span>
            ))}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </motion.button>
  );
}
