import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useEvenements, Evenement } from '@/hooks/use-evenements';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import EvenementDialog from '@/components/EvenementDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CalendarRange, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameDay, isSameMonth, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// jsPDF chargé dynamiquement dans exportPDF pour alléger le bundle

const EVENT_TYPE_LABELS: Record<string, string> = {
  visite_bien: 'Visite bien',
  rdv_client: 'RDV client',
  visite_chantier: 'Chantier',
  rdv_notaire: 'Notaire',
  deco_livraison: 'Déco',
  interne: 'Interne',
  reseau: 'Réseau',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  visite_bien: 'bg-blue-500/20 text-blue-700 border-blue-300',
  rdv_client: 'bg-primary/20 text-primary border-primary/30',
  visite_chantier: 'bg-orange-500/20 text-orange-700 border-orange-300',
  rdv_notaire: 'bg-purple-500/20 text-purple-700 border-purple-300',
  deco_livraison: 'bg-pink-500/20 text-pink-700 border-pink-300',
  interne: 'bg-muted text-muted-foreground border-border',
  reseau: 'bg-accent/20 text-accent-foreground border-accent/40',
};

export default function Agenda() {
  const { data: evenements = [], isLoading } = useEvenements();
  const { data: mandataires = [] } = useMandataires();
  const { isAdmin, user } = useAuth();

  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterMandataire, setFilterMandataire] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filteredEvents = useMemo(() => {
    let evts = evenements;
    if (filterMandataire !== 'all') evts = evts.filter(e => e.mandataire_id === filterMandataire);
    if (filterType !== 'all') evts = evts.filter(e => e.type === filterType);
    return evts;
  }, [evenements, filterMandataire, filterType]);

  // Month view days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { monthDays.push(d); d = addDays(d, 1); }

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter(e => isSameDay(new Date(e.date_debut), day));

  const navigate = (dir: number) => {
    setCurrentDate(view === 'month' ? addMonths(currentDate, dir) : addWeeks(currentDate, dir));
  };

  const openNew = (date?: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date || null);
    setDialogOpen(true);
  };

  const openEvent = (evt: Evenement) => {
    // RGPD: mandataire can only open own events or reseau events
    if (!isAdmin && evt.mandataire_id !== user?.id && !evt.is_reseau) return;
    setSelectedEvent(evt);
    setSelectedDate(null);
    setDialogOpen(true);
  };

  // Admin: charge indicator
  const mandataireLoad = useMemo(() => {
    if (!isAdmin) return [];
    const weekEvts = evenements.filter(e => {
      const ed = new Date(e.date_debut);
      return ed >= weekStart && ed <= addDays(weekStart, 6);
    });
    return mandataires.map(m => ({
      name: m.full_name || 'Inconnu',
      count: weekEvts.filter(e => e.mandataire_id === m.id).length,
    })).sort((a, b) => b.count - a.count);
  }, [isAdmin, evenements, mandataires, weekStart]);

  // PDF export
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFillColor(26, 77, 46);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(245, 168, 0);
    doc.setFontSize(16);
    doc.text('HUNTERS — Agenda Réseau', 14, 16);
    doc.setTextColor(255);
    doc.setFontSize(10);
    const weekLabel = `Semaine du ${format(weekStart, 'dd MMM yyyy', { locale: fr })}`;
    doc.text(weekLabel, 140, 16);

    let y = 35;
    doc.setTextColor(0);
    weekDays.forEach(day => {
      const dayEvts = getEventsForDay(day);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(format(day, 'EEEE dd MMM', { locale: fr }), 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (dayEvts.length === 0) {
        doc.setTextColor(150);
        doc.text('  Aucun événement', 14, y);
        doc.setTextColor(0);
        y += 5;
      } else {
        dayEvts.forEach(evt => {
          const h = `${format(new Date(evt.date_debut), 'HH:mm')} - ${format(new Date(evt.date_fin), 'HH:mm')}`;
          doc.text(`  ${h}  ${evt.titre} (${evt.mandataire_name})`, 14, y);
          y += 5;
          if (y > 275) { doc.addPage(); y = 20; }
        });
      }
      y += 3;
    });

    doc.save(`agenda-hunters-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
  };

  const renderEventPill = (evt: Evenement, compact = false) => {
    const isMine = evt.mandataire_id === user?.id;
    const canSeeDetails = isAdmin || isMine || evt.is_reseau;
    const colors = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS.interne;

    return (
      <button
        key={evt.id}
        onClick={(e) => { e.stopPropagation(); if (canSeeDetails) openEvent(evt); }}
        className={cn(
          'w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate',
          colors,
          !canSeeDetails && 'opacity-50 cursor-default'
        )}
        title={canSeeDetails ? `${evt.titre} — ${format(new Date(evt.date_debut), 'HH:mm')}` : 'Créneau occupé'}
      >
        {canSeeDetails
          ? (compact ? format(new Date(evt.date_debut), 'HH:mm') + ' ' + evt.titre : evt.titre)
          : 'Occupé'}
      </button>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="text-lg font-bold min-w-[180px] text-center capitalize">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: fr })
                : `Semaine du ${format(weekStart, 'dd MMM', { locale: fr })}`}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="whitespace-nowrap">Aujourd'hui</Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setView('month')}>
              <CalendarDays className="w-4 h-4 mr-1" /> Mois
            </Button>
            <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>
              <CalendarRange className="w-4 h-4 mr-1" /> Semaine
            </Button>

            {isAdmin && (
              <>
                <Select value={filterMandataire} onValueChange={setFilterMandataire}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Mandataire" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les mandataires</SelectItem>
                    {mandataires.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {isAdmin && (
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
            )}

            <Button size="sm" onClick={() => openNew()}>
              <Plus className="w-4 h-4 mr-1" /> Événement
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : view === 'month' ? (
          /* MONTH VIEW */
          <div className="border border-border rounded overflow-hidden">
            <div className="grid grid-cols-7 bg-muted">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} className="text-center text-xs font-semibold py-2 text-muted-foreground uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const dayEvts = getEventsForDay(day);
                const inMonth = isSameMonth(day, currentDate);
                return (
                  <div
                    key={i}
                    onClick={() => openNew(day)}
                    className={cn(
                      'min-h-[90px] border-t border-r border-border p-1 cursor-pointer hover:bg-muted/50 transition-colors',
                      !inMonth && 'bg-muted/30 text-muted-foreground',
                      isToday(day) && 'ring-2 ring-inset ring-accent'
                    )}
                  >
                    <span className={cn('text-xs font-medium', isToday(day) && 'text-accent font-bold')}>{format(day, 'd')}</span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvts.slice(0, 3).map(evt => renderEventPill(evt, true))}
                      {dayEvts.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayEvts.length - 3} de plus</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* WEEK VIEW */
          <div className="border border-border rounded overflow-hidden">
            <div className="grid grid-cols-7 bg-muted">
              {weekDays.map(day => (
                <div key={day.toISOString()} className={cn(
                  'text-center py-2',
                  isToday(day) && 'bg-accent/20'
                )}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">{format(day, 'EEE', { locale: fr })}</div>
                  <div className={cn('text-lg font-bold', isToday(day) && 'text-accent')}>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map(day => {
                const dayEvts = getEventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => openNew(day)}
                    className="border-r border-border p-1 cursor-pointer hover:bg-muted/30"
                  >
                    {dayEvts.map(evt => (
                      <div key={evt.id} className="mb-1">
                        {renderEventPill(evt)}
                        <span className="text-[9px] text-muted-foreground block pl-1">
                          {format(new Date(evt.date_debut), 'HH:mm')} - {format(new Date(evt.date_fin), 'HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin: charge mandataires */}
        {isAdmin && mandataireLoad.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-2 uppercase tracking-wide">Charge cette semaine</h3>
            <div className="flex flex-wrap gap-3">
              {mandataireLoad.map(m => (
                <Badge key={m.name} variant={m.count > 5 ? 'destructive' : 'secondary'} className="text-sm py-1 px-3">
                  {m.name}: {m.count} RDV
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      <EvenementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        evenement={selectedEvent}
        selectedDate={selectedDate}
      />
    </AppLayout>
  );
}
