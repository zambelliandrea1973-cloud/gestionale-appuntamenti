import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building, MapPin, Phone, FileText, Save, Loader2 } from "lucide-react";

interface BusinessData {
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  vatNumber: string;
  fiscalCode: string;
  phone: string;
  email: string;
}

export default function CompanyBusinessDataEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData>({
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    vatNumber: '',
    fiscalCode: '',
    phone: '',
    email: ''
  });

  // Carica dati aziendali esistenti
  useEffect(() => {
    const loadBusinessData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/company-business-data', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBusinessData(prev => ({ ...prev, ...data }));
          console.log('🏢 BUSINESS DATA: Dati aziendali caricati:', data);
        }
      } catch (error) {
        console.error('❌ Errore caricamento dati aziendali:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati aziendali",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/company-business-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData)
      });

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Dati aziendali salvati correttamente"
        });
        console.log('✅ BUSINESS DATA: Dati salvati:', businessData);
      } else {
        throw new Error('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('❌ Errore salvataggio dati aziendali:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare i dati aziendali",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof BusinessData, value: string) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Caricamento dati aziendali...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Dati Aziendali Professionista
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Questi dati verranno inseriti automaticamente in tutte le fatture emesse per garantire la conformità legale
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Ragione Sociale / Nome
            </Label>
            <Input
              id="companyName"
              value={businessData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="es. Studio Medico Rossi"
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Email Aziendale
            </Label>
            <Input
              id="email"
              type="email"
              value={businessData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="info@studiomedico.it"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Indirizzo
            </Label>
            <Input
              id="address"
              value={businessData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Via Roma, 123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              value={businessData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+39 123 456 7890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Città</Label>
            <Input
              id="city"
              value={businessData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Milano"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">CAP</Label>
            <Input
              id="postalCode"
              value={businessData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder="20121"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vatNumber" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Partita IVA
            </Label>
            <Input
              id="vatNumber"
              value={businessData.vatNumber}
              onChange={(e) => handleChange('vatNumber', e.target.value)}
              placeholder="IT12345678901"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalCode" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Codice Fiscale
            </Label>
            <Input
              id="fiscalCode"
              value={businessData.fiscalCode}
              onChange={(e) => handleChange('fiscalCode', e.target.value)}
              placeholder="RSSMRA80A01H501Z"
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvataggio...' : 'Salva Dati Aziendali'}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Nota Legale:</strong> Questi dati sono essenziali per emettere fatture fiscalmente valide in Italia. 
            Assicurati che tutti i campi siano compilati correttamente e aggiornati.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}