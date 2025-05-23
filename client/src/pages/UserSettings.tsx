import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Palette, Mail, Phone, Building, Globe } from "lucide-react";

interface UserSettings {
  id?: number;
  userId: number;
  businessName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: string;
  appearance?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPhone2?: string;
  website?: string;
  address?: string;
  instagramHandle?: string;
  facebookPage?: string;
  linkedinProfile?: string;
}

export default function UserSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carica le impostazioni dell'utente con database separati
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        console.log('🎯 CARICAMENTO IMPOSTAZIONI: Usando /api/client-app-info che funziona con database separati');
        // USA L'ENDPOINT CHE FUNZIONA GIÀ PER I DATABASE SEPARATI
        const response = await fetch(`/api/client-app-info?t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ IMPOSTAZIONI SEPARATE CARICATE:', data);
          
          // Mappa i dati nel formato che si aspetta il componente
          const mappedSettings: UserSettings = {
            userId: user?.id || 0,
            businessName: data.businessName || '',
            primaryColor: data.primaryColor || '#3f51b5',
            secondaryColor: data.secondaryColor || '#ffffff',
            theme: data.theme || 'professional',
            appearance: data.appearance || 'light',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            website: data.website || ''
          };
          
          setSettings(mappedSettings);
        } else {
          console.error('Errore nel caricamento delle impostazioni separate');
        }
      } catch (error) {
        console.error('Errore nel caricamento delle impostazioni:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserSettings();
    }
  }, [user]);

  // Salva COLORE usando endpoint specifico (stesso sistema del nome aziendale)
  const saveColor = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('🚀 SALVATAGGIO COLORE: Usando endpoint specifico', settings.primaryColor);
      
      // USA ENDPOINT SPECIFICO COME PER IL NOME AZIENDALE
      const response = await fetch('/api/color-settings-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ primaryColor: settings.primaryColor }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ COLORE SALVATO CON DATABASE SEPARATI:', result);
        
        toast({
          title: "Colore salvato",
          description: "Il colore primario è stato salvato con successo!",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('Errore risposta server:', errorText);
        throw new Error(`Errore nel salvataggio: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Errore salvataggio colore:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il colore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Salva TEMA usando endpoint specifico (stesso sistema del nome aziendale)
  const saveTheme = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('🚀 SALVATAGGIO TEMA: Usando endpoint specifico', settings.theme, settings.appearance);
      
      // USA ENDPOINT SPECIFICO COME PER IL NOME AZIENDALE
      const response = await fetch('/api/theme-settings-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ theme: settings.theme, appearance: settings.appearance }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ TEMA SALVATO CON DATABASE SEPARATI:', result);
        
        toast({
          title: "Tema salvato",
          description: "Il tema è stato salvato con successo!",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('Errore risposta server:', errorText);
        throw new Error(`Errore nel salvataggio: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Errore salvataggio tema:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il tema. Riprova.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Aggiorna un campo delle impostazioni
  const updateSetting = (field: keyof UserSettings, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p>Caricamento impostazioni...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Impostazioni Personalizzate</h1>
          <p className="text-muted-foreground">
            Personalizza la tua esperienza e configura il branding del tuo account
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.type === 'admin' ? 'Amministratore' : 
           user?.type === 'staff' ? 'Staff' : 'Cliente Premium'}
        </Badge>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Mail className="h-4 w-4 mr-2" />
            Contatti
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Settings className="h-4 w-4 mr-2" />
            Aspetto
          </TabsTrigger>
          <TabsTrigger value="business">
            <Building className="h-4 w-4 mr-2" />
            Attività
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identità del Brand</CardTitle>
              <CardDescription>
                Personalizza il nome e l'aspetto della tua attività
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome dell'Attività</Label>
                <Input
                  id="businessName"
                  value={settings?.businessName || ""}
                  onChange={(e) => updateSetting('businessName', e.target.value)}
                  placeholder="Inserisci il nome della tua attività"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL Logo</Label>
                <Input
                  id="logoUrl"
                  value={settings?.logoUrl || ""}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Colore Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings?.primaryColor || "#3f51b5"}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={settings?.primaryColor || "#3f51b5"}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      placeholder="#3f51b5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Colore Secondario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings?.secondaryColor || "#f50057"}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={settings?.secondaryColor || "#f50057"}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      placeholder="#f50057"
                    />
                  </div>
                </div>
              </div>

              {/* PULSANTE SPECIFICO PER COLORI - STESSO SISTEMA DEL NOME AZIENDALE */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={saveColor} 
                  disabled={saving || !settings}
                  className="w-full"
                >
                  {saving ? "Salvataggio colori..." : "💾 Salva Colori"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni di Contatto</CardTitle>
              <CardDescription>
                Configura le tue informazioni di contatto personalizzate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email di Contatto</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings?.contactEmail || ""}
                    onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    placeholder="info@tuaattivita.it"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefono Principale</Label>
                  <Input
                    id="contactPhone"
                    value={settings?.contactPhone || ""}
                    onChange={(e) => updateSetting('contactPhone', e.target.value)}
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone2">Telefono Secondario</Label>
                  <Input
                    id="contactPhone2"
                    value={settings?.contactPhone2 || ""}
                    onChange={(e) => updateSetting('contactPhone2', e.target.value)}
                    placeholder="+39 098 765 4321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Sito Web</Label>
                  <Input
                    id="website"
                    value={settings?.website || ""}
                    onChange={(e) => updateSetting('website', e.target.value)}
                    placeholder="https://www.tuaattivita.it"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  value={settings?.address || ""}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder="Via Roma 123, 00100 Roma"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aspetto dell'Interfaccia</CardTitle>
              <CardDescription>
                Scegli il tema e l'aspetto dell'applicazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={settings?.theme || "professional"}
                    onValueChange={(value) => updateSetting('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professionale</SelectItem>
                      <SelectItem value="vibrant">Vibrante</SelectItem>
                      <SelectItem value="tint">Tinta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appearance">Modalità</Label>
                  <Select
                    value={settings?.appearance || "light"}
                    onValueChange={(value) => updateSetting('appearance', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona modalità" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Chiaro</SelectItem>
                      <SelectItem value="dark">Scuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>
                Collega i tuoi profili social per una maggiore visibilità
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">Instagram</Label>
                  <Input
                    id="instagramHandle"
                    value={settings?.instagramHandle || ""}
                    onChange={(e) => updateSetting('instagramHandle', e.target.value)}
                    placeholder="@tuaattivita"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookPage">Facebook</Label>
                  <Input
                    id="facebookPage"
                    value={settings?.facebookPage || ""}
                    onChange={(e) => updateSetting('facebookPage', e.target.value)}
                    placeholder="https://facebook.com/tuaattivita"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinProfile">LinkedIn</Label>
                  <Input
                    id="linkedinProfile"
                    value={settings?.linkedinProfile || ""}
                    onChange={(e) => updateSetting('linkedinProfile', e.target.value)}
                    placeholder="https://linkedin.com/company/tuaattivita"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="text-center">
        <div className="text-sm text-muted-foreground">
          Le tue personalizzazioni sono private e non influenzano altri account<br/>
          <strong>Usa i pulsanti "💾 Salva" specifici in ogni sezione</strong>
        </div>
      </div>
    </div>
  );
}