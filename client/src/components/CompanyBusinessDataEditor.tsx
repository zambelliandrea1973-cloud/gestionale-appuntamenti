import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const tRef = useRef(t);
  const toastRef = useRef(toast);
  useEffect(() => {
    tRef.current = t;
    toastRef.current = toast;
  }, [t, toast]);

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
        toastRef.current({
          title: tRef.current('common.error'),
          description: tRef.current('companyBusinessData.loadErrorDescription'),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, []);

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
          title: t('companyBusinessData.saveSuccessTitle'),
          description: t('companyBusinessData.saveSuccessDescription'),
        });
        console.log('✅ BUSINESS DATA: Dati salvati:', businessData);
      } else {
        throw new Error('save error');
      }
    } catch (error) {
      console.error('❌ Errore salvataggio dati aziendali:', error);
      toast({
        title: t('common.error'),
        description: t('companyBusinessData.saveErrorDescription'),
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
          <span>{t('companyBusinessData.loadingData')}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {t('companyBusinessData.cardTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('companyBusinessData.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t('companyBusinessData.companyNameLabel')}
            </Label>
            <Input
              id="companyName"
              value={businessData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder={t('companyBusinessData.companyNamePlaceholder')}
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('companyBusinessData.emailLabel')}
            </Label>
            <Input
              id="email"
              type="email"
              value={businessData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder={t('companyBusinessData.emailPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('companyBusinessData.addressLabel')}
            </Label>
            <Input
              id="address"
              value={businessData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder={t('companyBusinessData.addressPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('companyBusinessData.phoneLabel')}</Label>
            <Input
              id="phone"
              value={businessData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder={t('companyBusinessData.phonePlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">{t('companyBusinessData.cityLabel')}</Label>
            <Input
              id="city"
              value={businessData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder={t('companyBusinessData.cityPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">{t('companyBusinessData.postalCodeLabel')}</Label>
            <Input
              id="postalCode"
              value={businessData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder={t('companyBusinessData.postalCodePlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vatNumber" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('companyBusinessData.vatNumberLabel')}
            </Label>
            <Input
              id="vatNumber"
              value={businessData.vatNumber}
              onChange={(e) => handleChange('vatNumber', e.target.value)}
              placeholder={t('companyBusinessData.vatNumberPlaceholder')}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalCode" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('companyBusinessData.fiscalCodeLabel')}
            </Label>
            <Input
              id="fiscalCode"
              value={businessData.fiscalCode}
              onChange={(e) => handleChange('fiscalCode', e.target.value)}
              placeholder={t('companyBusinessData.fiscalCodePlaceholder')}
              className="font-mono"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t('companyBusinessData.saving') : t('companyBusinessData.saveButton')}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <Trans
              i18nKey="companyBusinessData.legalNote"
              components={[<strong />]}
            />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
