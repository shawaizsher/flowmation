import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Zap, GitBranch, Play, CheckCircle2, Boxes, Sparkles } from 'lucide-react';
import { useStore } from '../store';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles size={32} />,
    title: 'Welcome to Flowmation!',
    description: 'Flowmation is a visual workflow automation platform. You can automate repetitive tasks by connecting different apps and services together — no coding required.',
    tip: 'Think of it like building a recipe: "When X happens, do Y, then Z."',
    color: 'brand',
  },
  {
    icon: <Boxes size={32} />,
    title: 'The Node Catalog',
    description: 'On the left sidebar you\'ll find the Node Catalog — a library of actions like "Send Email", "HTTP Request", "Gemini Chat", and more. Drag any node onto the canvas to add it to your workflow.',
    tip: 'Use the search bar at the top of the catalog to find nodes quickly.',
    color: 'blue',
  },
  {
    icon: <GitBranch size={32} />,
    title: 'Connecting Nodes',
    description: 'Drag from the dot on the right side of one node to the left side of another to connect them. Data flows from left to right — the output of one node becomes the input of the next.',
    tip: 'You can branch your workflow using IF Condition nodes to handle different cases.',
    color: 'purple',
  },
  {
    icon: <Zap size={32} />,
    title: 'Triggers',
    description: 'Every workflow starts with a Trigger node. It defines what kicks off your workflow — a manual button click, an incoming webhook, or a scheduled time.',
    tip: 'Drag a "Manual Trigger" onto the canvas first, then build from there.',
    color: 'yellow',
  },
  {
    icon: <Play size={32} />,
    title: 'Running Your Workflow',
    description: 'Click the Run button (▶) in the top bar to execute your workflow. You\'ll see each node light up as it runs, and you can inspect the input and output of every step in the right panel.',
    tip: 'Check the LOGS tab on the right panel to see execution history and debug issues.',
    color: 'green',
  },
  {
    icon: <CheckCircle2 size={32} />,
    title: 'You\'re ready!',
    description: 'That\'s everything you need to know to get started. Create your first workflow, experiment with nodes, and build something amazing. You can always re-open this guide from the Help menu.',
    tip: 'Start with a simple workflow: Manual Trigger → Console Log. Then add more nodes!',
    color: 'brand',
  },
];

const colorMap: Record<string, string> = {
  brand: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const dotMap: Record<string, string> = {
  brand: 'bg-brand-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
};

export default function TutorialOverlay() {
  const setShowTutorial = useStore((s) => s.setShowTutorial);
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleClose = () => setShowTutorial(false);
  const handleNext = () => isLast ? handleClose() : setCurrentStep(s => s + 1);
  const handlePrev = () => setCurrentStep(s => s - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Progress bar */}
        <div className="h-1 bg-surface-border">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition z-10"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step counter */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? `w-6 ${dotMap[step.color]}`
                    : i < currentStep
                    ? `w-3 ${dotMap[step.color]} opacity-40`
                    : 'w-3 bg-surface-border'
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-foreground-muted">
              {currentStep + 1} / {STEPS.length}
            </span>
          </div>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-6 ${colorMap[step.color]}`}>
            {step.icon}
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-foreground-secondary leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Tip */}
          <div className={`rounded-xl border px-4 py-3 mb-8 ${colorMap[step.color]}`}>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">💡 Tip</p>
            <p className="text-sm">{step.tip}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-border text-sm text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 rounded-lg text-sm font-semibold"
            >
              {isLast ? (
                <><CheckCircle2 size={15} /> Start building!</>
              ) : (
                <>Next <ArrowRight size={14} /></>
              )}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-foreground-muted hover:text-foreground mt-3 transition"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
