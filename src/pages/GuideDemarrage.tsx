import AppLayout from '@/components/AppLayout';
import { Link } from 'react-router-dom';
import {
  Compass, FileText, Calculator, TrendingUp, PenLine, ShieldCheck,
  Target, BookOpen, ArrowRight, LifeBuoy,
} from 'lucide-react';

interface ModuleGuide {
  icon: typeof FileText;
  titre: string;
  href?: string;
  role: string;
  usage: string;
  astuce?: string;
}

const modules: ModuleGuide[] = [
  {
    icon: FileText,
    titre: 'Dossiers',
    href: '/dossiers',
    role: "Un dossier = un client. Tout ce qui concerne cette personne s'y trouve : sa situation, son projet, ses documents, ses échanges.",
    usage: "Vous créez le dossier dès le premier contact sérieux, puis vous le complétez au fil des rendez-vous. Le dossier avance d'étape en étape (du premier contact jusqu'à la signature chez le notaire).",
    astuce: "Si une information manque dans le dossier, tous les documents générés ensuite seront incomplets. Remplissez d'abord, générez après.",
  },
  {
    icon: TrendingUp,
    titre: 'Stratégie patrimoniale',
    href: '/dossiers',
    role: "Le document qui explique au client ce qu'il peut acheter, avec quel financement, et ce que cela lui rapportera.",
    usage: "Depuis un dossier, onglet Stratégie : vous remplissez le formulaire avec les informations du client, l'outil rédige la proposition. Un analyste la relit avant que vous ne la présentiez.",
    astuce: "Attendez la mention « Stratégie validée » avant de l'envoyer au client.",
  },
  {
    icon: Calculator,
    titre: 'Devis',
    href: '/dossiers',
    role: "Le prix de la prestation Hunters pour ce client, calculé automatiquement selon la grille tarifaire.",
    usage: "Vous activez ou non le pack clé en main, l'outil calcule le total et produit un PDF prêt à envoyer. Le conseil patrimonial est toujours au tarif plein, sans remise.",
    astuce: "Un devis n'engage le client qu'une fois signé.",
  },
  {
    icon: PenLine,
    titre: 'Signature',
    href: '/dossiers',
    role: "Faire signer un document au client à distance, sans impression ni scan.",
    usage: "Vous choisissez le document, vérifiez l'aperçu pré-rempli, puis envoyez. Le client reçoit un lien par e-mail ; le document signé revient tout seul dans le dossier.",
    astuce: "Client qui ne reçoit rien : vérifiez l'adresse, ses spams, puis cliquez sur « Relancer ».",
  },
  {
    icon: ShieldCheck,
    titre: 'Conformité',
    href: '/mandataires',
    role: "Vos obligations légales de conseiller : les heures de formation annuelles et votre attestation d'habilitation.",
    usage: "Vous y suivez vos heures validées et la date de fin de votre attestation. Il suffit de tenir ces deux informations à jour.",
    astuce: "Une attestation expirée ou une formation en retard empêche de recevoir de nouveaux dossiers.",
  },
  {
    icon: Target,
    titre: 'Objectifs',
    href: '/mandataires',
    role: "Vos trois objectifs sur trois mois : chiffre d'affaires, mandats signés, conseils lancés.",
    usage: "Les barres se remplissent automatiquement avec votre activité, vous n'avez rien à saisir. Le trimestre se clôture tout seul.",
    astuce: "Un trimestre raté n'a pas de conséquence immédiate ; c'est la répétition sur plusieurs trimestres qui suspend l'envoi de nouveaux contacts.",
  },
  {
    icon: BookOpen,
    titre: 'Ressources',
    href: '/ressources',
    role: "La bibliothèque des modèles et procédures Hunters : mandats, cahier des charges, simulateur, procédures internes.",
    usage: "Vous cherchez un document, vous le téléchargez, vous l'utilisez. Rien à créer de zéro.",
    astuce: "Utilisez toujours la version de la bibliothèque : c'est la seule à jour juridiquement.",
  },
];

export default function GuideDemarrage() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-accent">
            <Compass className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Guide de démarrage
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Comprendre le Workspace en 10 minutes
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette page se lit une fois, à votre arrivée. Elle explique à quoi sert
            chaque partie de l'outil et dans quel ordre s'en servir. Aucune
            connaissance technique n'est nécessaire.
          </p>
        </header>

        <section className="rounded-xl border border-border/60 bg-secondary/40 p-5 space-y-2">
          <h2 className="font-heading font-semibold text-sm text-foreground">
            Le déroulé normal d'un client
          </h2>
          <ol className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>1. Vous créez son <strong className="text-foreground">dossier</strong> et notez sa situation.</li>
            <li>2. Vous générez sa <strong className="text-foreground">stratégie patrimoniale</strong>, relue par un analyste.</li>
            <li>3. Vous présentez la stratégie et établissez le <strong className="text-foreground">devis</strong>.</li>
            <li>4. Vous envoyez les documents en <strong className="text-foreground">signature</strong>.</li>
            <li>5. La recherche du bien commence, puis les visites, l'offre et la signature notaire.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground">
            Les modules, un par un
          </h2>
          {modules.map((m) => (
            <article
              key={m.titre}
              className="rounded-xl border border-border/60 bg-card p-5 space-y-2 shadow-card"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <m.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground">{m.titre}</h3>
                {m.href && (
                  <Link
                    to={m.href}
                    className="ml-auto text-xs text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Ouvrir <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{m.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.usage}</p>
              {m.astuce && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-accent/50 pl-3">
                  {m.astuce}
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-5 space-y-2">
          <h2 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-accent" />
            Un mot que vous ne comprenez pas ?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Partout dans l'application, une petite icône « ? » à côté d'un titre
            ouvre une explication en français simple. Cliquez dessus sans crainte :
            cela ne modifie rien. Les badges rouges (comme « Bloquant ») s'expliquent
            de la même façon au survol.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
