/**
 * FirstLaunchWizard — shown on first load when no projects exist.
 * Guides user through: welcome → pick a template or blank → name project → done
 *
 * Usage: wrap in App.jsx, show when projectList.length === 0
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplates, useApplyTemplate, useCreateProject } from '../api/hooks';
import { LayoutTemplate, FileText, GitBranch, Zap, ArrowRight, Check, Loader } from 'lucide-react';

const STEPS = ['welcome', 'pick', 'name', 'done'];

function StepDot({ active, done }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: 4,
      background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)',
      opacity: done || active ? 1 : 0.4,
      transition: 'background 0.2s',
    }} />
  );
}

export default function FirstLaunchWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState(null); // null | 'blank' | template object
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [result, setResult] = useState(null);

  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const applyMutation = useApplyTemplate();
  const createMutation = useCreateProject();

  const stepName = STEPS[step];

  async function handleCreate() {
    try {
      let res;
      if (choice === 'blank' || !choice) {
        res = await createMutation.mutateAsync({ name: projectName || 'My Project', description: projectDesc });
        setResult({ project_name: res.name || projectName, requirements_created: 0, blueprint_created: false });
      } else {
        res = await applyMutation.mutateAsync({
          templateId: choice.id,
          project_name: projectName || choice.name,
          project_description: projectDesc || choice.description,
        });
        setResult(res);
      }
      setStep(3);
    } catch (err) {
      console.error(err);
    }
  }

  const isPending = applyMutation.isPending || createMutation?.isPending;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          width: '100%', maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>1024 Studio</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, i) => (
              <StepDot key={i} active={i === step} done={i < step} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AnimatePresence mode="wait">
            {stepName === 'welcome' && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>Welcome to 1024 Studio</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                  An AI-native SDLC platform that runs entirely on your machine.
                  Write requirements, generate blueprints, track work — all powered by a local LLM.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { icon: FileText, label: 'EARS Requirements', desc: 'Structured requirement format with acceptance criteria' },
                    { icon: GitBranch, label: 'Blueprint DSL', desc: 'Architecture decisions, components, constraints' },
                    { icon: LayoutTemplate, label: 'Project Templates', desc: 'Kick-start from pre-built templates' },
                    { icon: Zap, label: 'Local AI', desc: 'Ollama or cloud provider — your choice' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} style={{ padding: 14, background: 'var(--color-bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <Icon size={16} color="var(--accent)" strokeWidth={1.8} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {stepName === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Start your first project</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>Pick a template or start blank.</p>

                <button
                  onClick={() => setChoice('blank')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', marginBottom: 10,
                    background: choice === 'blank' ? 'var(--accent-bg)' : 'var(--color-bg-secondary)',
                    border: `1.5px solid ${choice === 'blank' ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={15} color="var(--text-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Blank Project</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Start from scratch</div>
                  </div>
                  {choice === 'blank' && <Check size={15} color="var(--accent)" strokeWidth={2.5} style={{ marginLeft: 'auto' }} />}
                </button>

                {templatesLoading ? (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '10px 0' }}>Loading templates…</div>
                ) : templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setChoice(t); setProjectName(t.name); setProjectDesc(t.description); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', marginBottom: 10,
                      background: choice?.id === t.id ? 'var(--accent-bg)' : 'var(--color-bg-secondary)',
                      border: `1.5px solid ${choice?.id === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LayoutTemplate size={15} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t.req_count} requirements{t.has_blueprint ? ' + blueprint' : ''}</div>
                    </div>
                    {choice?.id === t.id && <Check size={15} color="var(--accent)" strokeWidth={2.5} />}
                  </button>
                ))}
              </motion.div>
            )}

            {stepName === 'name' && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Name your project</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  {choice === 'blank' ? 'Give your blank project a name.' : `Customize the name for your ${choice?.name} project.`}
                </p>
                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Project Name</span>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    autoFocus
                    placeholder="e.g. My SaaS App"
                    style={{ width: '100%', padding: '10px 13px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></span>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    rows={3}
                    placeholder="What does this project do?"
                    style={{ width: '100%', padding: '10px 13px', background: 'var(--color-bg-secondary)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </label>
                {(applyMutation.isError || createMutation?.isError) && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>Something went wrong. Please try again.</div>
                )}
              </motion.div>
            )}

            {stepName === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }} style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <Check size={30} color="#059669" strokeWidth={2.5} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>You're all set!</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <strong>{result.project_name}</strong> is ready.
                </p>
                {result.requirements_created > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    {result.requirements_created} requirements{result.blueprint_created ? ' and a blueprint' : ''} were created from the template.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || step === 3}
            style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: step === 0 || step === 3 ? 'default' : 'pointer', opacity: step === 0 || step === 3 ? 0.3 : 1, fontFamily: 'inherit' }}
          >
            Back
          </button>

          {stepName === 'done' ? (
            <button
              onClick={onComplete}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Open Studio <ArrowRight size={14} />
            </button>
          ) : stepName === 'name' ? (
            <button
              onClick={handleCreate}
              disabled={isPending || !projectName.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isPending || !projectName.trim() ? 'not-allowed' : 'pointer', opacity: isPending || !projectName.trim() ? 0.6 : 1, fontFamily: 'inherit' }}
            >
              {isPending ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating…</> : <>Create Project <ArrowRight size={14} /></>}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={stepName === 'pick' && !choice}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: stepName === 'pick' && !choice ? 'not-allowed' : 'pointer', opacity: stepName === 'pick' && !choice ? 0.5 : 1, fontFamily: 'inherit' }}
            >
              {stepName === 'welcome' ? 'Get Started' : 'Next'} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
