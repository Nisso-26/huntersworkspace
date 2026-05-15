import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from '@/hooks/use-dossiers';
import { getWorkflowSteps, type WorkflowStep, getServices } from '@/lib/workflow';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  dossier: Dossier;
}

type StepState = 'todo' | 'in_progress' | 'done';

interface ChecklistState {
  // map of stepId -> array of bool (checklist items completion)
  [stepId: number]: boolean[];
}

const HUNTERS_GREEN = '#1A4D2E';
const HUNTERS_GOLD = '#F5A800';

export default function WorkflowProgress({ dossier }: Props) {
  const steps = useMemo(() => getWorkflowSteps(dossier), [dossier]);
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [autoCompletion, setAutoCompletion] = useState<Record<number, boolean>>({});
  const [notified, setNotified] = useState<Record<number, boolean>>({});

  // Detect auto-completion data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const completion: Record<number, boolean> = {};

      // Step 1 — Qualification
      completion[1] = !!(dossier.client_name && dossier.budget && (dossier.email || dossier.phone));

      // Step 2 — Contractualisation : signature signée
      const { data: sigs } = await supabase
        .from('signature_requests')
        .select('status')
        .eq('dossier_id', dossier.id);
      completion[2] = (sigs || []).some(s => ['signe', 'signed', 'completed', 'done'].includes((s.status || '').toLowerCase()));

      // Step 3 — Stratégie patrimoniale + rapport conseil exporté
      const hasStrategie = !!dossier.strategie && (typeof dossier.strategie === 'string' ? dossier.strategie.trim().length > 0 : Object.keys(dossier.strategie || {}).length > 0);
      const { data: rapports } = await supabase
        .from('documents_generes' as any)
        .select('id')
        .eq('dossier_id', dossier.id)
        .eq('type', 'rapport_conseil')
        .limit(1);
      completion[3] = hasStrategie && (rapports || []).length > 0;

      // Step 4 — portail client consulté
      const { data: tokens } = await supabase
        .from('client_tokens')
        .select('last_viewed_at')
        .eq('dossier_id', dossier.id);
      completion[4] = (tokens || []).some((t: any) => !!t.last_viewed_at);

      // Steps 5/6/7/8/9 — based on dossier status
      const status = dossier.status;
      completion[5] = ['visite', 'offre', 'compromis', 'signe', 'cloture'].includes(status);
      completion[6] = ['compromis', 'signe', 'cloture'].includes(status);
      completion[7] = ['signe', 'cloture'].includes(status);
      completion[8] = ['signe', 'cloture'].includes(status);
      completion[9] = ['cloture'].includes(status);

      if (!cancelled) setAutoCompletion(completion);
    })();
    return () => { cancelled = true; };
  }, [dossier.id, dossier.status, dossier.strategie, dossier.client_name, dossier.budget, dossier.email, dossier.phone]);

  // Compute step states + current step
  const stepStates: Record<number, StepState> = {};
  let firstIncomplete: WorkflowStep | null = null;
  steps.forEach(s => {
    if (autoCompletion[s.id]) {
      stepStates[s.id] = 'done';
    } else if (!firstIncomplete) {
      stepStates[s.id] = 'in_progress';
      firstIncomplete = s;
    } else {
      stepStates[s.id] = 'todo';
    }
  });

  // Notification when a step transitions to done
  useEffect(() => {
    Object.entries(autoCompletion).forEach(([id, done]) => {
      const sid = Number(id);
      if (done && !notified[sid]) {
        const step = steps.find(s => s.id === sid);
        const next = steps.find(s => stepStates[s.id] === 'in_progress');
        if (step) {
          const nextLabel = next ? ` — Prochaine étape : ${next.label}` : '';
          toast.success(`Étape « ${step.label} » complétée ✅${nextLabel}`);
          setNotified(prev => ({ ...prev, [sid]: true }));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCompletion]);

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground text-sm">Progression du dossier</h3>
        <span className="text-xs text-muted-foreground">
          Étape {Math.max(1, steps.findIndex(s => stepStates[s.id] !== 'done') + 1 || steps.length)} / {steps.length}
        </span>
      </div>

      {/* Bar */}
      <div className="relative">
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
        <div className="relative flex justify-between">
          {steps.map(s => {
            const state = stepStates[s.id];
            const color = state === 'done' ? HUNTERS_GREEN : state === 'in_progress' ? HUNTERS_GOLD : '#9CA3AF';
            const bg = state === 'todo' ? '#F3F4F6' : color;
            const isOpen = openStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenStep(isOpen ? null : s.id)}
                className="flex flex-col items-center gap-1.5 group focus:outline-none flex-1 min-w-0"
                title={s.label}
              >
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all',
                    isOpen && 'ring-2 ring-offset-2 ring-primary/40',
                  )}
                  style={{
                    backgroundColor: bg,
                    borderColor: color,
                    color: state === 'todo' ? '#6B7280' : '#fff',
                  }}
                >
                  {state === 'done' ? <Check className="w-4 h-4" /> : s.id}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[80px]">{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist for opened step */}
      {openStep !== null && (() => {
        const step = steps.find(s => s.id === openStep);
        if (!step) return null;
        const state = stepStates[step.id];
        return (
          <div className="mt-5 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  backgroundColor: state === 'done' ? HUNTERS_GREEN : state === 'in_progress' ? HUNTERS_GOLD : '#E5E7EB',
                  color: state === 'todo' ? '#374151' : '#fff',
                }}
              >
                {state === 'done' ? 'Complété' : state === 'in_progress' ? 'En cours' : 'À faire'}
              </span>
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
            </div>
            <ul className="space-y-1.5">
              {step.checklist.map((item, idx) => {
                // Sub-items are indicative — auto-mark all if step is done
                const checked = state === 'done';
                return (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <span
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        checked ? 'border-transparent' : 'border-border bg-background',
                      )}
                      style={checked ? { backgroundColor: HUNTERS_GREEN } : undefined}
                    >
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className={cn(checked && 'text-muted-foreground line-through')}>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}
