import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, Check, User, Target, TrendingUp, Cpu } from 'lucide-react';
import Modal from './Modal';
import { useGenerateProductOverview } from '../api/hooks';

const STEPS = [
  {
    id: 'problem',
    icon: Target,
    title: 'Business Problem',
    subtitle: 'What problem are you solving?',
    fields: [
      { key: 'business_problem', label: 'Describe the core problem', placeholder: 'Users struggle to track their project requirements because they are scattered across spreadsheets, email threads, and sticky notes...', multiline: true, rows: 4 },
      { key: 'current_state', label: 'How do users solve this today?', placeholder: 'Currently they use a mix of Jira, Confluence, and Word documents, leading to inconsistencies and outdated documentation...', multiline: true, rows: 3 },
    ],
  },
  {
    id: 'users',
    icon: User,
    title: 'Target Users',
    subtitle: 'Who will use this product?',
    fields: [
      { key: 'primary_persona', label: 'Primary user persona', placeholder: 'Solo developer / startup CTO who builds software and needs to track requirements' },
      { key: 'secondary_persona', label: 'Secondary user persona (optional)', placeholder: 'Product manager at a 10-person startup' },
      { key: 'user_goals', label: 'What are their key goals?', placeholder: 'Ship software faster, reduce rework, have a single source of truth for requirements', multiline: true, rows: 2 },
    ],
  },
  {
    id: 'product',
    icon: Sparkles,
    title: 'Product Vision',
    subtitle: 'What does your product do?',
    fields: [
      { key: 'product_description', label: 'Describe your product', placeholder: 'An AI-native SDLC platform that converts project descriptions into requirements, blueprints, and work orders — all running locally with no cloud dependency.', multiline: true, rows: 4 },
      { key: 'key_differentiators', label: 'What makes it unique?', placeholder: 'Runs 100% locally, uses AI to auto-generate and keep documents in sync, zero-config setup', multiline: true, rows: 2 },
    ],
  },
  {
    id: 'success',
    icon: TrendingUp,
    title: 'Success Metrics',
    subtitle: 'How will you measure success?',
    fields: [
      { key: 'success_metrics', label: 'Key success metrics (one per line)', placeholder: 'Time from idea to first requirement < 5 minutes\nDocument drift detected within 24 hours of code change\n80% of acceptance criteria follow EARS format', multiline: true, rows: 4 },
      { key: 'technical_requirements', label: 'Technical constraints', placeholder: 'Must run offline\nSQLite only, no external DB\nSupport Ollama + OpenAI providers', multiline: true, rows: 3 },
    ],
  },
];

export default function ProductInterviewModal({ projectId, isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const generateOverview = useGenerateProductOverview();

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  const setAnswer = (key, value) => setAnswers((a) => ({ ...a, [key]: value }));

  const handleFinish = async () => {
    await generateOverview.mutateAsync({ projectId, interview_answers: answers });
    onClose();
    setStep(0);
    setAnswers({});
  };

  const StepIcon = currentStep.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Context Interview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? 'var(--status-success)' : i === step ? 'var(--accent)' : 'var(--color-bg-secondary)',
                    border: `1px solid ${i < step ? 'var(--status-success)' : i === step ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}>
                    {i < step
                      ? <Check size={12} strokeWidth={2.5} style={{ color: '#fff' }} />
                      : <Icon size={12} strokeWidth={1.5} style={{ color: i === step ? '#fff' : 'var(--text-tertiary)' }} />
                    }
                  </div>
                  <span style={{ fontSize: 10, color: i === step ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: i === step ? 600 : 400, textAlign: 'center' }}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${((step) / (STEPS.length - 1)) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {currentStep.title}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{currentStep.subtitle}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {currentStep.fields.map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={answers[field.key] || ''}
                      onChange={(e) => setAnswer(field.key, e.target.value)}
                      rows={field.rows || 3}
                      placeholder={field.placeholder}
                      className="input-base"
                      style={{ resize: 'none' }}
                    />
                  ) : (
                    <input
                      value={answers[field.key] || ''}
                      onChange={(e) => setAnswer(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input-base"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirstStep}
            className="btn-ghost"
            style={{ opacity: isFirstStep ? 0 : 1, pointerEvents: isFirstStep ? 'none' : 'auto' }}
          >
            <ChevronLeft size={14} strokeWidth={1.5} /> Back
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{step + 1} of {STEPS.length}</span>
          {isLastStep ? (
            <button
              onClick={handleFinish}
              disabled={generateOverview.isPending}
              className="btn-ai"
            >
              <Sparkles size={13} strokeWidth={1.5} />
              {generateOverview.isPending ? 'Generating...' : 'Generate Overview'}
            </button>
          ) : (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary">
              Next <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
