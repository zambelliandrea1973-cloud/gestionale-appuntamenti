import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ColorSettings {
  primaryColor: string;
  secondaryColor: string;
}

export default function ColorEditor() {
  const [settings, setSettings] = useState<ColorSettings>({
    primaryColor: '#3f51b5',
    secondaryColor: '#ffffff'
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carica le impostazioni attuali dei colori
  useEffect(() => {
    loadColorSettings();
  }, []);

  const loadColorSettings = async () => {
    try {
      const response = await fetch('/api/client-app-info', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎨 COLORI CARICATI:', data.primaryColor, data.secondaryColor);
        setSettings({
          primaryColor: data.primaryColor || '#3f51b5',
          secondaryColor: data.secondaryColor || '#ffffff'
        });
      }
    } catch (error) {
      console.error('Errore caricamento colori:', error);
    }
  };

  const saveSettings = async () => {
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // USA L'API REALE CON DATABASE SEPARATI PER UTENTE - STESSO SISTEMA DEL NOME AZIENDALE
      const response = await fetch('/api/color-settings-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          primaryColor: settings.primaryColor
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ COLORE SALVATO SEPARATAMENTE: "${settings.primaryColor}" per utente ${result.userId}`);
        setSaveSuccess(true);
        
        // 🔄 REFRESH DELLA PAGINA per mostrare immediatamente il nuovo colore
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        toast({
          title: "Colore salvato",
          description: "Il colore primario è stato salvato con successo.",
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
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Colore Primario</Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={settings.primaryColor}
              onChange={handleInputChange}
              className="w-20"
            />
            <Input
              name="primaryColor"
              value={settings.primaryColor}
              onChange={handleInputChange}
              placeholder="#3f51b5"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Colore Secondario</Label>
          <div className="flex gap-2">
            <Input
              id="secondaryColor"
              name="secondaryColor"
              type="color"
              value={settings.secondaryColor}
              onChange={handleInputChange}
              className="w-20"
            />
            <Input
              name="secondaryColor"
              value={settings.secondaryColor}
              onChange={handleInputChange}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* PULSANTE SPECIFICO - STESSO SISTEMA DEL NOME AZIENDALE */}
      <div className="pt-4 border-t">
        <Button 
          onClick={saveSettings} 
          className="w-full"
        >
          💾 Salva Colori
        </Button>
        
        {saveSuccess && (
          <div className="mt-2 text-sm text-green-600">
            ✅ Colori salvati con successo!
          </div>
        )}
        
        {saveError && (
          <div className="mt-2 text-sm text-red-600">
            ❌ {saveError}
          </div>
        )}
      </div>
    </div>
  );
}