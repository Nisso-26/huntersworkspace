// Rendu client UNIQUE de la fiche de présentation du bien :
// aperçu Workspace, page mobile publique et PDF (impression navigateur).
// Aucun appel réseau ici : toutes les données arrivent par les props.
import symbole from '@/assets/hunters-symbol-dark.svg';
import { evaluerCriteres, type Bilan } from '@/lib/fiche-bien-calculs';

export interface FicheDocData {
  fiche: Record<string, any>;
  photos: { id?: string; url?: string | null; role: string; legende?: string | null; ordre: number }[];
  client: { prenom: string };
  demande: Record<string, any> | null;
  conseiller: { full_name?: string | null; telephone?: string | null; email?: string | null; avatar_url?: string | null; rsac_numero?: string | null; rsac_greffe?: string | null } | null;
  societe: { raison_sociale?: string | null; carte_t_numero?: string | null; carte_t_organisme?: string | null; site_web?: string | null; mediateur?: string | null } | null;
}

const SURTITRE: Record<string, string> = { residence_principale: 'Résidence principale', locatif: 'Investissement locatif', achat_revente: 'Achat-revente' };
const TYPE_BIEN: Record<string, string> = { appartement: 'Appartement', maison: 'Maison', terrain: 'Terrain', immeuble: 'Immeuble', local: 'Local' };
const DPE_COLORS = ['#2E8B57', '#5BAA4A', '#A6C83C', '#F2D33A', '#F0A33A', '#E4672E', '#C8302A'];
const PASTILLE: Record<string, [string, string]> = {
  respecte: ['Respecté', '#2E7D4F'], sous_condition: ['Sous condition', '#B7791F'], non_respecte: ['Non respecté', '#B23A2E'], non_renseigne: ['—', '#8A8F86'],
};

const nf = (v: number, d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const has = (v: any) => v != null && v !== '' && !(typeof v === 'number' && !isFinite(v));
const eur = (v: any) => (has(v) ? `${nf(Number(v))}\u00a0€` : '—');
const pct = (v: any, d = 1) => (has(v) ? `${nf(Number(v), d)}\u00a0%` : '—');
const m2 = (v: any) => (has(v) ? `${nf(Number(v))}\u00a0m²` : '—');
const C = (v: any) => (has(v) ? String(v) : '[à compléter]');

function etapesDefaut(type: string) {
  return type === 'achat_revente'
    ? [{ titre: 'Visite avec un artisan', texte: '' }, { titre: 'Offre', texte: '' }, { titre: 'Montage', texte: '' }]
    : [{ titre: 'Visite', texte: '' }, { titre: 'Offre', texte: '' }, { titre: 'Financement', texte: '' }];
}
export { etapesDefaut };

const CSS = `
.fbd{--v:#004621;--vp:#06381E;--cr:#F4ECD8;--or:#C8962F;--ink:#23291F;font-family:'Jost',system-ui,sans-serif;color:var(--ink);background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fbd h1,.fbd h2,.fbd h3,.fbd .serif{font-family:'Marcellus',Georgia,serif;font-weight:400}
.fbd-page{position:relative;padding:28px 20px 40px;border-bottom:1px solid #e6dfcc}
.fbd-page h2{color:var(--v);font-size:26px;margin:0 0 4px}
.fbd-rule{width:56px;height:2px;background:var(--or);margin:8px 0 18px}
.fbd-foot{display:none}
.fbd-dark{background:var(--vp);color:var(--cr)}
.fbd-grid2{display:grid;grid-template-columns:1fr;gap:4px 24px}
.fbd-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ece6d6;padding:6px 0;font-size:14px}
.fbd-row b{font-weight:600;text-align:right}
.fbd-card{background:var(--cr);padding:14px;border-left:3px solid var(--or)}
.fbd table{width:100%;border-collapse:collapse;font-size:13px}
.fbd th{text-align:left;font-weight:500;color:var(--v);border-bottom:2px solid var(--or);padding:6px 4px}
.fbd td{border-bottom:1px solid #ece6d6;padding:6px 4px;vertical-align:top}
.fbd img{display:block;width:100%;object-fit:cover}
.fbd-print-btn{position:fixed;right:16px;bottom:16px;z-index:50;background:var(--v);color:var(--cr);border:0;padding:12px 18px;font:500 14px 'Jost',sans-serif;cursor:pointer}
@media(min-width:720px){.fbd-page{padding:48px 56px 56px}.fbd-grid2{grid-template-columns:1fr 1fr}}
@media print{
  @page{size:A4;margin:0}
  body *{visibility:hidden}
  .fbd,.fbd *{visibility:visible}
  .fbd{position:absolute;left:0;top:0;width:210mm}
  .fbd-print-btn{display:none!important}
  .fbd-page{width:210mm;min-height:297mm;padding:16mm 16mm 22mm;border:0;break-after:page;page-break-after:always;box-sizing:border-box;overflow:hidden}
  .fbd-page.fbd-full{padding:0}
  .fbd-grid2{grid-template-columns:1fr 1fr}
  .fbd-foot{display:block;position:absolute;left:16mm;right:16mm;bottom:8mm;font-size:9px;color:#6b6f66;border-top:1px solid #e6dfcc;padding-top:4px}
  .fbd-dark .fbd-foot{color:var(--cr);border-color:rgba(244,236,216,.3)}
}`;

function Foot() { return <div className="fbd-foot">huntersimmobilier.fr · Document confidentiel</div>; }
function Row({ l, v }: { l: string; v: string }) { return <div className="fbd-row"><span>{l}</span><b>{v}</b></div>; }

export default function FicheBienDocument({ data, showPrint }: { data: FicheDocData; showPrint?: boolean }) {
  const f = data.fiche;
  const bilan = f.bilan as Bilan | null;
  const type = f.type_projet as string;
  const photos = [...(data.photos || [])].filter(p => p.url).sort((a, b) => a.ordre - b.ordre);
  const cover = photos.find(p => p.role === 'couverture') ?? photos[0];
  const galerie = photos.filter(p => p.role === 'galerie');
  const avant = photos.filter(p => p.role === 'avant');
  const apres = photos.filter(p => p.role === 'apres');
  const cible = bilan?.scenarios?.[1];
  const mois = new Date(f.envoyee_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const client = data.client?.prenom || '';
  const criteres = evaluerCriteres(f as any, data.demande, bilan, f.criteres_eval || {});
  const r: any = bilan?.resultat;
  const etapes = (Array.isArray(f.prochaines_etapes) && f.prochaines_etapes.length ? f.prochaines_etapes : etapesDefaut(type)).slice(0, 3);
  const risques = (Array.isArray(f.risques) ? f.risques : []).filter((x: any) => x?.risque);
  const travaux = (f.travaux || []) as any[];
  const tMin = travaux.reduce((s, t) => s + (Number(t.montant_min) || 0), 0);
  const tMax = travaux.reduce((s, t) => s + (Number(t.montant_max) || 0), 0);
  const surface = Number(f.surface_habitable) || 0;
  const conseiller = data.conseiller || {};
  const societe = data.societe || {};

  // Galerie magazine : 1, puis 2, puis 3, puis on recommence
  const rangs: typeof galerie[] = [];
  for (let i = 0, k = 0; i < galerie.length; k++) { const n = [1, 2, 3][k % 3]; rangs.push(galerie.slice(i, i + n)); i += n; }

  const demandeVal: Record<string, string> = {
    budget: eur(bilan?.enveloppe), ville: data.demande?.contraintes_geographiques || '—',
    type_bien: data.demande?.type_bien_souhaite || '—', surface: data.demande?.surface_min ? `≥ ${m2(data.demande.surface_min)}` : '—',
    dpe: data.demande?.dpe_min ? `${data.demande.dpe_min} ou mieux` : '—', exterieur: data.demande?.exterieur_souhaite || '—',
  };
  const bienVal: Record<string, string> = {
    budget: eur(bilan?.cout_total), ville: f.ville || '—', type_bien: TYPE_BIEN[f.type_bien] || '—',
    surface: m2(f.surface_habitable), dpe: f.dpe_classe || '—', exterieur: f.exterieur || '—',
  };

  const carac: [string, any][] = [
    ['Type de bien', TYPE_BIEN[f.type_bien]], ['Ville', [f.ville, f.code_postal].filter(Boolean).join(' ')], ['Quartier', f.quartier],
    ['Surface habitable', has(f.surface_habitable) && m2(f.surface_habitable)], ['Terrain', has(f.surface_terrain) && m2(f.surface_terrain)],
    ['Pièces', f.nb_pieces], ['Chambres', f.nb_chambres], ['Étage', f.etage],
    ['Ascenseur', f.ascenseur == null ? null : f.ascenseur ? 'Oui' : 'Non'], ['Niveaux', f.niveaux], ['Exposition', f.exposition],
    ['Chauffage', f.chauffage], ['Année de construction', f.annee_construction], ['Extérieur', f.exterieur],
    ['Stationnement', f.stationnement], ['Annexes', f.annexes], ['Sanitaires', f.sanitaires],
    ['Coût énergie annuel', has(f.cout_energie_min) || has(f.cout_energie_max) ? `${eur(f.cout_energie_min)} à ${eur(f.cout_energie_max)}` : null],
    ['Charges de copropriété', has(f.charges_copro_annuelles) && `${eur(f.charges_copro_annuelles)} / an`],
    ['Taxe foncière', has(f.taxe_fonciere) && `${eur(f.taxe_fonciere)} / an`],
  ];

  const marche = bilan?.marche;
  const reventeM2 = type === 'achat_revente' && surface > 0 && f.prix_revente_vise ? Number(f.prix_revente_vise) / surface : null;

  return (
    <div className="fbd">
      <style>{CSS}</style>
      {showPrint && <button type="button" className="fbd-print-btn" onClick={() => window.print()}>Télécharger en PDF</button>}

      {/* 1. Garde */}
      <section className="fbd-page fbd-full fbd-dark" style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40 }}>
        <p style={{ color: 'var(--or)', letterSpacing: 3, textTransform: 'uppercase', fontSize: 12, margin: 0 }}>{SURTITRE[type]}</p>
        <div style={{ textAlign: 'center' }}>
          <img src={symbole} alt="" style={{ width: 64, height: 'auto', margin: '0 auto 14px', objectFit: 'contain' }} />
          <p className="serif" style={{ letterSpacing: 6, fontSize: 22, margin: 0 }}>HUNTERS</p>
          <p style={{ letterSpacing: 3, fontSize: 10, margin: '4px 0 40px' }}>CABINET DE CONSEIL IMMOBILIER</p>
          <h1 style={{ fontSize: 34, margin: 0 }}>Présentation d'opportunité</h1>
          <div style={{ width: 56, height: 2, background: 'var(--or)', margin: '16px auto' }} />
          <p className="serif" style={{ fontSize: 20, margin: 0 }}>{f.titre}</p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{client} · {mois}</p>
        <Foot />
      </section>

      {/* 2. Couverture */}
      <section className="fbd-page fbd-full" style={{ padding: 0 }}>
        {cover && <img src={cover.url!} alt="" style={{ height: '55vh', maxHeight: 620 }} />}
        <div style={{ padding: '24px 20px 40px' }}>
          <p style={{ color: 'var(--v)', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, margin: 0 }}>{SURTITRE[type]}</p>
          <h2 style={{ marginTop: 6 }}>{f.titre}</h2>
          <p style={{ margin: '0 0 18px' }}>{f.ville}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            <div className="fbd-card"><small>Prix affiché</small><p className="serif" style={{ fontSize: 22, margin: '4px 0' }}>{eur(f.prix_affiche)}</p>
              {bilan && cible && <small>Objectif : {eur(cible.prix_achat)} à {eur(bilan.prix_plafond)}</small>}</div>
            <div className="fbd-card"><small>Surface</small><p className="serif" style={{ fontSize: 22, margin: '4px 0' }}>{m2(f.surface_habitable)}</p></div>
            <div className="fbd-card"><small>{has(f.surface_terrain) ? 'Terrain' : 'Étage'}</small><p className="serif" style={{ fontSize: 22, margin: '4px 0' }}>{has(f.surface_terrain) ? m2(f.surface_terrain) : f.etage || '—'}</p></div>
            <div className="fbd-card"><small>Chambres</small><p className="serif" style={{ fontSize: 22, margin: '4px 0' }}>{f.nb_chambres ?? '—'}</p></div>
          </div>
          <p style={{ marginTop: 24, fontSize: 13 }}>Préparé pour {client}</p>
        </div>
        <Foot />
      </section>

      {/* 3. Galerie */}
      {galerie.length > 0 && (
        <section className="fbd-page">
          <h2>Le bien en images</h2><div className="fbd-rule" />
          <div style={{ display: 'grid', gap: 8 }}>
            {rangs.map((rg, i) => (
              <div key={i} style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${rg.length},1fr)` }}>
                {rg.map(p => <figure key={p.id ?? p.url} style={{ margin: 0 }}><img src={p.url!} alt={p.legende || ''} style={{ height: rg.length === 1 ? 280 : rg.length === 2 ? 180 : 130 }} />
                  {p.legende && <figcaption style={{ fontSize: 11, marginTop: 3 }}>{p.legende}</figcaption>}</figure>)}
              </div>
            ))}
          </div>
          <Foot />
        </section>
      )}

      {/* 4. Pourquoi ce bien */}
      <section className="fbd-page">
        <h2>Pourquoi ce bien</h2><div className="fbd-rule" />
        <table>
          <thead><tr><th>Critère</th><th>Votre demande</th><th>Ce bien</th><th></th></tr></thead>
          <tbody>{criteres.lignes.map(l => (
            <tr key={l.key}><td>{l.label}{l.commentaire && <div style={{ fontSize: 11, color: '#6b6f66' }}>{l.commentaire}</div>}</td>
              <td>{demandeVal[l.key]}</td><td>{bienVal[l.key]}</td>
              <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: PASTILLE[l.statut][1] }} />{PASTILLE[l.statut][0]}</span></td></tr>
          ))}</tbody>
        </table>
        <p className="serif" style={{ fontSize: 20, color: 'var(--v)', marginTop: 12 }}>{criteres.score} / {criteres.total} critères respectés</p>
        {marche && (
          <>
            <h3 style={{ color: 'var(--v)', marginTop: 24 }}>Le prix face au marché</h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${reventeM2 ? 3 : 2},1fr)`, gap: 10 }}>
              <div className="fbd-card"><small>Ce bien</small><p className="serif" style={{ fontSize: 20, margin: '4px 0' }}>{eur(marche.prix_m2_bien)}/m²</p></div>
              <div className="fbd-card"><small>Marché</small><p className="serif" style={{ fontSize: 20, margin: '4px 0' }}>{eur(marche.prix_marche_m2)}/m²</p><small>{has(marche.ecart_pct) && `Écart ${marche.ecart_pct! > 0 ? '+' : ''}${pct(marche.ecart_pct)}`}</small></div>
              {reventeM2 && <div className="fbd-card"><small>Revente visée</small><p className="serif" style={{ fontSize: 20, margin: '4px 0' }}>{eur(reventeM2)}/m²</p></div>}
            </div>
            {marche.fourchette && marche.fourchette[0] && marche.fourchette[1] && marche.prix_m2_bien != null && (() => {
              const [mn, mx] = marche.fourchette as [number, number];
              const pos = Math.min(100, Math.max(0, ((marche.prix_m2_bien! - mn) / (mx - mn)) * 100));
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ position: 'relative', height: 8, background: 'var(--cr)', border: '1px solid var(--or)' }}>
                    <div style={{ position: 'absolute', left: `calc(${pos}% - 6px)`, top: -4, width: 12, height: 14, background: 'var(--v)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}><span>{eur(mn)}/m²</span><span>{eur(mx)}/m²</span></div>
                </div>
              );
            })()}
            {marche.source && <p style={{ fontSize: 10, color: '#6b6f66', marginTop: 8 }}>Source : {marche.source}</p>}
          </>
        )}
        <Foot />
      </section>

      {/* 5. Détail */}
      <section className="fbd-page">
        <h2>Le bien en détail</h2><div className="fbd-rule" />
        <div className="fbd-grid2">{carac.filter(([, v]) => has(v) && v !== false).map(([l, v]) => <Row key={l} l={l} v={String(v)} />)}</div>
        {f.dpe_classe && (
          <div style={{ marginTop: 20 }}>
            <small>Diagnostic de performance énergétique{has(f.dpe_kwh) && ` · ${nf(f.dpe_kwh)} kWh/m²/an`}</small>
            <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
              {'ABCDEFG'.split('').map((c, i) => {
                const on = c === String(f.dpe_classe).toUpperCase();
                return <div key={c} style={{ flex: 1, background: DPE_COLORS[i], color: '#fff', textAlign: 'center', padding: on ? '10px 0' : '4px 0', fontWeight: on ? 700 : 400, outline: on ? '2px solid var(--ink)' : 'none', fontSize: on ? 16 : 12, alignSelf: 'center' }}>{c}</div>;
              })}
            </div>
          </div>
        )}
        {f.lecture_bien && <><h3 style={{ color: 'var(--v)', marginTop: 24 }}>Notre lecture du bien</h3><p style={{ lineHeight: 1.6, fontSize: 14 }}>{f.lecture_bien}</p></>}
        {f.phrase_cle && <blockquote className="serif" style={{ borderLeft: '3px solid var(--or)', margin: '16px 0', padding: '4px 14px', fontSize: 18, color: 'var(--v)' }}>« {f.phrase_cle} »</blockquote>}
        <div className="fbd-grid2" style={{ gap: 16 }}>
          {f.points_forts?.length > 0 && <div><h3 style={{ color: 'var(--v)' }}>Points forts</h3><ul style={{ paddingLeft: 18, fontSize: 14 }}>{f.points_forts.map((p: string) => <li key={p}>{p}</li>)}</ul></div>}
          {f.points_vigilance?.length > 0 && <div><h3 style={{ color: 'var(--v)' }}>Points de vigilance</h3><ul style={{ paddingLeft: 18, fontSize: 14 }}>{f.points_vigilance.map((p: string) => <li key={p}>{p}</li>)}</ul></div>}
        </div>
        <Foot />
      </section>

      {/* 6. Projet */}
      <section className="fbd-page">
        <h2>Le projet proposé</h2><div className="fbd-rule" />
        <span style={{ display: 'inline-block', background: 'var(--v)', color: 'var(--cr)', padding: '4px 10px', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{SURTITRE[type]}</span>
        {f.projet_texte && <p style={{ lineHeight: 1.6, fontSize: 14, whiteSpace: 'pre-line' }}>{f.projet_texte}</p>}
        {(avant.length > 0 || apres.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div>{avant.map(p => <figure key={p.url} style={{ margin: '0 0 8px' }}><img src={p.url!} alt="" style={{ height: 170 }} /><figcaption style={{ fontSize: 11 }}>Avant{p.legende ? ` · ${p.legende}` : ''}</figcaption></figure>)}</div>
            <div>{apres.map(p => <figure key={p.url} style={{ margin: '0 0 8px' }}><img src={p.url!} alt="" style={{ height: 170 }} /><figcaption style={{ fontSize: 11 }}>Après · Visuel d'ambiance non contractuel</figcaption></figure>)}</div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          {tMax > 0 && <Row l="Enveloppe travaux" v={`${eur(tMin)} à ${eur(tMax)}`} />}
          {travaux.filter(t => t.libelle).map((t, i) => <Row key={i} l={t.libelle} v={`${eur(t.montant_min)} à ${eur(t.montant_max)}`} />)}
          {type === 'achat_revente' && <><Row l="Durée de détention" v={has(f.duree_detention_mois) ? `${f.duree_detention_mois} mois` : '—'} /><Row l="Revente visée" v={eur(f.prix_revente_vise)} /></>}
        </div>
        <Foot />
      </section>

      {/* 7. Bilan */}
      {bilan && r && (
        <section className="fbd-page">
          <h2>Bilan de l'opération</h2><div className="fbd-rule" />
          <div className="fbd-grid2">
            <div>
              <Row l="Prix d'achat" v={eur(bilan.prix_achat)} />
              <Row l="Frais de notaire" v={eur(bilan.notaire)} />
              <Row l="Travaux" v={eur(bilan.travaux)} />
              <Row l="Honoraires HUNTERS TTC" v={eur(bilan.honoraires?.total_ttc)} />
              {bilan.frais_divers > 0 && <Row l="Frais divers" v={eur(bilan.frais_divers)} />}
              <Row l="Coût total de l'opération" v={eur(bilan.cout_total)} />
              <Row l="Apport" v={eur(bilan.apport)} />
            </div>
            <div>
              {type === 'residence_principale' && <>
                <Row l="Montant emprunté" v={eur(r.financement?.capital)} />
                <Row l="Mensualité (assurance comprise)" v={eur(r.financement?.mensualite)} />
                <Row l="Taux d'endettement (repère 35 %)" v={pct(r.endettement)} />
                {bilan.marche?.valeur_du_bien && <Row l="Valeur estimée du bien" v={eur(bilan.marche.valeur_du_bien)} />}
              </>}
              {type === 'locatif' && <>
                <Row l="Mensualité (assurance comprise)" v={eur(r.financement?.mensualite)} />
                <Row l="Loyer mensuel" v={eur((r.loyers_annuels || 0) / 12)} />
                <Row l="Rendement brut" v={pct(r.rendement_brut, 2)} />
                <Row l="Rendement net de charges" v={pct(r.rendement_net, 2)} />
                {r.cash_flow_mensuel < 0 ? <Row l="Effort d'épargne" v={`${eur(r.effort_epargne)} / mois`} /> : <Row l="Cash-flow mensuel avant impôt" v={eur(r.cash_flow_mensuel)} />}
              </>}
              {type === 'achat_revente' && cible && <>
                <Row l="Scénario cible" v={cible.remise_pct ? `−${cible.remise_pct} %` : 'Prix retenu'} />
                <Row l="Marge nette après impôt" v={eur((cible.resultat as any).marge_nette)} />
                <Row l="Rentabilité" v={pct((cible.resultat as any).rentabilite)} />
              </>}
            </div>
          </div>
          {type === 'achat_revente' && (
            <table style={{ marginTop: 16 }}>
              <thead><tr><th>Scénario</th><th>Prix d'achat</th><th>Coût de revient</th><th>Écart enveloppe</th>
                {(bilan.hypotheses_revente || [-5, 0, 5]).map((v: number) => <th key={v}>Marge revente {v > 0 ? '+' : ''}{v} %</th>)}</tr></thead>
              <tbody>{bilan.scenarios.map(s => (
                <tr key={s.remise_pct}><td>{s.remise_pct ? `−${s.remise_pct} %` : 'Prix retenu'}</td><td>{eur(s.prix_achat)}</td><td>{eur(s.cout_total)}</td><td>{eur(s.ecart)}</td>
                  {(s as any).marges_revente?.map((m: number, i: number) => <td key={i}>{eur(m)}</td>)}</tr>
              ))}</tbody>
            </table>
          )}
          <div className="fbd-card" style={{ marginTop: 16 }}>
            <span>Écart avec votre enveloppe : </span>
            <b style={{ color: bilan.ecart >= 0 ? '#2E7D4F' : '#B23A2E' }}>{bilan.ecart >= 0 ? '+' : ''}{eur(bilan.ecart)}</b>
          </div>
          {bilan.alertes?.length > 0 && <ul style={{ fontSize: 12, paddingLeft: 18, marginTop: 12 }}>{bilan.alertes.map(a => <li key={a}>{a}</li>)}</ul>}
          <p style={{ fontSize: 10, color: '#6b6f66', marginTop: 12 }}>Estimations indicatives et non contractuelles.</p>
          <Foot />
        </section>
      )}

      {/* 8. Décision */}
      <section className="fbd-page">
        <h2>Décision et prochaines étapes</h2><div className="fbd-rule" />
        {f.recommandation && <div className="fbd-card"><h3 style={{ color: 'var(--v)', margin: '0 0 6px' }}>Notre recommandation</h3><p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14 }}>{f.recommandation}</p></div>}
        {risques.length > 0 && (
          <table style={{ marginTop: 16 }}><thead><tr><th>Risque</th><th>À savoir</th><th>Notre parade</th></tr></thead>
            <tbody>{risques.map((x: any, i: number) => <tr key={i}><td>{x.risque}</td><td>{x.a_savoir}</td><td>{x.parade}</td></tr>)}</tbody></table>
        )}
        <ol style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
          {etapes.map((e: any, i: number) => (
            <li key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span className="serif" style={{ width: 32, height: 32, flexShrink: 0, background: 'var(--v)', color: 'var(--cr)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <div><b style={{ fontWeight: 600 }}>{e.titre}</b>{e.texte && <p style={{ margin: '2px 0 0', fontSize: 13 }}>{e.texte}</p>}</div>
            </li>
          ))}
        </ol>
        {f.interet_constate === true && <p className="serif" style={{ color: 'var(--v)', fontSize: 16 }}>D'autres acquéreurs ont déjà visité ce bien.</p>}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 20, padding: 14, border: '1px solid #e6dfcc' }}>
          {conseiller.avatar_url && <img src={conseiller.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 32 }} />}
          <div style={{ fontSize: 14 }}>
            <p className="serif" style={{ margin: 0, fontSize: 18, color: 'var(--v)' }}>{conseiller.full_name}</p>
            {conseiller.telephone && <p style={{ margin: 0 }}>{conseiller.telephone}</p>}
            {conseiller.email && <p style={{ margin: 0 }}>{conseiller.email}</p>}
          </div>
        </div>
        <p style={{ fontSize: 10, color: '#6b6f66', marginTop: 20, lineHeight: 1.5 }}>
          {C(conseiller.full_name)}, agent commercial immatriculé au RSAC de {C(conseiller.rsac_greffe)} n° {C(conseiller.rsac_numero)}, habilité par HUNTERS Immobilier SASU, titulaire de la carte professionnelle T n° {C(societe.carte_t_numero)} délivrée par {C(societe.carte_t_organisme)}. Estimations indicatives et non contractuelles, établies sur la base des informations disponibles.
        </p>
        <Foot />
      </section>
    </div>
  );
}
