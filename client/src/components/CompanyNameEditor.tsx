import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, AlertCircle, Type, Bold, Italic, Underline } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CompanyNameSettings {
  name: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: string;
  enabled: boolean;
}

export default function CompanyNameEditor() {
  const [settings, setSettings] = useState<CompanyNameSettings>({
    name: '',
    fontSize: 24,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    color: '#000000',
    enabled: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carica le impostazioni del nome aziendale all'avvio
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      console.log('🎯 FRONTEND: Usando /api/client-app-info che FUNZIONA GIÀ');
      // USA L'API CHE FUNZIONA GIÀ PER I DATABASE SEPARATI - CON CACHE BUSTING
      const response = await fetch(`/api/client-app-info?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include'
      });
      console.log('🎯 FRONTEND: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DATI COMPLETI RICEVUTI:', JSON.stringify(data, null, 2));
        setSettings({
          name: data.appName || '',
          fontSize: 24,
          fontFamily: 'Arial',
          fontStyle: 'normal',
          color: '#000000',
          enabled: true
        });
        console.log(`✅ IMPOSTAZIONI CARICATE: businessName="${data.businessName}", appName="${data.appName}"`);
      } else {
        console.error('Errore nel caricamento delle impostazioni');
      }
    } catch (error) {
      console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
      // In caso di errore, mantieni le impostazioni predefinite
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // USA L'API REALE CON DATABASE SEPARATI PER UTENTE
      const response = await fetch('/api/company-settings-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          businessName: settings.name
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ NOME SALVATO SEPARATAMENTE: "${settings.name}" per utente ${result.userId}`);
        setSaveSuccess(true);
        
        // 🔄 REFRESH DELLA HOME PAGE per mostrare immediatamente il nuovo nome
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        toast({
          title: "Impostazioni salvate",
          description: "Le impostazioni del nome aziendale sono state salvate con successo.",
          variant: "default",
        });
      } else {
        const errorText = await response.text();
        console.error('Errore risposta server:', errorText);
        throw new Error(`Errore nel salvataggio: ${response.status}`);
      }
    } catch (error: any) {
      setSaveError(error.message || 'Si è verificato un errore durante il salvataggio');
      toast({
        title: "Errore",
        description: error.message || 'Si è verificato un errore durante il salvataggio',
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, fontSize: value[0] }));
  };

  const handleToggleEnabled = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  // Stile dinamico per l'anteprima basato sulle impostazioni correnti
  const previewStyle = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    fontStyle: settings.fontStyle,
    color: settings.color,
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: '16px',
    opacity: settings.enabled ? 1 : 0.5
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Nome Aziendale</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={handleToggleEnabled}
        >
          {settings.enabled ? 'Disattiva' : 'Attiva'}
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Personalizza il nome aziendale che verrà mostrato nell'app cliente. Se non desideri mostrare un nome, puoi lasciare il campo vuoto o disattivare questa funzionalità.
      </p>

      {saveSuccess && (
        <Alert className="mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>Salvato</AlertTitle>
          <AlertDescription>
            Il nome aziendale è stato aggiornato con successo. Le modifiche saranno visibili nell'app cliente.
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

      <Card className={settings.enabled ? "" : "opacity-60"}>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Anteprima */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Anteprima</Label>
              <div style={previewStyle}>
                {settings.name ? settings.name : 
                  <span className="text-gray-400 italic">Inserisci il nome aziendale</span>
                }
              </div>
            </div>
            
            {/* Nome aziendale */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm font-medium">Nome aziendale</Label>
              <Input
                id="company-name"
                name="name"
                placeholder="Inserisci il nome aziendale"
                value={settings.name}
                onChange={handleInputChange}
                disabled={!settings.enabled}
              />
            </div>

            {/* Dimensione font */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Dimensione testo</Label>
                <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
              </div>
              <Slider
                defaultValue={[settings.fontSize]}
                min={12}
                max={48}
                step={1}
                onValueChange={handleSliderChange}
                disabled={!settings.enabled}
              />
            </div>

            {/* Tipo di font */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo di carattere</Label>
              <Select 
                value={settings.fontFamily} 
                onValueChange={(value) => handleSelectChange('fontFamily', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona carattere" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Tahoma">Tahoma</SelectItem>
                  <SelectItem value="Palatino Linotype">Palatino Linotype</SelectItem>
                  <SelectItem value="Lucida Sans Unicode">Lucida Sans Unicode</SelectItem>
                  <SelectItem value="Garamond">Garamond</SelectItem>
                  <SelectItem value="Bookman Old Style">Bookman Old Style</SelectItem>
                  <SelectItem value="Century Gothic">Century Gothic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stile font */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Stile testo</Label>
              <Select 
                value={settings.fontStyle} 
                onValueChange={(value) => handleSelectChange('fontStyle', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="italic">Corsivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
              
            {/* Colore */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Colore</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      disabled={!settings.enabled}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: settings.color }}
                      />
                      <span>{settings.color}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        '#000000', '#0000FF', '#FF0000', '#008000', '#800080',
                        '#FFA500', '#A52A2A', '#808080', '#4682B4', '#006400',
                        '#8B0000', '#483D8B', '#2F4F4F', '#9932CC', '#FF1493'
                      ].map(color => (
                        <Button
                          key={color}
                          variant="outline"
                          className="w-8 h-8 p-0"
                          style={{ backgroundColor: color }}
                          onClick={() => handleSelectChange('color', color)}
                        />
                      ))}
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="custom-color">Colore personalizzato</Label>
                      <Input
                        id="custom-color"
                        name="color"
                        type="color"
                        value={settings.color}
                        onChange={handleInputChange}
                        className="h-10 mt-1"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button onClick={saveSettings} className="w-full bg-green-600 hover:bg-green-700" disabled={!settings.enabled}>
                🔥 PULSANTE VERDE
              </Button>
              
              <Button 
                onClick={async () => {
                  try {
                    alert("💾 PULSANTE BLU CLICCATO!");
                    console.log("💾 SECONDO PULSANTE FUNZIONA!");
                  } catch (error) {
                    console.error("❌ ERRORE:", error);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={!settings.enabled}
              >
                💾 PULSANTE BLU
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground mt-2">
        Nota: Il nome aziendale apparirà nell'app cliente insieme all'icona che hai impostato.
      </div>
    </div>
  );
}