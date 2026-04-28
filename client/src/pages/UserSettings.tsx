// @ts-nocheck
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Settings, Palette, Mail, Phone, Building, Globe, Hash } from "lucide-react";
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
  const [assignmentCode, setAssignmentCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [showCodeChangeDialog, setShowCodeChangeDialog] = useState(false);
  const [originalAssignmentCode, setOriginalAssignmentCode] = useState('');

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const response = await fetch(`/api/client-app-info?t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();

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
          console.error('Failed to load separate settings');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadAssignmentCode = async () => {
      if (user?.type !== 'staff' && user?.type !== 'admin') return;
      try {
        const response = await fetch(`/api/user-with-license`, {
          method: 'GET',
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.assignmentCode) {
            setAssignmentCode(data.assignmentCode);
            setOriginalAssignmentCode(data.assignmentCode);
          }
        }
      } catch (error) {
        console.error('Failed to load assignment code:', error);
      }
    };

    if (user) {
      loadUserSettings();
      loadAssignmentCode();
    }
  }, [user]);

  const saveAllSettings = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      if (settings.businessName) {
        await fetch('/api/company-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ businessName: settings.businessName }),
        });
      }

      await fetch('/api/color-settings-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor
        }),
      });

      await fetch('/api/theme-settings-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          theme: settings.theme,
          appearance: settings.appearance
        }),
      });

      toast({
        title: t('userSettings.toast.savedTitle'),
        description: t('userSettings.toast.savedDesc'),
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Failed to save full settings:', error);
      toast({
        title: t("common.error"),
        description: t('userSettings.toast.saveErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessName = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const response = await fetch('/api/company-name/business-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ businessName: settings.businessName }),
      });

      if (response.ok) {
        await response.json();

        toast({
          title: t('userSettings.toast.businessNameSavedTitle'),
          description: t('userSettings.toast.businessNameSavedDesc'),
        });
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Save failed: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Failed to save business name:', error);
      toast({
        title: t("common.error"),
        description: t('userSettings.toast.businessNameErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveColor = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const response = await fetch('/api/color/primary-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ primaryColor: settings.primaryColor }),
      });

      if (response.ok) {
        await response.json();

        toast({
          title: t('userSettings.toast.colorSavedTitle'),
          description: t('userSettings.toast.colorSavedDesc'),
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Failed to save color:', error);
      toast({
        title: t("common.error"),
        description: t('userSettings.toast.colorErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const response = await fetch('/api/theme/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: settings.theme }),
      });

      if (response.ok) {
        await response.json();

        toast({
          title: t('userSettings.toast.themeSavedTitle'),
          description: t('userSettings.toast.themeSavedDesc'),
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Failed to save theme:', error);
      toast({
        title: t("common.error"),
        description: t('userSettings.toast.themeErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveContacts = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      toast({
        title: t('userSettings.toast.contactsSavedTitle'),
        description: t('userSettings.toast.contactsSavedDesc'),
      });
    } catch (error: any) {
      console.error('Failed to save contacts:', error);
      toast({
        title: t("common.error"),
        description: t('userSettings.toast.contactsErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const performSaveAssignmentCode = async () => {
    const code = assignmentCode.trim();
    setSavingCode(true);
    try {
      const response = await fetch('/api/user/assignment-code', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignmentCode: code }),
      });
      if (response.ok) {
        const data = await response.json();
        setAssignmentCode(data.assignmentCode);
        setOriginalAssignmentCode(data.assignmentCode);
        queryClient.invalidateQueries({ queryKey: ['/api/clients/next-code'] });
        toast({
          title: t('userSettings.toast.assignmentCodeSavedTitle'),
          description: t('userSettings.toast.assignmentCodeSavedDesc'),
        });
      } else {
        const isDuplicate = response.status === 409;
        toast({
          title: t('common.error'),
          description: isDuplicate
            ? t('userSettings.toast.assignmentCodeDuplicate')
            : t('userSettings.toast.assignmentCodeErrorDesc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save assignment code:', error);
      toast({
        title: t('common.error'),
        description: t('userSettings.toast.assignmentCodeErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setSavingCode(false);
    }
  };

  const saveAssignmentCode = async () => {
    if (!user) return;
    const code = assignmentCode.trim();
    if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code)) {
      toast({
        title: t('common.error'),
        description: t('userSettings.toast.assignmentCodeInvalid'),
        variant: 'destructive',
      });
      return;
    }
    if (originalAssignmentCode && originalAssignmentCode !== code) {
      setShowCodeChangeDialog(true);
      return;
    }
    await performSaveAssignmentCode();
  };

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
            <p>{t('userSettings.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("userSettings.title")}</h1>
          <p className="text-muted-foreground">
            {t('userSettings.subtitle')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.type === 'admin' ? t('userSettings.roles.admin') :
           user?.type === 'staff' ? t('userSettings.roles.staff') : t('userSettings.roles.customer')}
        </Badge>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            {t('userSettings.tabs.branding')}
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Mail className="h-4 w-4 mr-2" />
            {t('userSettings.tabs.contact')}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Settings className="h-4 w-4 mr-2" />
            {t('userSettings.tabs.appearance')}
          </TabsTrigger>
          <TabsTrigger value="business">
            <Building className="h-4 w-4 mr-2" />
            {t('userSettings.tabs.business')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          {(user?.type === 'staff' || user?.type === 'admin') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  {t('userSettings.branding.assignmentCodeLabel')}
                </CardTitle>
                <CardDescription>
                  {t('userSettings.branding.assignmentCodeDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="assignmentCode">{t('userSettings.branding.assignmentCodeLabel')}</Label>
                    <Input
                      id="assignmentCode"
                      value={assignmentCode}
                      onChange={(e) => setAssignmentCode(e.target.value.toUpperCase())}
                      placeholder={t('userSettings.branding.assignmentCodePlaceholder')}
                      maxLength={10}
                      className="font-mono text-base uppercase"
                    />
                  </div>
                  <Button
                    onClick={saveAssignmentCode}
                    disabled={savingCode}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {savingCode
                      ? t('userSettings.branding.assignmentCodeSaving')
                      : t('userSettings.branding.assignmentCodeSave')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.branding.cardTitle')}</CardTitle>
              <CardDescription>
                {t('userSettings.branding.cardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">{t('userSettings.branding.businessNameLabel')}</Label>
                <Input
                  id="businessName"
                  value={settings?.businessName || ""}
                  onChange={(e) => updateSetting('businessName', e.target.value)}
                  placeholder={t('userSettings.branding.businessNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">{t('userSettings.branding.logoUrlLabel')}</Label>
                <Input
                  id="logoUrl"
                  value={settings?.logoUrl || ""}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                  placeholder={t('userSettings.branding.logoUrlPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">{t('userSettings.branding.primaryColorLabel')}</Label>
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
                  <Label htmlFor="secondaryColor">{t('userSettings.branding.secondaryColorLabel')}</Label>
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

              <div className="flex gap-4 justify-center mt-6">
                <Button
                  onClick={async () => {
                    try {
                      await saveBusinessName();
                      await saveColor();
                      await saveTheme();
                    } catch (error) {
                      console.error("Failed to save:", error);
                    }
                  }}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {saving
                    ? t('userSettings.branding.savingLabel')
                    : t('userSettings.branding.greenButton')}
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const newCode = `COD_${Math.floor(Math.random() * 900) + 100}`;
                      console.log(`Code generated: ${newCode}`);
                    } catch (error) {
                      console.error("Error:", error);
                    }
                  }}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {saving
                    ? t('userSettings.branding.creatingLabel')
                    : t('userSettings.branding.blueButton')}
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.contact.cardTitle')}</CardTitle>
              <CardDescription>
                {t('userSettings.contact.cardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t('userSettings.contact.emailLabel')}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings?.contactEmail || ""}
                    onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    placeholder={t('userSettings.contact.emailPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{t('userSettings.contact.phone1Label')}</Label>
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
                  <Label htmlFor="contactPhone2">{t('userSettings.contact.phone2Label')}</Label>
                  <Input
                    id="contactPhone2"
                    value={settings?.contactPhone2 || ""}
                    onChange={(e) => updateSetting('contactPhone2', e.target.value)}
                    placeholder="+39 098 765 4321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">{t('userSettings.contact.websiteLabel')}</Label>
                  <Input
                    id="website"
                    value={settings?.website || ""}
                    onChange={(e) => updateSetting('website', e.target.value)}
                    placeholder={t('userSettings.contact.websitePlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('userSettings.contact.addressLabel')}</Label>
                <Input
                  id="address"
                  value={settings?.address || ""}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder={t('userSettings.contact.addressPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.appearance.cardTitle')}</CardTitle>
              <CardDescription>
                {t('userSettings.appearance.cardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">{t('userSettings.appearance.themeLabel')}</Label>
                  <Select
                    value={settings?.theme || "professional"}
                    onValueChange={(value) => updateSetting('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('userSettings.appearance.themePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">{t('userSettings.appearance.themeProfessional')}</SelectItem>
                      <SelectItem value="vibrant">{t('userSettings.appearance.themeVibrant')}</SelectItem>
                      <SelectItem value="tint">{t('userSettings.appearance.themeTint')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appearance">{t('userSettings.appearance.modeLabel')}</Label>
                  <Select
                    value={settings?.appearance || "light"}
                    onValueChange={(value) => updateSetting('appearance', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('userSettings.appearance.modePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('userSettings.appearance.modeLight')}</SelectItem>
                      <SelectItem value="dark">{t('userSettings.appearance.modeDark')}</SelectItem>
                      <SelectItem value="system">{t('userSettings.appearance.modeSystem')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 justify-center mt-6 pt-4 border-t">
                <Button
                  onClick={async () => {
                    try {
                      await saveTheme();
                    } catch (error) {
                      console.error("Error:", error);
                    }
                  }}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {saving
                    ? t('userSettings.branding.savingLabel')
                    : t('userSettings.branding.greenButton')}
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      const newCode = `COD_${Math.floor(Math.random() * 900) + 100}`;
                      console.log(`Code: ${newCode}`);
                    } catch (error) {
                      console.error("Error:", error);
                    }
                  }}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {saving
                    ? t('userSettings.branding.creatingLabel')
                    : t('userSettings.branding.blueButton')}
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('userSettings.business.cardTitle')}</CardTitle>
              <CardDescription>
                {t('userSettings.business.cardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">{t('userSettings.business.instagramLabel')}</Label>
                  <Input
                    id="instagramHandle"
                    value={settings?.instagramHandle || ""}
                    onChange={(e) => updateSetting('instagramHandle', e.target.value)}
                    placeholder="@example"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookPage">{t('userSettings.business.facebookLabel')}</Label>
                  <Input
                    id="facebookPage"
                    value={settings?.facebookPage || ""}
                    onChange={(e) => updateSetting('facebookPage', e.target.value)}
                    placeholder="https://facebook.com/example"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinProfile">{t('userSettings.business.linkedinLabel')}</Label>
                  <Input
                    id="linkedinProfile"
                    value={settings?.linkedinProfile || ""}
                    onChange={(e) => updateSetting('linkedinProfile', e.target.value)}
                    placeholder="https://linkedin.com/company/example"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <Dialog open={showCodeChangeDialog} onOpenChange={setShowCodeChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('userSettings.branding.assignmentCodeChangeWarningTitle')}</DialogTitle>
            <DialogDescription>
              {t('userSettings.branding.assignmentCodeChangeWarningDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeChangeDialog(false)}>
              {t('userSettings.branding.assignmentCodeChangeCancel')}
            </Button>
            <Button
              onClick={async () => {
                setShowCodeChangeDialog(false);
                await performSaveAssignmentCode();
              }}
            >
              {t('userSettings.branding.assignmentCodeChangeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
