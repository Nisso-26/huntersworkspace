import { lazy, Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Building2, Receipt, Network, FileText, History, UserPlus, Tag,
} from 'lucide-react';

// Section profil chargée en eager (visible pour tous les rôles)
import ProfileSection from '@/components/parametres/ProfileSection';

// Sections admin chargées à la demande pour alléger le bundle initial
const GestionUtilisateurs = lazy(() => import('@/components/parametres/GestionUtilisateurs'));
const IdentiteSociete = lazy(() => import('@/components/parametres/IdentiteSociete'));
const BaremeHonoraires = lazy(() => import('@/components/parametres/BaremeHonoraires'));
const ModeleEconomique = lazy(() => import('@/components/parametres/ModeleEconomique'));
const ModelesDocuments = lazy(() => import('@/components/parametres/ModelesDocuments'));
const NotificationsSection = lazy(() => import('@/components/parametres/NotificationsSection'));
const JournalAudit = lazy(() => import('@/components/parametres/JournalAudit'));
const TarifsServices = lazy(() => import('@/components/parametres/TarifsServices'));

const SectionFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function Parametres() {
  const { isAdmin } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configuration de votre compte HUNTERS</p>
        </div>

        <ProfileSection />

        {isAdmin && (
          <Tabs defaultValue="utilisateurs" className="space-y-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="utilisateurs"><UserPlus className="w-4 h-4 mr-1" />Utilisateurs</TabsTrigger>
              <TabsTrigger value="identite"><Building2 className="w-4 h-4 mr-1" />Société</TabsTrigger>
              <TabsTrigger value="honoraires"><Receipt className="w-4 h-4 mr-1" />Honoraires</TabsTrigger>
              <TabsTrigger value="tarifs"><Tag className="w-4 h-4 mr-1" />Tarifs services</TabsTrigger>
              <TabsTrigger value="economique"><Network className="w-4 h-4 mr-1" />Réseau</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" />Documents</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1" />Alertes</TabsTrigger>
              <TabsTrigger value="audit"><History className="w-4 h-4 mr-1" />Journal</TabsTrigger>
            </TabsList>
            <Suspense fallback={<SectionFallback />}>
              {isAdmin && (
                <TabsContent value="utilisateurs">
                  <Suspense fallback={<div className="h-32 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>}>
                    <GestionUtilisateurs />
                  </Suspense>
                </TabsContent>
              )}
              <TabsContent value="identite"><IdentiteSociete /></TabsContent>
              <TabsContent value="honoraires"><BaremeHonoraires /></TabsContent>
              <TabsContent value="economique"><ModeleEconomique /></TabsContent>
              <TabsContent value="documents"><ModelesDocuments /></TabsContent>
              <TabsContent value="notifications"><NotificationsSection /></TabsContent>
              <TabsContent value="audit"><JournalAudit /></TabsContent>
            </Suspense>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
