import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Receipt, FileText, Plus, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useTarifsServices } from '@/hooks/use-tarifs-services';
import { useJalons, useSaveJalons, useUpdateJalon } from '@/hooks/use-jalons';
import { useCreateFacture, generateFacturePDF } from '@/hooks/use-factures';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { useUpdateDossier, type Dossier } from '@/hooks/use-dossiers';
import { SERVICE_LABELS, getServices, type ServiceKey } from '@/lib/workflow';

interface Props { dossier: Dossier }

type ServiceStatut = 'en_cours' | 'cloture';

function getStatuts(d: Dossier): Record<string, ServiceStatut> {
  const s = (d.services_souscrits as any) || {};
  return (s._statuts as Record<string, ServiceStatut>) || {};
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

export default function FacturationSection({ dossier }: Props) {
  const { data: tarifs = [] } = useTarifsServices();
  const { data: settings } = useCompanySettings();
  const { data: jalons = [] } = useJalons(dossier.id);
  const saveJalons = useSaveJalons();
  const updateJalon = useUpdateJalon();
  const createFacture = useCreateFacture();
  const updateDossier = useUpdateDossier();

  const tarifMap = useMemo(() => {
    const m: Record<string, { tarif: number; tva: number; label: string }> = {};
    tarifs.forEach(t => { m[t.service_key] = { tarif: Number(t.tarif_base), tva: Number(t.tva_taux), label: t.label }; });
    return m;
  }, [tarifs]);

  const isCleEnMain = (dossier.type_accompagnement || 'cle_en_main') === 'cle_en_main';
  const services = getServices(dossier);
  const statuts = getStatuts(dossier);

  // ─── Clé en main ───────────────────────────
  const remisePackPct = Number((settings as any)?.remise_pack_pct ?? 10);
  const [mode, setMode] = useState<'unique' | 'fractionne'>('unique');
  const [jalonRows, setJalonRows] = useState<{ libelle: string; pourcentage: number; statut: string }[]>([]);

  useEffect(() => {
    if (jalons.length) {
      setMode('fractionne');
      setJalonRows(jalons.map(j => ({ libelle: j.libelle, pourcentage: j.pourcentage, statut: j.statut })));
    }
  }, [jalons.length]);

  // Pack = conseil tarif plein + (chasse + amo + deco) avec remise pack
  const tarifConseil = tarifMap['conseil']?.tarif || 0;
  const tarifChasse = tarifMap['chasse']?.tarif || 0;
  const tarifAmo = tarifMap['amo']?.tarif || 0;
  const tarifDeco = tarifMap['deco']?.tarif || 0;
  const remisablePack = tarifChasse + tarifAmo + tarifDeco;
  const tarifPackComputed = tarifConseil + remisablePack;
  const baseCleEnMain = tarifPackComputed > 0 ? tarifPackComputed : (tarifMap['cle_en_main']?.tarif || 0);
  const remiseMontantPack = remisablePack * (remisePackPct / 100);
  const netCleEnMain = baseCleEnMain - remiseMontantPack;


  const handleSaveJalons = () => {
    const total = jalonRows.reduce((s, j) => s + (Number(j.pourcentage) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Le total des jalons doit être 100% (actuel : ${total}%)`);
      return;
    }
    saveJalons.mutate({
      dossierId: dossier.id,
      jalons: jalonRows.map((j, i) => ({
        dossier_id: dossier.id,
        libelle: j.libelle || `Jalon ${i + 1}`,
        pourcentage: Number(j.pourcentage) || 0,
        ordre: i,
        statut: j.statut || 'a_facturer',
        facture_id: null,
      })),
    });
  };

  const genererFactureUnique = async () => {
    const ht = netCleEnMain;
    const tva = tarifMap['cle_en_main']?.tva || 20;
    const lignes = [{
      service_key: 'cle_en_main',
      label: 'Pack Clé en main',
      tarif_base: baseCleEnMain,
      remise_pct: baseCleEnMain > 0 ? (remiseMontantPack / baseCleEnMain) * 100 : 0,
      remise_montant: remiseMontantPack,
      montant_ht: ht,
      tva_taux: tva,
    }];
    await createFromLignes(lignes, baseCleEnMain > 0 ? (remiseMontantPack / baseCleEnMain) * 100 : 0, remiseMontantPack, 'cle_en_main_unique');
  };

  const genererFactureJalon = async (jalon: any) => {
    const baseJalon = netCleEnMain * (Number(jalon.pourcentage) / 100);
    const tva = tarifMap['cle_en_main']?.tva || 20;
    const lignes = [{
      service_key: 'cle_en_main',
      label: `Pack Clé en main — ${jalon.libelle} (${jalon.pourcentage}%)`,
      tarif_base: baseJalon,
      remise_pct: 0,
      remise_montant: 0,
      montant_ht: baseJalon,
      tva_taux: tva,
    }];
    const f = await createFromLignes(lignes, 0, 0, 'cle_en_main_fractionne', jalon.id);
    if (f) {
      await updateJalon.mutateAsync({ id: jalon.id, statut: 'facture', facture_id: f.id });
    }
  };

  // ─── À la carte ─────────────────────────────
  const serviceKeys = (Object.keys(services) as ServiceKey[]).filter(k => services[k]);
  const [remisesCarte, setRemisesCarte] = useState<Record<string, number>>({});

  const setRemise = (k: string, v: number) => setRemisesCarte(p => ({ ...p, [k]: v }));
  const setStatut = async (k: string, statut: ServiceStatut) => {
    const newSrc = { ...(dossier.services_souscrits as any || {}), _statuts: { ...statuts, [k]: statut } };
    await updateDossier.mutateAsync({ id: dossier.id, services_souscrits: newSrc } as any);
  };

  const genererFactureService = async (k: ServiceKey) => {
    const t = tarifMap[k];
    if (!t) { toast.error('Tarif introuvable'); return; }
    const remise = remisesCarte[k] || 0;
    const net = t.tarif * (1 - remise / 100);
    const lignes = [{
      service_key: k,
      label: t.label,
      tarif_base: t.tarif,
      remise_pct: remise,
      remise_montant: t.tarif - net,
      montant_ht: net,
      tva_taux: t.tva,
    }];
    await createFromLignes(lignes, remise, t.tarif - net, 'a_la_carte');
  };

  const genererFactureGlobale = async () => {
    const lignes = serviceKeys.map(k => {
      const t = tarifMap[k];
      if (!t) return null;
      const remise = remisesCarte[k] || 0;
      const net = t.tarif * (1 - remise / 100);
      return {
        service_key: k,
        label: t.label,
        tarif_base: t.tarif,
        remise_pct: remise,
        remise_montant: t.tarif - net,
        montant_ht: net,
        tva_taux: t.tva,
      };
    }).filter(Boolean) as any[];
    if (!lignes.length) { toast.error('Aucun service à facturer'); return; }
    const totalBase = lignes.reduce((s, l) => s + l.tarif_base, 0);
    const totalRemise = lignes.reduce((s, l) => s + l.remise_montant, 0);
    const remisePctGlobale = totalBase > 0 ? (totalRemise / totalBase) * 100 : 0;
    await createFromLignes(lignes, remisePctGlobale, totalRemise, 'a_la_carte_globale');
  };

  const createFromLignes = async (
    lignes: any[],
    remise_pct: number,
    remise_montant: number,
    mode_facturation: string,
    jalon_id?: string,
  ) => {
    try {
      const totalHT = lignes.reduce((s, l) => s + l.montant_ht, 0);
      // TVA moyenne pondérée
      const totalTVA = lignes.reduce((s, l) => s + l.montant_ht * (l.tva_taux / 100), 0);
      const tvaTaux = totalHT > 0 ? (totalTVA / totalHT) * 100 : 20;
      const f = await createFacture.mutateAsync({
        dossier_id: dossier.id,
        client_name: dossier.client_name,
        dossier_client_name: dossier.client_name,
        mandataire_id: dossier.mandataire_id,
        montant: totalHT,
        tva_taux: tvaTaux,
        type: 'honoraires',
        statut: 'en_attente',
        remise_pct,
        remise_montant,
        lignes,
        jalon_id: jalon_id || null,
        mode_facturation,
      } as any);
      // PDF
      try {
        await generateFacturePDF({
          ...(f as any),
          montant: totalHT,
          tva_taux: tvaTaux,
          montant_ttc: totalHT + totalTVA,
          dossier_numero: dossier.numero_dossier || null,
          dossier_client_name: dossier.client_name,
          lignes,
        } as any, settings);
      } catch (e) { console.error(e); }
      return f;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Facturation</h2>
        <Badge variant={isCleEnMain ? 'default' : 'secondary'} className="ml-2">
          {isCleEnMain ? 'Clé en main' : 'À la carte'}
        </Badge>
      </div>

      {isCleEnMain ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-sm bg-muted border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Tarif Pack</p>
              <p className="text-sm font-bold">{fmtEur(baseCleEnMain)}</p>
            </div>
            <div>
              <Label className="text-[10px] uppercase">Remise (%)</Label>
              <Input type="number" min={0} max={100} value={remiseGlobale}
                onChange={e => setRemiseGlobale(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Montant Net HT</p>
              <p className="text-sm font-bold text-primary">{fmtEur(netCleEnMain)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mode de facturation</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unique">Facture unique</SelectItem>
                <SelectItem value="fractionne">Fractionnée en jalons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'unique' ? (
            <Button onClick={genererFactureUnique} disabled={createFacture.isPending} className="gap-2">
              <FileText className="w-4 h-4" />Générer la facture
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] uppercase text-muted-foreground font-semibold">
                  <span className="col-span-5">Libellé</span>
                  <span className="col-span-2">%</span>
                  <span className="col-span-3">Montant</span>
                  <span className="col-span-2"></span>
                </div>
                {jalonRows.map((j, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" value={j.libelle}
                      onChange={e => setJalonRows(p => p.map((x, k) => k === i ? { ...x, libelle: e.target.value } : x))} />
                    <Input className="col-span-2" type="number" value={j.pourcentage}
                      onChange={e => setJalonRows(p => p.map((x, k) => k === i ? { ...x, pourcentage: Number(e.target.value) } : x))} />
                    <span className="col-span-3 text-xs tabular-nums">{fmtEur(netCleEnMain * j.pourcentage / 100)}</span>
                    <Button size="icon" variant="ghost" className="col-span-2"
                      onClick={() => setJalonRows(p => p.filter((_, k) => k !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setJalonRows(p => [...p, { libelle: '', pourcentage: 0, statut: 'a_facturer' }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Ajouter un jalon
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveJalons} disabled={saveJalons.isPending}>Enregistrer les jalons</Button>
              </div>
              {jalons.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs uppercase font-semibold text-muted-foreground">Génération des factures par jalon</p>
                  {jalons.map(j => (
                    <div key={j.id} className="flex items-center justify-between p-2 rounded-sm bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">{j.libelle} — {j.pourcentage}%</p>
                        <p className="text-xs text-muted-foreground">{fmtEur(netCleEnMain * j.pourcentage / 100)} HT · Statut : {j.statut}</p>
                      </div>
                      <Button size="sm" disabled={j.statut === 'facture'} onClick={() => genererFactureJalon(j)}>
                        {j.statut === 'facture' ? 'Facturé' : 'Générer'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // À la carte
        <div className="space-y-4">
          {serviceKeys.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun service souscrit. Sélectionnez les services dans l'onglet Infos.</p>
          )}
          {serviceKeys.map(k => {
            const t = tarifMap[k];
            if (!t) return null;
            const remise = remisesCarte[k] || 0;
            const net = t.tarif * (1 - remise / 100);
            const stat = statuts[k] || 'en_cours';
            return (
              <div key={k} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-sm">
                <div className="col-span-12 sm:col-span-3">
                  <p className="text-sm font-semibold">{SERVICE_LABELS[k]}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtEur(t.tarif)} (base)</p>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-[10px] uppercase">Remise %</Label>
                  <Input type="number" min={0} max={100} value={remise} onChange={e => setRemise(k, Number(e.target.value))} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Net HT</p>
                  <p className="text-sm font-bold text-primary">{fmtEur(net)}</p>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-[10px] uppercase">Statut</Label>
                  <Select value={stat} onValueChange={(v: ServiceStatut) => setStatut(k, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="cloture">Clôturé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-3 flex justify-end">
                  <Button size="sm" disabled={stat !== 'cloture' || createFacture.isPending}
                    onClick={() => genererFactureService(k)}>
                    <FileText className="w-3.5 h-3.5 mr-1" />Facturer
                  </Button>
                </div>
              </div>
            );
          })}

          {serviceKeys.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-sm bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-semibold">Total Net HT</p>
                <p className="text-lg font-bold text-primary">
                  {fmtEur(serviceKeys.reduce((s, k) => {
                    const t = tarifMap[k]; if (!t) return s;
                    return s + t.tarif * (1 - (remisesCarte[k] || 0) / 100);
                  }, 0))}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Remises totales : {fmtEur(serviceKeys.reduce((s, k) => {
                    const t = tarifMap[k]; if (!t) return s;
                    return s + t.tarif * ((remisesCarte[k] || 0) / 100);
                  }, 0))}
                </p>
              </div>
              <Button onClick={genererFactureGlobale} variant="outline" className="gap-2">
                <Wallet className="w-4 h-4" />Facture globale
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
