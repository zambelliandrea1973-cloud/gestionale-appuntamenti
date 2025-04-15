import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, LayoutGrid, Layers } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientLegacyNotes from "@/components/ClientLegacyNotes";
import ClientStackedNotes from "@/components/ClientStackedNotes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export default function ClientMedicalDetails() {
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  // Inizializza lo stato con il valore salvato in localStorage o false come default
  const [useStackedView, setUseStackedView] = useState<boolean>(() => {
    try {
      const savedPreference = localStorage.getItem('useStackedView');
      return savedPreference ? JSON.parse(savedPreference) : false;
    } catch (e) {
      return false;
    }
  });
  
  // Salva la preferenza dell'utente in localStorage quando cambia
  useEffect(() => {
    localStorage.setItem('useStackedView', JSON.stringify(useStackedView));
  }, [useStackedView]);
  
  // Estrai l'ID del cliente dall'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      setClientId(parseInt(id));
    }
  }, []);

  // Carica i dati del cliente con refetch automatico
  const { data: client, isLoading } = useQuery<any>({
    queryKey: clientId ? [`/api/clients/${clientId}`] : [],
    enabled: !!clientId,
    refetchInterval: 15000, // Ricarica i dati ogni 15 secondi
    staleTime: 10000       // Considera i dati obsoleti dopo 10 secondi
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{t('clients.details.notFound')}</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Formatta la data di nascita
  const formattedBirthday = client.birthday 
    ? format(new Date(client.birthday), "dd MMMM yyyy", { locale: it })
    : t('clients.details.notSpecified');

  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{client.firstName} {client.lastName}</CardTitle>
              <CardDescription>{t('clients.details.clientFile')}</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setLocation('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('clients.details.personalInfo')}</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">{t('clients.form.firstName')}:</span> {client.firstName}
                </div>
                <div>
                  <span className="font-medium">{t('clients.form.lastName')}:</span> {client.lastName}
                </div>
                <div>
                  <span className="font-medium">{t('common.phone')}:</span> {client.phone || t('clients.details.notSpecified')}
                </div>
                <div>
                  <span className="font-medium">{t('common.email')}:</span> {client.email || t('clients.details.notSpecified')}
                </div>
                <div>
                  <span className="font-medium">{t('common.address')}:</span> {client.address || t('clients.details.notSpecified')}
                </div>
                <div>
                  <span className="font-medium">{t('common.birthday')}:</span> {formattedBirthday}
                </div>
                <div>
                  <span className="font-medium">{t('clients.details.frequentClient')}:</span> {client.isFrequent ? t('common.yes') : t('common.no')}
                </div>
                <div>
                  <span className="font-medium">{t('clients.details.dataConsent')}:</span> {client.hasConsent ? t('clients.details.obtained') : t('clients.details.notObtained')}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('clients.details.appointments')}</h3>
              <Link href={`/clients/${client.id}/appointments`}>
                <Button variant="outline" className="mb-4">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('clients.details.viewAllAppointments')}
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-8">
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes">{t('clients.details.structuredNotes')}</TabsTrigger>
                <TabsTrigger value="medical">{t('clients.details.legacyMedicalData')}</TabsTrigger>
                <TabsTrigger value="other">{t('clients.details.otherInfo')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Controllo per alternare tra vista classica e vista a schede impilate */}
                    <div className="flex flex-col space-y-2 border-b pb-4 mb-4">
                      <h4 className="text-sm font-medium">{t('clients.details.viewMode')}</h4>
                      <div className="flex flex-wrap items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <LayoutGrid className={`h-5 w-5 ${!useStackedView ? 'text-primary' : 'text-muted-foreground'}`} />
                          <Switch
                            checked={useStackedView}
                            onCheckedChange={setUseStackedView}
                            id="view-mode"
                          />
                          <Layers className={`h-5 w-5 ${useStackedView ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex items-center">
                          <Label htmlFor="view-mode" className="text-sm font-medium">
                            {useStackedView 
                              ? t('clients.details.stackedView') 
                              : t('clients.details.classicView')}
                          </Label>
                          <div className="ml-2 text-xs text-muted-foreground max-w-[280px]">
                            {useStackedView 
                              ? t('clients.details.stackedViewDescription') 
                              : t('clients.details.classicViewDescription')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note generali */}
                    {useStackedView ? (
                      <ClientStackedNotes clientId={client.id} category="general" label={t('clients.details.generalNotes')} />
                    ) : (
                      <ClientLegacyNotes clientId={client.id} category="general" label={t('clients.details.generalNotes')} />
                    )}
                    
                    {/* Note mediche */}
                    {useStackedView ? (
                      <ClientStackedNotes clientId={client.id} category="medical" label={t('clients.details.medicalNotes')} />
                    ) : (
                      <ClientLegacyNotes clientId={client.id} category="medical" label={t('clients.details.medicalNotes')} />
                    )}
                    
                    {/* Allergie e informazioni sanitarie */}
                    {useStackedView ? (
                      <ClientStackedNotes clientId={client.id} category="allergies" label={t('clients.details.allergiesInfo')} />
                    ) : (
                      <ClientLegacyNotes clientId={client.id} category="allergies" label={t('clients.details.allergiesInfo')} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="medical" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t('clients.details.medicalNotesLegacy')}</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.medicalNotes || t('clients.details.noMedicalNotes')}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t('clients.details.allergiesInfoLegacy')}</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.allergies || t('clients.details.noAllergiesInfo')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="other" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t('clients.details.generalNotesLegacy')}</h3>
                      <div className="border p-4 rounded-md bg-background min-h-24 whitespace-pre-wrap">
                        {client.notes || t('clients.details.noGeneralNotes')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('clients.details.backToClients')}
          </Button>
          <Button onClick={() => setLocation(`/clients`)}>
            {t('common.edit')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}