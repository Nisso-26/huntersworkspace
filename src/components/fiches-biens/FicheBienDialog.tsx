import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link2, FileText, PenLine, Loader2, RefreshCw, Plus, Trash2, Lock } from 'lucide-react';
import FichePhotosManager from './FichePhotosManager';
import {
  extraireAnnonce, typeProjetDepuisDossier, useCreateFicheBien, useUpdateFicheBien,
  TYPE_PROJET_LABELS, STATUT_FICHE_LABELS, type FicheBien, type TypeProjet, type StatutFiche, type Travail,
} from '@/hooks/use-fiches-biens';

const NUM = ['prix_affiche', 'surface_habitable', 'surface_terrain', 'dpe_kwh', 'cout_energie_min', 'cout_energie_max',
  'charges_copro_annuelles', 'taxe_fonciere', 'prix_revente_vise'] as const;
const INT = ['nb_pieces', 'nb_chambres', 'niveaux', 'annee_construction', 'duree_detention_mois'] as const;
const TXT = ['titre', 'ville', 'code_postal', 'quartier', 'etage', 'exposition', 'chauffage', 'exterieur', 'stationnement',
  'annexes', 'sanitaires', 'dpe_classe', 'ges_classe', 'lecture_bien', 'phrase_cle', 'projet_texte'] as const;
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

type Form = Record<string, any>;

function toForm(f: Partial<FicheBien>): Form {
  const o: Form = {};
  for (const k of [...NUM, ...INT]) o[k] = (f as any)[k] != null ? String((f as any)[k]) : '';
  for (const k of TXT) o[k] = (f as any)[k] ?? '';
  o.ascenseur = f.ascenseur ?? null;
  o.points_forts = f.points_forts ?? [];
  o.points_vigilance = f.points_vigilance ?? [];
  o.travaux = f.travaux ?? [];
  o.type_projet = f.type_projet ?? 'residence_principale';
  o.statut = f.statut ?? 'brouillon';
  o.interet_constate = !!f.interet_constate;
  o.description_source = f.description_source ?? '';
  return o;
}

function fromForm(o: Form): Partial<FicheBien> {
  const n = (v: any) => { const s = String(v ?? '').replace(/\s/g, '').replace(',', '.'); return s === '' || isNaN(Number(s)) ? null : Number(s); };
  const out: any = {};
  for (const k of NUM) out[k] = n(o[k]);
  for (const k of INT) { const v = n(o[k]); out[k] = v == null ? null : Math.round(v); }
  for (const k of TXT) out[k] = String(o[k] ?? '').trim() || null;
  out.ascenseur = o.ascenseur;
  out.points_forts = (o.points_forts as string[]).map(s => s.trim()).filter(Boolean).slice(0, 4);
  out.points_vigilance = (o.points_vigilance as string[]).map(s => s.trim()).filter(Boolean).slice(0, 4);
  out.travaux = (o.travaux as Travail[]).filter(t => t.libelle?.trim()).map(t => ({ libelle: t.libelle.trim(), montant_min: n(t.montant_min), montant_max: n(t.montant_max) }));
  out.type_projet = o.type_projet;
  out.statut = o.statut;
  out.interet_constate = !!o.interet_constate;
  return out;
}

/** Ne garde que les valeurs extraites non vides (aucune valeur inventée). */
function mergeExtraction(form: Form, ext: Partial<FicheBien>): Form {
  const next = { ...form };
  for (const [k, v] of Object.entries(ext)) {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (k in next || k === 'ascenseur') next[k] = Array.isArray(v) ? v : typeof v === 'boolean' ? v : String(v);
  }
  return next;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dossier: any;
  fiche: FicheBien | null;
}

export default function FicheBienDialog({ open, onOpenChange, dossier, fiche }: Props) {
  const create = useCreateFicheBien();
  const update = useUpdateFicheBien();
  const [current, setCurrent] = useState<FicheBien | null>(fiche);
  const [mode, setMode] = useState<'url' | 'texte' | 'manuel'>('url');
  const [url, setUrl] = useState('');
  const [texte, setTexte] = useState('');
  const [bloque, setBloque] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regen, setRegen] = useState(false);
  const [form, setForm] = useState<Form>(toForm({ type_projet: typeProjetDepuisDossier(dossier) }));

  useEffect(() => {
    if (!open) return;
    setCurrent(fiche);
    setForm(toForm(fiche ?? { type_projet: typeProjetDepuisDossier(dossier) }));
    setMode('url'); setUrl(''); setTexte(''); setBloque(false);
  }, [open, fiche?.id]);

  const set = (k: string) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const demarrer = async () => {
    if (mode === 'url' && !/^https?:\/\//i.test(url.trim())) { toast.error('Lien invalide'); return; }
    if (mode === 'texte' && texte.trim().length < 50) { toast.error("Collez le texte complet de l'annonce"); return; }
    setLoading(true);
    try {
      let f = current;
      if (!f) {
        f = await create.mutateAsync({
          dossier_id: dossier.id,
          mandataire_id: dossier.mandataire_id,
          type_projet: form.type_projet,
          source_url: url.trim() || null,
        });
        setCurrent(f);
      }
      if (mode === 'manuel') return;
      const res = await extraireAnnonce(mode === 'url' ? { url: url.trim(), fiche_id: f.id } : { texte: texte.trim(), fiche_id: f.id });
      if (res.erreur === 'lecture_impossible') {
        setBloque(true); setMode('texte');
        toast.warning("L'annonce n'a pas pu être lue. Collez son texte ci-dessous.");
        return;
      }
      if (!res.ok || !res.fiche) throw new Error(res.erreur || 'Extraction impossible');
      const merged = mergeExtraction({ ...form, description_source: res.description_source ?? '' }, res.fiche);
      setForm(merged);
      const saved = await update.mutateAsync({ id: f.id, ...fromForm(merged), description_source: res.description_source ?? null });
      setCurrent(saved);
      toast.success(`Fiche pré-remplie${res.photos_importees ? ` — ${res.photos_importees} photo(s) importée(s)` : ''}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerer = async () => {
    const src = form.description_source || current?.description_source;
    if (!src) { toast.error('Aucun texte source disponible'); return; }
    setRegen(true);
    try {
      const res = await extraireAnnonce({ texte: src });
      if (!res.ok || !res.fiche) throw new Error(res.erreur || 'Régénération impossible');
      setForm(f => ({
        ...f,
        lecture_bien: res.fiche!.lecture_bien || f.lecture_bien,
        phrase_cle: res.fiche!.phrase_cle || f.phrase_cle,
        points_forts: res.fiche!.points_forts?.length ? res.fiche!.points_forts : f.points_forts,
        points_vigilance: res.fiche!.points_vigilance?.length ? res.fiche!.points_vigilance : f.points_vigilance,
      }));
      toast.success('Texte régénéré');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegen(false);
    }
  };

  const enregistrer = async () => {
    if (!current) return;
    const saved = await update.mutateAsync({ id: current.id, ...fromForm(form) });
    setCurrent(saved);
    toast.success('Fiche enregistrée');
  };

  const step1 = !current || (loading && !current.description_source);

  const F = ({ k, label, type = 'text', span }: { k: string; label: string; type?: string; span?: boolean }) => (
    <div className={`space-y-1 ${span ? 'sm:col-span-2' : ''}`}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={form[k] ?? ''} onChange={e => set(k)(e.target.value)} className="h-9" />
    </div>
  );
  const ClasseSel = ({ k, label }: { k: string; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={form[k] || '__none__'} onValueChange={v => set(k)(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Non renseigné</SelectItem>
          {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
  const ListEdit = ({ k, label }: { k: 'points_forts' | 'points_vigilance'; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label} (4 max)</Label>
      {(form[k] as string[]).map((s, i) => (
        <div key={i} className="flex gap-1">
          <Input value={s} className="h-9" onChange={e => set(k)((form[k] as string[]).map((x, j) => j === i ? e.target.value : x))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => set(k)((form[k] as string[]).filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {(form[k] as string[]).length < 4 && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set(k)([...(form[k] as string[]), ''])}><Plus className="h-3 w-3" />Ajouter</Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current ? (form.titre || 'Fiche de présentation du bien') : 'Nouvelle fiche de présentation'}</DialogTitle>
        </DialogHeader>

        {step1 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Type de projet</Label>
              <Select value={form.type_projet} onValueChange={set('type_projet')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TYPE_PROJET_LABELS) as TypeProjet[]).map(t => <SelectItem key={t} value={t}>{TYPE_PROJET_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([['url', Link2, "Lien de l'annonce"], ['texte', FileText, "Texte de l'annonce"], ['manuel', PenLine, 'Saisie manuelle']] as const).map(([m, Icon, l]) => (
                <Button key={m} type="button" variant={mode === m ? 'default' : 'outline'} className="gap-2" onClick={() => setMode(m)}><Icon className="h-4 w-4" />{l}</Button>
              ))}
            </div>
            {(mode === 'url' || bloque) && (
              <div className="space-y-1">
                <Label>Lien de l'annonce</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" disabled={bloque} />
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Interne — jamais transmis au client</p>
              </div>
            )}
            {mode === 'texte' && (
              <div className="space-y-1">
                <Label>{bloque ? "La page n'a pas pu être lue : collez ici le texte de l'annonce" : "Texte de l'annonce"}</Label>
                <Textarea rows={10} value={texte} onChange={e => setTexte(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={demarrer} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'manuel' ? 'Créer la fiche' : loading ? 'Analyse en cours…' : 'Pré-remplir la fiche'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Type de projet</Label>
                <Select value={form.type_projet} onValueChange={set('type_projet')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(TYPE_PROJET_LABELS) as TypeProjet[]).map(t => <SelectItem key={t} value={t}>{TYPE_PROJET_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Statut</Label>
                <Select value={form.statut} onValueChange={set('statut')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(STATUT_FICHE_LABELS) as StatutFiche[]).map(t => <SelectItem key={t} value={t}>{STATUT_FICHE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {current?.source_url && (
              <div className="border border-dashed border-border bg-muted/40 p-2 text-xs">
                <p className="flex items-center gap-1 font-medium"><Lock className="h-3 w-3" />Interne — jamais transmis au client</p>
                <a href={current.source_url} target="_blank" rel="noreferrer" className="break-all text-primary underline">{current.source_url}</a>
              </div>
            )}

            <Accordion type="multiple" defaultValue={['bien']} className="border">
              <AccordionItem value="bien" className="px-3">
                <AccordionTrigger>Le bien</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <F k="titre" label="Titre" span />
                    <F k="ville" label="Ville" /><F k="code_postal" label="Code postal" />
                    <F k="quartier" label="Quartier" /><F k="prix_affiche" label="Prix affiché (€)" type="number" />
                    <F k="surface_habitable" label="Surface habitable (m²)" type="number" /><F k="surface_terrain" label="Surface terrain (m²)" type="number" />
                    <F k="nb_pieces" label="Pièces" type="number" /><F k="nb_chambres" label="Chambres" type="number" />
                    <F k="etage" label="Étage" />
                    <div className="space-y-1">
                      <Label className="text-xs">Ascenseur</Label>
                      <Select value={form.ascenseur == null ? '__none__' : form.ascenseur ? 'oui' : 'non'} onValueChange={v => set('ascenseur')(v === '__none__' ? null : v === 'oui')}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="__none__">Non renseigné</SelectItem><SelectItem value="oui">Oui</SelectItem><SelectItem value="non">Non</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <F k="niveaux" label="Niveaux" type="number" /><F k="exposition" label="Exposition" />
                    <F k="chauffage" label="Chauffage" /><F k="annee_construction" label="Année de construction" type="number" />
                    <F k="exterieur" label="Extérieur (balcon, terrasse, jardin)" /><F k="stationnement" label="Stationnement (garage, parking)" />
                    <F k="annexes" label="Annexes (cave, grenier…)" /><F k="sanitaires" label="Sanitaires" />
                    <ClasseSel k="dpe_classe" label="DPE — classe" /><F k="dpe_kwh" label="DPE — kWh/m²/an" type="number" />
                    <ClasseSel k="ges_classe" label="GES — classe" /><div />
                    <F k="cout_energie_min" label="Coût énergie min (€/an)" type="number" /><F k="cout_energie_max" label="Coût énergie max (€/an)" type="number" />
                    <F k="charges_copro_annuelles" label="Charges de copropriété (€/an)" type="number" /><F k="taxe_fonciere" label="Taxe foncière (€/an)" type="number" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="lecture" className="px-3">
                <AccordionTrigger>Notre lecture du bien</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={regenerer} disabled={regen || !(form.description_source || current?.description_source)}>
                      {regen ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Régénérer le texte
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Lecture du bien</Label>
                    <Textarea rows={7} value={form.lecture_bien} onChange={e => set('lecture_bien')(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">{String(form.lecture_bien || '').trim().split(/\s+/).filter(Boolean).length} mots (120 à 160 conseillés)</p>
                  </div>
                  <F k="phrase_cle" label="Phrase clé" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ListEdit k="points_forts" label="Points forts" />
                    <ListEdit k="points_vigilance" label="Points de vigilance" />
                  </div>
                  <div className="flex items-start gap-2 border-t pt-3">
                    <Checkbox id="interet" checked={form.interet_constate} onCheckedChange={v => set('interet_constate')(!!v)} />
                    <div>
                      <Label htmlFor="interet">D'autres acquéreurs ont déjà visité ce bien</Label>
                      <p className="text-xs text-muted-foreground">À cocher uniquement si c'est vrai (pratique commerciale trompeuse sinon, art. L121-2 C. conso.).</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="projet" className="px-3">
                <AccordionTrigger>Le projet et les travaux</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Votre projet pour ce bien</Label>
                    <Textarea rows={5} value={form.projet_texte} onChange={e => set('projet_texte')(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Travaux</Label>
                    {(form.travaux as any[]).map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_110px_110px_auto] gap-1">
                        <Input className="h-9" placeholder="Libellé" value={t.libelle ?? ''} onChange={e => set('travaux')(form.travaux.map((x: any, j: number) => j === i ? { ...x, libelle: e.target.value } : x))} />
                        <Input className="h-9" type="number" placeholder="Min €" value={t.montant_min ?? ''} onChange={e => set('travaux')(form.travaux.map((x: any, j: number) => j === i ? { ...x, montant_min: e.target.value } : x))} />
                        <Input className="h-9" type="number" placeholder="Max €" value={t.montant_max ?? ''} onChange={e => set('travaux')(form.travaux.map((x: any, j: number) => j === i ? { ...x, montant_max: e.target.value } : x))} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => set('travaux')(form.travaux.filter((_: any, j: number) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set('travaux')([...form.travaux, { libelle: '', montant_min: '', montant_max: '' }])}><Plus className="h-3 w-3" />Ajouter un poste</Button>
                  </div>
                  {form.type_projet === 'achat_revente' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <F k="duree_detention_mois" label="Durée de détention (mois)" type="number" />
                      <F k="prix_revente_vise" label="Prix de revente visé (€)" type="number" />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="photos" className="border-b-0 px-3">
                <AccordionTrigger>Photos</AccordionTrigger>
                <AccordionContent>
                  {current && <FichePhotosManager ficheId={current.id} dossierId={dossier.id} />}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button onClick={enregistrer} disabled={update.isPending}>{update.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
