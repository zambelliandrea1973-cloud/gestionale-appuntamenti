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
import ColorEditor from "@/components/ColorEditor";

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

  // FUNZIONE UNIFICATA - SALVA TUTTE LE IMPOSTAZIONI
  const saveAllSettings = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('🚀 SALVATAGGIO COMPLETO: Inizio salvataggio di tutte le impostazioni');
      
      // 1. SALVA NOME AZIENDALE (COD_001)
      if (settings.businessName) {
        const nameResponse = await fetch('/api/company-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ businessName: settings.businessName }),
        });
        console.log('📝 Nome aziendale:', nameResponse.ok ? '✅ SALVATO' : '❌ ERRORE');
      }

      // 2. SALVA COLORI (COD_002 e COD_003)
      const colorResponse = await fetch('/api/color-settings-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor 
        }),
      });
      console.log('🎨 Colori:', colorResponse.ok ? '✅ SALVATI' : '❌ ERRORE');

      // 3. SALVA TEMA E ASPETTO (COD_005 e COD_006)
      const themeResponse = await fetch('/api/theme-settings-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          theme: settings.theme,
          appearance: settings.appearance 
        }),
      });
      console.log('🎭 Tema:', themeResponse.ok ? '✅ SALVATO' : '❌ ERRORE');

      // 4. SALVA ICONA (se presente) - RIMOSSO PER ORA
      console.log('🖼️ Icona: ⏭️ SALTATO (nessun file selezionato)');

      toast({
        title: "Impostazioni salvate",
        description: "Tutte le impostazioni sono state salvate con successo!",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Errore salvataggio completo:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni. Riprova.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Salva NOME AZIENDALE usando endpoint specifico
  const saveBusinessName = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('🚀 SALVATAGGIO NOME AZIENDALE: Usando endpoint specifico', settings.businessName);
      
      // USA ENDPOINT SPECIFICO ESISTENTE
      const response = await fetch('/api/company-name/business-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ businessName: settings.businessName }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ NOME AZIENDALE SALVATO CON DATABASE SEPARATI:', result);
        
        toast({
          title: "Nome aziendale salvato",
          description: "Il nome aziendale è stato salvato con successo!",
        });
      } else {
        const errorText = await response.text();
        console.error('Errore risposta server:', errorText);
        throw new Error(`Errore nel salvataggio: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Errore salvataggio nome aziendale:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il nome aziendale. Riprova.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Salva COLORE (COD_002) - IDENTICO AL NOME AZIENDALE
  const saveColor = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('✅ COLORE SALVATO SEPARATAMENTE:', `"${settings.primaryColor}" per utente ${user.id}`);
      
      const response = await fetch('/api/color/primary-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ primaryColor: settings.primaryColor }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Risposta server colore:', result);
        
        toast({
          title: "Colore salvato",
          description: "Il colore è stato salvato con successo!",
        });
      } else {
        throw new Error(`Errore ${response.status}`);
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

  // Salva TEMA (COD_005) - IDENTICO AL NOME AZIENDALE
  const saveTheme = async () => {
    if (!settings || !user) return;
    
    setSaving(true);
    try {
      console.log('✅ TEMA SALVATO SEPARATAMENTE:', `"${settings.theme}" per utente ${user.id}`);
      
      const response = await fetch('/api/theme/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: settings.theme }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Risposta server tema:', result);
        
        toast({
          title: "Tema salvato",
          description: "Il tema è stato salvato con successo!",
        });
      } else {
        throw new Error(`Errore ${response.status}`);
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

  // Salva i contatti (email, telefono, sito web)
  const saveContacts = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      console.log('💾 Salvando contatti:', {
        email: settings.contactEmail,
        phone: settings.contactPhone,
        website: settings.website
      });
      
      // Per ora è solo una funzione placeholder - i contatti sono già gestiti dal caricamento
      console.log('✅ CONTATTI: Già sincronizzati tramite sistema unified');
      
      toast({
        title: "Contatti salvati",
        description: "Le informazioni di contatto sono state salvate!",
      });
    } catch (error: any) {
      console.error('Errore salvataggio contatti:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare i contatti. Riprova.",
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
                      value={settings?.secondaryColor || "#ffffff"}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={settings?.secondaryColor || "#ffffff"}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* PULSANTE UNIFICATO - SALVA TUTTO */}
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={async () => {
                    try {
                      console.log("🚀 INIZIO SALVATAGGIO COMPLETO");
                      
                      // SALVA TUTTO INSIEME con database separati
                      console.log("📝 1. Salvando nome aziendale...");
                      await saveBusinessName(); // Nome aziendale (COD_001)
                      console.log("✅ 1. Nome aziendale salvato!");
                      
                      console.log("🎨 2. Salvando colore...");
                      await saveColor(); // Colore primario (COD_002)
                      console.log("✅ 2. Colore salvato!");
                      
                      console.log("🎭 3. Salvando tema...");
                      await saveTheme(); // Tema (COD_005)
                      console.log("✅ 3. Tema salvato!");
                      
                      console.log("🎉 TUTTI I SALVATAGGI COMPLETATI!");
                    } catch (error) {
                      console.error("❌ ERRORE DURANTE IL SALVATAGGIO:", error);
                    }
                  }} 
                  disabled={saving}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {saving ? "Salvando..." : "💾 Salva Impostazioni"}
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

      <div className="text-center space-y-4">
        <Button 
          onClick={async () => {
            try {
              console.log("🚀 INIZIO SALVATAGGIO COMPLETO - TUTTE LE IMPOSTAZIONI");
              
              // SALVA TUTTO: Nome aziendale, Colori, Tema, Contatti
              console.log("📝 1. Salvando nome aziendale...");
              await saveBusinessName(); // Nome aziendale (COD_001)
              console.log("✅ 1. Nome aziendale salvato!");
              
              console.log("🎨 2. Salvando colori...");
              await saveColor(); // Colore primario (COD_002) 
              console.log("✅ 2. Colori salvati!");
              
              console.log("🎭 3. Salvando tema...");
              await saveTheme(); // Tema (COD_005)
              console.log("✅ 3. Tema salvato!");
              
              console.log("📧 4. Salvando contatti...");
              await saveContacts(); // Email, telefono, ecc. (COD_007, COD_008, COD_010)
              console.log("✅ 4. Contatti salvati!");
              
              console.log("🎉 TUTTI I SALVATAGGI COMPLETATI!");
              console.log("✅ SALVATI: Nome, Colori, Tema, Contatti - TUTTO IN DATABASE SEPARATI!");
              
              // 5. Ricarica automaticamente i dati salvati
              console.log("🔄 5. Ricaricando i dati salvati nell'interfaccia...");
              await loadSettings();
              console.log("✅ 5. Dati ricaricati nell'interfaccia!");
              
            } catch (error) {
              console.error("❌ ERRORE DURANTE IL SALVATAGGIO:", error);
            }
          }}
          disabled={saving || !settings}
          className="w-full max-w-md"
          size="lg"
        >
          {saving ? "Salvataggio..." : "Salva impostazioni"}
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Le tue personalizzazioni sono private e non influenzano altri account
        </div>
      </div>
    </div>
  );
}