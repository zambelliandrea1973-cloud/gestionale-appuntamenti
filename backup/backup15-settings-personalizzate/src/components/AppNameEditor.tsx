import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Info, Check, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AppNameEditorProps {
  onSuccess?: () => void;
}

interface AppInfo {
  appName: string;
  appShortName: string;
}

export default function AppNameEditor({ onSuccess }: AppNameEditorProps) {
  const [appInfo, setAppInfo] = useState<AppInfo>({
    appName: 'App Cliente',
    appShortName: 'App Cliente'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AppInfo>({
    appName: '',
    appShortName: ''
  });
  const { toast } = useToast();

  // Carica le informazioni dell'app al mount
  useEffect(() => {
    fetchAppInfo();
  }, []);

  // Aggiorna i valori del form quando cambiano le informazioni dell'app
  useEffect(() => {
    setFormValues({
      appName: appInfo.appName,
      appShortName: appInfo.appShortName
    });
  }, [appInfo]);

  const fetchAppInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/client-app-info');
      if (!response.ok) {
        throw new Error('Errore nel recupero delle informazioni dell\'app');
      }

      const data = await response.json();
      setAppInfo({
        appName: data.appName || 'App Cliente',
        appShortName: data.appShortName || 'App Cliente'
      });
    } catch (error) {
      console.error('Errore nel recupero delle informazioni dell\'app:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le informazioni dell'app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica che ci siano modifiche
    if (formValues.appName === appInfo.appName && 
        formValues.appShortName === appInfo.appShortName) {
      toast({
        title: "Nessuna modifica",
        description: "Non sono state apportate modifiche al nome dell'app",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const response = await fetch('/api/update-app-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante il salvataggio delle informazioni');
      }

      setSaveSuccess(true);
      
      // Aggiorna le informazioni locali
      setAppInfo(formValues);
      
      toast({
        title: "Salvataggio completato",
        description: "Le informazioni dell'app sono state aggiornate con successo",
        variant: "default",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Errore durante il salvataggio delle informazioni:', error);
      setSaveError(error.message || 'Si è verificato un errore durante il salvataggio delle informazioni');
      toast({
        title: "Errore di salvataggio",
        description: error.message || 'Si è verificato un errore durante il salvataggio delle informazioni',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Nome dell'App Cliente</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Personalizza il nome che verrà visualizzato sui dispositivi dei clienti quando installeranno l'app.
      </p>

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>Salvataggio completato</AlertTitle>
          <AlertDescription>
            Le informazioni dell'app sono state aggiornate con successo. I clienti vedranno il nuovo nome quando installeranno l'app.
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Nome completo dell'app</Label>
                <Input 
                  id="appName"
                  name="appName"
                  value={formValues.appName}
                  onChange={handleInputChange}
                  placeholder="App Cliente"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Questo nome verrà visualizzato nelle notifiche e nei dettagli dell'app
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appShortName">Nome breve dell'app</Label>
                <Input 
                  id="appShortName"
                  name="appShortName"
                  value={formValues.appShortName}
                  onChange={handleInputChange}
                  placeholder="App Cliente"
                  maxLength={12}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Questo nome verrà visualizzato sotto l'icona nella schermata home
                </p>
              </div>
              
              <div className="pt-2 flex items-center">
                <Info className="h-4 w-4 text-muted-foreground mr-2" />
                <p className="text-xs text-muted-foreground">
                  Le modifiche avranno effetto solo per le nuove installazioni dell'app
                </p>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvataggio in corso...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salva modifiche
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}