import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
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
  ImageIcon,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/ui/language-selector";
import { apiRequest } from "@/lib/queryClient";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import FooterContactIcons from "@/components/FooterContactIcons";

// Componente per l'icona dell'app - STESSA LOGICA NOME AZIENDALE
function AppIcon() {
  const [iconUrl, setIconUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchIconInfo = async () => {
      try {
        setLoading(true);
        const response = await apiRequest("GET", "/api/client-app-info");
        const data = await response.json();
        console.log('🏠 HOME: Icona ricevuta dal server:', { 
          url: data.icon?.substring(0, 50) + '...',
          length: data.icon?.length 
        });
        
        // STESSA LOGICA NOME AZIENDALE - usa direttamente l'icona dal server
        if (data.icon) {
          setIconUrl(data.icon);
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
  
  if (!iconUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Flower className="w-12 h-12 text-primary" />
      </div>
    );
  }
  
  return (
    <img 
      src={iconUrl}
      alt="Fleur de Vie" 
      className="w-full h-full object-cover rounded-lg"
    />
  );
}

// Componente per il nome aziendale
function CompanyName() {
  const { user } = useUserWithLicense();
  const [settings, setSettings] = useState<{
    name: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    color: string;
    enabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCompanyNameSettings = async () => {
      if (!user?.id) {
        console.log("⏭️ FRONTEND CompanyName: Utente non disponibile, skip caricamento");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log(`🏢 FRONTEND CompanyName: Caricamento impostazioni per utente ${user.id}`);
        const response = await apiRequest("GET", "/api/company-name-settings");
        console.log(`🏢 FRONTEND CompanyName: Risposta API status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ FRONTEND CompanyName: Impostazioni caricate:`, data);
          setSettings(data);
        } else if (response.status === 404) {
          console.log(`ℹ️ FRONTEND CompanyName: Nessuna impostazione trovata per utente ${user.id}`);
          setSettings(null);
        } else {
          console.log(`❌ FRONTEND CompanyName: Errore API status ${response.status}`);
        }
      } catch (error) {
        console.error("❌ FRONTEND CompanyName: Errore nel caricamento:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyNameSettings();
  }, [user?.id]);
  
  if (loading) {
    return <div className="text-center text-xs text-muted-foreground mt-2">Caricamento nome...</div>;
  }
  
  if (!settings || !settings.enabled || !settings.name) {
    console.log("🏢 FRONTEND CompanyName: Non mostro nome - settings:", settings);
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

// Componente Badge Beta
function BetaBadge() {
  const [isBeta, setIsBeta] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    // Utilizziamo la funzione di utilità per verificare se l'utente è un beta tester
    import('@/lib/betaUtils').then(({ isBetaTester }) => {
      setIsBeta(isBetaTester());
    });
    
    // Ricontrolliamo se lo stato beta cambia
    const checkBetaStatus = () => {
      import('@/lib/betaUtils').then(({ isBetaTester }) => {
        setIsBeta(isBetaTester());
      });
    };
    
    window.addEventListener('storage', checkBetaStatus);
    
    return () => {
      window.removeEventListener('storage', checkBetaStatus);
    };
  }, []);
  
  if (!isBeta) return null;
  
  return (
    <div className="absolute top-2 right-2 animate-pulse">
      <Link href="/beta" className="inline-block">
        <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-full shadow-lg hover:shadow-xl transition-shadow">
          Beta Tester
        </span>
      </Link>
    </div>
  );
}

export default function Home() {
  const [_, navigate] = useLocation();
  const { t } = useTranslation();
  const { userWithLicense } = useUserWithLicense();

  return (
    <div className="space-y-6 relative">
      <BetaBadge />
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
                <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                {t('whatsappNotifications.title')}
              </CardTitle>
              <CardDescription>
                {t('whatsappNotifications.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="flex-1">
                {t('whatsappNotifications.subDescription')}
              </p>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full btn-with-icon" 
                  onClick={() => navigate("/notifications")}
                >
                  {t('whatsappNotifications.goTo')}
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

      {/* Sezione icone contatti social */}
      <div className="mt-12">
        <FooterContactIcons />
      </div>

      {/* Sezione informazioni legali */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Informazioni Sistema</h3>
            <p>Gestionale Appuntamenti v2.1.0</p>
            <p>© 2025 Zambelli Development</p>
            <p>Tutti i diritti riservati</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Privacy e Sicurezza</h3>
            <p>Supporto tecnico: andreazambelli64@gmail.com</p>
            <button 
              className="text-primary hover:underline mt-1"
              onClick={() => navigate('/terms')}
            >
              Termini di servizio e condizioni d'uso →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
