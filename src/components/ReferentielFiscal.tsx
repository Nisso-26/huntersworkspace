import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, CheckCircle, AlertTriangle, User, Calculator, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COMPARATIF,
  ARBRE,
  FICHES,
  type FicheDispositif,
  type LigneComparatif,
  type QuestionArbre,
  type SectionFiche,
  type TypeSection,
} from '@/data/referentiel-fiscal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sectionConfig: Record<
  TypeSection,
  {
    container: string;
    textColor?: string;
    italic?: boolean;
    Icon?: React.ComponentType<{ className?: string }>;
    iconColor?: string;
  }
> = {
  info: { container: 'bg-white border-l-4 border-gray-200' },
  avantage: {
    container: 'bg-[#E8F0EB] border-l-4 border-[#1A4D2E]',
    Icon: CheckCircle,
    iconColor: 'text-[#1A4D2E]',
  },
  danger: {
    container: 'bg-[#FDECEA] border-l-4 border-red-400',
    Icon: AlertTriangle,
    iconColor: 'text-red-500',
  },
  profil: {
    container: 'bg-[#FEF6E4] border-l-4 border-[#F5A800]',
    Icon: User,
    iconColor: 'text-[#F5A800]',
  },
  exemple: {
    container: 'bg-gray-50 border border-gray-200 rounded',
    Icon: Calculator,
    iconColor: 'text-gray-600',
  },
  formule: {
    container: 'bg-[#1A4D2E] rounded',
    textColor: 'text-white',
    italic: true,
  },
};

const badgeColorClass: Record<string, string> = {
  green: 'bg-green-100 text-green-800 hover:bg-green-100',
  blue: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  orange: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  red: 'bg-red-100 text-red-800 hover:bg-red-100',
  gray: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
};

function matches(text: string, q: string) {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

function ficheMatchCount(fiche: FicheDispositif, q: string) {
  if (!q) return 0;
  return fiche.sections.filter(
    (s) => matches(s.titre, q) || matches(s.contenu, q),
  ).length;
}

function comparatifMatchCount(rows: LigneComparatif[], q: string) {
  if (!q) return 0;
  return rows.filter((r) =>
    [r.critere, r.lmnp, r.sci_ir, r.sci_is, r.nu_propriete, r.deficit_foncier].some((c) =>
      matches(c, q),
    ),
  ).length;
}

function arbreMatchCount(arbre: QuestionArbre[], q: string) {
  if (!q) return 0;
  return arbre.filter(
    (n) =>
      matches(n.question, q) ||
      n.reponses.some((r) => matches(r.label, q) || matches(r.orientation, q)),
  ).length;
}

function SectionBlock({ section }: { section: SectionFiche }) {
  const cfg = sectionConfig[section.type];
  const Icon = cfg.Icon;
  return (
    <div className={cn('p-3 mb-2', cfg.container)}>
      <div className="flex items-start gap-2">
        {Icon && <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', cfg.iconColor)} />}
        <div className="flex-1">
          <p
            className={cn(
              'font-semibold text-sm mb-1',
              cfg.textColor,
              cfg.italic && 'italic',
            )}
          >
            {section.titre}
          </p>
          <p
            className={cn(
              'text-sm leading-relaxed',
              cfg.textColor ?? 'text-gray-700',
              cfg.italic && 'italic',
            )}
          >
            {section.contenu}
          </p>
        </div>
      </div>
    </div>
  );
}

function FicheView({ fiche, search }: { fiche: FicheDispositif; search: string }) {
  const filtered = search
    ? fiche.sections.filter(
        (s) => matches(s.titre, search) || matches(s.contenu, search),
      )
    : fiche.sections;

  return (
    <div>
      <h3 className="text-base font-bold text-[#1A4D2E] mb-3">{fiche.nom}</h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun résultat dans cette fiche.</p>
      ) : (
        filtered.map((s, i) => <SectionBlock key={i} section={s} />)
      )}
    </div>
  );
}

function ComparatifView({ search }: { search: string }) {
  const rows = search
    ? COMPARATIF.filter((r) =>
        [r.critere, r.lmnp, r.sci_ir, r.sci_is, r.nu_propriete, r.deficit_foncier].some((c) =>
          matches(c, search),
        ),
      )
    : COMPARATIF;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#1A4D2E] text-white">
            {['Critère', 'LMNP', 'SCI IR', 'SCI IS', 'Nu-propriété', 'Déficit foncier'].map((h) => (
              <th key={h} className="text-left p-2 font-semibold border border-[#1A4D2E]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={r.critere}
              className={cn(
                r.highlight ? 'bg-[#FEF6E4]' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]',
              )}
            >
              <td className="p-2 font-bold bg-[#F5F5F5] border border-gray-200">{r.critere}</td>
              <td className="p-2 border border-gray-200">{r.lmnp}</td>
              <td className="p-2 border border-gray-200">{r.sci_ir}</td>
              <td className="p-2 border border-gray-200">{r.sci_is}</td>
              <td className="p-2 border border-gray-200">{r.nu_propriete}</td>
              <td className="p-2 border border-gray-200">{r.deficit_foncier}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-muted-foreground italic">
                Aucun résultat.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ArbreView({ search }: { search: string }) {
  const nodes = search
    ? ARBRE.filter(
        (n) =>
          matches(n.question, search) ||
          n.reponses.some((r) => matches(r.label, search) || matches(r.orientation, search)),
      )
    : ARBRE;

  return (
    <div className="space-y-3">
      {nodes.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Aucun résultat dans l'arbre.</p>
      )}
      {nodes.map((n) => (
        <div key={n.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-start gap-2 mb-3">
            <Badge className="bg-[#1A4D2E] hover:bg-[#1A4D2E] text-white shrink-0">{n.id}</Badge>
            <p className="text-sm font-bold text-gray-800">{n.question}</p>
          </div>
          <div className="space-y-2 pl-2">
            {n.reponses.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge className={cn('shrink-0', badgeColorClass[r.color])}>{r.label}</Badge>
                {r.final ? (
                  <span className="text-sm text-gray-700">{r.orientation}</span>
                ) : (
                  <span className="text-sm italic text-gray-500">{r.orientation}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReferentielFiscal({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('comparatif');

  const counts = useMemo(() => {
    if (!search) return null;
    return {
      comparatif: comparatifMatchCount(COMPARATIF, search),
      arbre: arbreMatchCount(ARBRE, search),
      ...Object.fromEntries(FICHES.map((f) => [f.id, ficheMatchCount(f, search)])),
    } as Record<string, number>;
  }, [search]);

  const CountBadge = ({ id }: { id: string }) => {
    if (!counts || !counts[id]) return null;
    return (
      <Badge className="ml-1 bg-[#F5A800] hover:bg-[#F5A800] text-white text-[10px] h-4 px-1.5">
        {counts[id]}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[720px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-[#1A4D2E]">
            <BookOpen className="h-5 w-5" />
            Référentiel fiscal
          </SheetTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans le référentiel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 shrink-0 overflow-x-auto">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="comparatif" className="text-xs">
                Comparatif<CountBadge id="comparatif" />
              </TabsTrigger>
              <TabsTrigger value="arbre" className="text-xs">
                Arbre<CountBadge id="arbre" />
              </TabsTrigger>
              {FICHES.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="text-xs">
                  {f.nom.split(' — ')[0]}
                  <CountBadge id={f.id} />
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="comparatif" className="mt-0">
              <ComparatifView search={search} />
            </TabsContent>
            <TabsContent value="arbre" className="mt-0">
              <ArbreView search={search} />
            </TabsContent>
            {FICHES.map((f) => (
              <TabsContent key={f.id} value={f.id} className="mt-0">
                <FicheView fiche={f} search={search} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
