import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Check, X, Calendar } from "lucide-react";
import { 
  loadGoogleCalendarSettings, 
  saveGoogleCalendarSettings, 
  getGoogleAuthUrl, 
  exchangeCodeForToken, 
  getAvailableCalendars,
  GoogleCalendarSettings,
  GoogleCalendarInfo
} from "@/lib/googleCalendar";
import { GoogleCalendarEvent } from "@shared/schema";
import { useTranslation } from 'react-i18next';

export default function GoogleCalendarSettingsComponent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stati per OAuth
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  
  // Stati per le impostazioni
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(window.location.origin + "/settings");
  const [calendarId, setCalendarId] = useState("primary");
  const [isEnabled, setIsEnabled] = useState(false);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  
  // Carica le impostazioni esistenti
  const { 
    data: settings, 
    isLoading: isLoadingSettings,
    error: settingsError 
  } = useQuery({
    queryKey: ["/api/google-calendar/settings"],
    queryFn: async () => {
      const settings = await loadGoogleCalendarSettings();
      return settings;
    }
  });
  
  // Carica i calendari disponibili
  const {
    data: availableCalendars,
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars
  } = useQuery({
    queryKey: ["/api/google-calendar/calendars"],
    queryFn: async () => {
      return await getAvailableCalendars();
    },
    enabled: !!settings?.refreshToken, // Abilita la query solo se l'utente è autenticato
  });
  
  // Imposta i valori del form quando le impostazioni vengono caricate
  useEffect(() => {
    if (settings) {
      setClientId(settings.clientId || "");
      // Non impostare clientSecret per sicurezza
      setRedirectUri(settings.redirectUri || window.location.origin + "/settings");
      setCalendarId(settings.calendarId || "primary");
      setIsEnabled(settings.enabled);
      
      // Aggiorna la visibilità del selettore di calendario in base all'autenticazione
      setShowCalendarSelector(!!settings.refreshToken);
    }
  }, [settings]);
  
  // Aggiorna i calendari disponibili quando l'utente si autentica
  useEffect(() => {
    if (settings?.refreshToken && !availableCalendars) {
      refetchCalendars();
    }
  }, [settings?.refreshToken, availableCalendars, refetchCalendars]);
  
  // Mutation per salvare le impostazioni
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: GoogleCalendarSettings) => {
      return await saveGoogleCalendarSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/settings"] });
      toast({
        title: t("settings.googleCalendar.saveSuccess"),
        description: t("settings.googleCalendar.saveSuccessMsg"),
      });
    },
    onError: () => {
      toast({
        title: t("settings.googleCalendar.saveError"),
        description: t("settings.googleCalendar.saveErrorMsg"),
        variant: "destructive",
      });
    }
  });
  
  // Mutation per scambiare il codice di autorizzazione
  const exchangeCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return await exchangeCodeForToken(
        code,
        clientId,
        clientSecret,
        redirectUri
      );
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/settings"] });
        toast({
          title: t("settings.googleCalendar.authSuccess"),
          description: t("settings.googleCalendar.authSuccessMsg"),
        });
        setShowAuthDialog(false);
      } else {
        toast({
          title: t("settings.googleCalendar.authError"),
          description: t("settings.googleCalendar.authErrorMsg"),
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: t("settings.googleCalendar.authError"),
        description: t("settings.googleCalendar.authErrorMsg"),
        variant: "destructive",
      });
    }
  });
  
  // Funzione per aprire il selettore di calendario
  const handleOpenCalendarSelector = async () => {
    if (!settings?.refreshToken) {
      toast({
        title: t("settings.googleCalendar.notAuthorized"),
        description: t("settings.googleCalendar.authorizeFirst"),
        variant: "destructive",
      });
      return;
    }
    
    await refetchCalendars();
    setShowCalendarSelector(true);
  };
  
  // Funzione per selezionare un calendario
  const handleSelectCalendar = (calendarId: string) => {
    setCalendarId(calendarId);
    setShowCalendarSelector(false);
  };
    
  // Genera l'URL di autorizzazione
  const handleGenerateAuthUrl = async () => {
    if (!clientId || !redirectUri) {
      toast({
        title: t("settings.googleCalendar.missingFields"),
        description: t("settings.googleCalendar.missingFieldsMsg"),
        variant: "destructive",
      });
      return;
    }
    
    const url = await getGoogleAuthUrl(clientId, redirectUri);
    if (url) {
      setAuthUrl(url);
      setShowAuthDialog(true);
    } else {
      toast({
        title: t("settings.googleCalendar.authUrlError"),
        description: t("settings.googleCalendar.authUrlErrorMsg"),
        variant: "destructive",
      });
    }
  };
  
  // Scambia il codice di autorizzazione con il token
  const handleExchangeCode = () => {
    if (!authCode) {
      toast({
        title: t("settings.googleCalendar.missingCode"),
        description: t("settings.googleCalendar.missingCodeMsg"),
        variant: "destructive",
      });
      return;
    }
    
    setIsExchangingCode(true);
    exchangeCodeMutation.mutate(authCode);
  };
  
  // Salva le impostazioni
  const handleSaveSettings = () => {
    if (!clientId) {
      toast({
        title: t("settings.googleCalendar.missingClientId"),
        description: t("settings.googleCalendar.missingClientIdMsg"),
        variant: "destructive",
      });
      return;
    }
    
    const updatedSettings: GoogleCalendarSettings = {
      enabled: isEnabled,
      clientId,
      clientSecret: clientSecret || undefined,
      redirectUri,
      calendarId
    };
    
    saveSettingsMutation.mutate(updatedSettings);
  };
  
  // Se le impostazioni stanno ancora caricando
  if (isLoadingSettings) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("settings.googleCalendar.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.googleCalendar.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Se c'è stato un errore nel caricamento delle impostazioni
  if (settingsError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("settings.googleCalendar.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.googleCalendar.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            {t("settings.googleCalendar.loadError")}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("settings.googleCalendar.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.googleCalendar.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings">
            <TabsList className="mb-4">
              <TabsTrigger value="settings">
                {t("settings.googleCalendar.tabSettings")}
              </TabsTrigger>
              <TabsTrigger value="help">
                {t("settings.googleCalendar.tabHelp")}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-0.5">
                  <h3 className="font-medium text-base">
                    {t("settings.googleCalendar.enableIntegration")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.googleCalendar.enableIntegrationDescription")}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-id">
                      {t("settings.googleCalendar.clientId")}
                    </Label>
                    <Input
                      id="client-id"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="xxx.apps.googleusercontent.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client-secret">
                      {t("settings.googleCalendar.clientSecret")}
                    </Label>
                    <Input
                      id="client-secret"
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="GOCSPX-..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="redirect-uri">
                      {t("settings.googleCalendar.redirectUri")}
                    </Label>
                    <Input
                      id="redirect-uri"
                      value={redirectUri}
                      onChange={(e) => setRedirectUri(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="calendar-id">
                      {t("settings.googleCalendar.calendarId")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="calendar-id"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        placeholder="primary"
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleOpenCalendarSelector}
                        disabled={!settings?.refreshToken}
                        className="whitespace-nowrap"
                      >
                        {t("settings.googleCalendar.selectCalendar")}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.googleCalendar.calendarIdDescription", "Specifica l'ID del calendario Google a cui sincronizzare gli appuntamenti. 'primary' indica il calendario principale dell'account (es. zambelli.andrea.1973@gmail.com), oppure puoi usare l'indirizzo email di un calendario specifico.")}
                    </p>
                  </div>
                </div>
                
                {settings?.refreshToken && (
                  <div className="p-4 border rounded-md bg-green-50 dark:bg-green-950 mt-4 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span>{t("settings.googleCalendar.alreadyAuthorized")}</span>
                  </div>
                )}
                
                {!settings?.refreshToken && (
                  <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950 mt-4 flex items-start gap-2">
                    <X className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{t("settings.googleCalendar.notAuthorized")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.googleCalendar.needAuthorization")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="help">
              <div className="prose dark:prose-invert max-w-none">
                <h3>{t("settings.googleCalendar.helpTitle")}</h3>
                <ol>
                  <li>
                    <p>
                      {t("settings.googleCalendar.helpStep1")} 
                      <a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 inline-flex">
                        Google Cloud Console 
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep2")}</p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep3")}</p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep4")}</p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep5")}</p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep6")}</p>
                  </li>
                  <li>
                    <p>{t("settings.googleCalendar.helpStep7")}</p>
                  </li>
                </ol>
                <div className="bg-primary/10 p-4 rounded-md">
                  <p className="text-sm">
                    <strong>{t("settings.googleCalendar.note")}:</strong>{" "}
                    {t("settings.googleCalendar.helpNote")}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handleGenerateAuthUrl}
            disabled={saveSettingsMutation.isPending || !clientId || !redirectUri}
          >
            {t("settings.googleCalendar.authorizeBtn")}
          </Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("settings.saving")}
              </>
            ) : (
              t("settings.save")
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.googleCalendar.authDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.googleCalendar.authDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {authUrl && (
            <div className="flex flex-col space-y-4">
              <div className="p-4 border rounded-md bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("settings.googleCalendar.authInstructions")}
                </p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {t("settings.googleCalendar.openAuthPage")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="auth-code">
                  {t("settings.googleCalendar.authCodeLabel")}
                </Label>
                <Input
                  id="auth-code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder={t("settings.googleCalendar.authCodePlaceholder")}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(false)}
            >
              {t("settings.cancel")}
            </Button>
            <Button
              onClick={handleExchangeCode}
              disabled={!authCode || isExchangingCode || exchangeCodeMutation.isPending}
            >
              {(isExchangingCode || exchangeCodeMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.googleCalendar.verifying")}
                </>
              ) : (
                t("settings.googleCalendar.verifyCode")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCalendarSelector} onOpenChange={setShowCalendarSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.googleCalendar.selectCalendarTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.googleCalendar.selectCalendarDescription")}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingCalendars ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableCalendars && availableCalendars.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              <div 
                className="p-3 border rounded-md cursor-pointer hover:bg-secondary/50 flex items-center gap-2"
                onClick={() => handleSelectCalendar("primary")}
              >
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t("settings.googleCalendar.primaryCalendar")}</p>
                  <p className="text-sm text-muted-foreground">primary</p>
                </div>
              </div>
              
              {availableCalendars.map((calendar) => (
                <div 
                  key={calendar.id}
                  className="p-3 border rounded-md cursor-pointer hover:bg-secondary/50 flex items-center gap-2"
                  onClick={() => handleSelectCalendar(calendar.id)}
                >
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{calendar.summary}</p>
                    <p className="text-sm text-muted-foreground">{calendar.id}</p>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground">{calendar.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950">
              <p>{t("settings.googleCalendar.noCalendarsFound")}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarSelector(false)}>
              {t("settings.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}