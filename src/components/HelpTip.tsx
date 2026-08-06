import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface HelpTipProps {
  /** Titre court de l'explication */
  title: string;
  /** Phrase d'introduction en français simple */
  intro?: string;
  /** Liste de précisions : « À quoi ça sert », « Que faire », etc. */
  points?: { label?: string; text: string }[];
  /** Note finale (rappel, bonne pratique) */
  note?: string;
  className?: string;
  /** Libellé accessible du bouton */
  ariaLabel?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Petite icône « ? » ouvrant une explication concrète, pensée pour un
 * utilisateur qui découvre le métier. Volontairement sans jargon.
 */
export default function HelpTip({
  title,
  intro,
  points,
  note,
  className,
  ariaLabel,
  side = 'bottom',
}: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel || `Aide : ${title}`}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground/70',
            'hover:text-accent hover:bg-accent/10 transition-colors h-5 w-5 shrink-0',
            className,
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-[320px] text-left">
        <p className="font-heading font-semibold text-sm text-foreground">{title}</p>
        {intro && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{intro}</p>
        )}
        {points && points.length > 0 && (
          <ul className="mt-2.5 space-y-1.5">
            {points.map((p, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed">
                {p.label && <span className="font-semibold">{p.label} : </span>}
                <span className="text-muted-foreground">{p.text}</span>
              </li>
            ))}
          </ul>
        )}
        {note && (
          <p className="text-[11px] text-muted-foreground italic mt-2.5 pt-2 border-t">
            {note}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
