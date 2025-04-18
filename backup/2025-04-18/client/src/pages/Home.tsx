import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { 
  CalendarDays, 
  Users, 
  BarChart,
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Grid,
  Flower,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/ui/language-selector";
import { apiRequest } from "@/lib/queryClient";

// Componente per l'icona dell'app
function AppIcon() {
  const [iconInfo, setIconInfo] = useState<{
    exists: boolean;
    isCustom?: boolean;
    iconPath?: string;
    mimeType?: string;
    lastModified?: string;
  }>({ exists: false });
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchIconInfo = async () => {
      try {
        setLoading(true);
        const response = await apiRequest("GET", "/api/client-app-info");
        const data = await response.json();
        if (data.icon) {
          setIconInfo(data.icon);
        }
      } catch (error) {
        console.error("Errore nel recuperare le informazioni dell'icona:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIconInfo();
  }, []);
  
  if (loading) {
    return <div className="w-full h-full flex items-center justify-center"><Clock className="w-8 h-8 animate-spin text-primary/50" /></div>;
  }
  
  if (!iconInfo.exists) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <ImageIcon className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }
  
  // Aggiungi un timestamp per evitare la cache del browser
  const iconSrc = `${iconInfo.iconPath}?t=${new Date().getTime()}`;
  
  return (
    <img 
      src={iconSrc}
      alt="Logo" 
      className="w-full h-full object-cover"
    />
  );
}

// Componente per il nome aziendale
function CompanyName() {
  const [settings, setSettings] = useState<{
    name: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    color: string;
    enabled: boolean;
  } | null>(null);
  
  useEffect(() => {
    // Carica le impostazioni dal localStorage
    const storedSettings = localStorage.getItem('companyNameSettings');
    if (storedSettings) {
      const data = JSON.parse(storedSettings);
      setSettings(data);
    }
  }, []);
  
  if (!settings || !settings.enabled || !settings.name) {
    return null; // Non mostrare nulla se non c'è un nome aziendale o se è disabilitato
  }
  
  // Stile dinamico per il nome aziendale
  const nameStyle = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    fontStyle: settings.fontStyle,
    color: settings.color,
    marginTop: '12px',
    textAlign: 'center' as const,
    maxWidth: '300px'
  };
  
  return <div style={nameStyle}>{settings.name}</div>;
}

export default function Home() {
  const [_, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center my-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-full shadow-lg bg-white border-4 border-primary/20 flex items-center justify-center overflow-hidden icon-rotate">
            <AppIcon />
          </div>
          <CompanyName />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {t('app.welcome')}
        </h1>
        <p className="text-muted-foreground">
          {t('app.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <Card className="h-full card-hover flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                {t('calendar.title')}
              </CardTitle>
              <CardDescription>
                {t('calendar.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="flex-1">
                {t('calendar.subDescription')}
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full btn-with-icon" 
                  onClick={() => navigate("/calendar")}
                >
                  {t('calendar.goTo')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                {t('clients.title')}
              </CardTitle>
              <CardDescription>
                {t('clients.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="flex-1">
                {t('clients.subDescription')}
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full btn-with-icon" 
                  onClick={() => navigate("/clients")}
                >
                  {t('clients.goTo')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                {t('invoices.title')}
              </CardTitle>
              <CardDescription>
                {t('invoices.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="flex-1">
                {t('invoices.subDescription')}
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full btn-with-icon" 
                  onClick={() => navigate("/invoices")}
                >
                  {t('invoices.goTo')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-primary" />
                {t('reports.title')}
              </CardTitle>
              <CardDescription>
                {t('reports.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="flex-1">
                {t('reports.subDescription')}
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full btn-with-icon" 
                  onClick={() => navigate("/reports")}
                >
                  {t('reports.goTo')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
