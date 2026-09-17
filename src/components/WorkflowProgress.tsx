import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from '@/hooks/use-dossiers';
import { getWorkflowSteps, type WorkflowStep } from '@/lib/workflow';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  dossier: Dossier;
}

type StepState = 'todo' | 'in_progress' | 'done';

const MACRO_STEPS = [
  { label: 'Conseil', ids: [1, 2, 3, 4] },
  { label: 'Chasse', ids: [5] },
  { label: 'Visites', ids: [6] },
  { label: 'Signature', ids: [7, 8, 9] },
];

export default function WorkflowProgress({ dossier }: Props) {
  const steps = useMemo(() => getWorkflowSteps(dossier), [dossier]);
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [autoCompletion, setAutoCompletion] = useState<Record<number, boolean>>({});
  const [notified, setNotified] = useState<Record<number, boolean>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Detect auto-completion data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const completion: Record<number, boolean> = {};

      // Step 1 — Qualification
      completion[1] = !!(dossier.client_name && dossier.budget && (dossier.email || dossier.phone));

      // Step 2 — Contractualisation : signature électronique signée
      const { data: sigs } = await supabase
        .from('signatures_electroniques')
        .select('statut')
        .eq('dossier_id', dossier.id);
      completion[2] = (sigs || []).some(s => (s.statut || '').toLowerCase() === 'signe');

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

  const macroSteps = MACRO_STEPS.map(macro => {
    const groupSteps = steps.filter(step => macro.ids.includes(step.id));
    const relevantSteps = groupSteps.length ? groupSteps : steps.filter(step => step.id === 9 && macro.label === 'Signature');
    const completed = relevantSteps.filter(step => stepStates[step.id] === 'done');
    const active = relevantSteps.some(step => stepStates[step.id] === 'in_progress');
    const state: StepState = relevantSteps.length > 0 && completed.length === relevantSteps.length ? 'done' : active ? 'in_progress' : 'todo';
    const advanced = [...completed, ...relevantSteps.filter(step => stepStates[step.id] === 'in_progress')].at(-1) || relevantSteps[0];
    return { ...macro, state, sublabel: advanced?.label || 'Non applicable' };
  });

  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase text-hunters-or">Parcours client</p>
          <h2 className="mt-1 text-xl">Progression du dossier</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Étape {Math.max(1, steps.findIndex(s => stepStates[s.id] !== 'done') + 1 || steps.length)} / {steps.length}
        </span>
      </div>

      <div className="relative py-3">
        <div className="absolute left-[12.5%] right-[12.5%] top-7 h-px bg-border" />
        <div className="relative grid grid-cols-4">
          {macroSteps.map((macro, index) => (
            <div key={macro.label} className="flex min-w-0 flex-col items-center px-1 text-center">
              <span className={cn(
                'flex h-8 w-8 rotate-45 items-center justify-center border transition-colors',
                macro.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                macro.state === 'in_progress' && 'border-hunters-or bg-hunters-or text-primary-foreground',
                macro.state === 'todo' && 'border-border bg-card text-muted-foreground',
              )}>
                <span className="-rotate-45 text-[11px] font-semibold">{macro.state === 'done' ? <Check className="h-4 w-4" /> : index + 1}</span>
              </span>
              <span className="mt-3 text-xs font-semibold text-foreground sm:text-sm">{macro.label}</span>
              <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground sm:text-xs">{macro.sublabel}</span>
            </div>
          ))}
        </div>
      </div>

      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-3 border-t border-border pt-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="mx-auto flex text-xs">
            {detailsOpen ? 'Masquer le détail' : 'Voir le détail des étapes'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', detailsOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="relative mt-4">
            <div className="absolute left-4 right-4 top-4 h-px bg-border" />
            <div className="relative flex justify-between">
              {steps.map(s => {
                const state = stepStates[s.id];
                const isOpen = openStep === s.id;
                return (
                  <Button
                    key={s.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setOpenStep(isOpen ? null : s.id)}
                    className="group h-auto min-w-0 flex-1 flex-col gap-1.5 px-0 py-0 hover:bg-transparent"
                    title={s.label}
                  >
                    <span className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all',
                      state === 'done' && 'border-primary bg-primary text-primary-foreground',
                      state === 'in_progress' && 'border-hunters-or bg-hunters-or text-primary-foreground',
                      state === 'todo' && 'border-border bg-muted text-muted-foreground',
                      isOpen && 'ring-2 ring-primary/40 ring-offset-2',
                    )}>
                      {state === 'done' ? <Check className="h-4 w-4" /> : s.id}
                    </span>
                    <span className="hidden max-w-20 truncate text-[10px] text-muted-foreground sm:block">{s.short}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {openStep !== null && (() => {
        const step = steps.find(s => s.id === openStep);
        if (!step) return null;
        const state = stepStates[step.id];
        return (
          <div className="mt-5 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'px-2 py-0.5 text-[11px] font-bold uppercase',
                state === 'done' && 'bg-primary text-primary-foreground',
                state === 'in_progress' && 'bg-hunters-or text-primary-foreground',
                state === 'todo' && 'bg-muted text-muted-foreground',
              )}>
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
                        'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                        checked ? 'border-primary bg-primary' : 'border-border bg-background',
                      )}
                    >
                      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className={cn(checked && 'text-muted-foreground line-through')}>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
          })()}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
