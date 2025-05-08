import { useState, ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { useLicense, LicenseType } from '@/hooks/use-license';
import { 
  CalendarDays, 
  Users, 
  BarChart, 
  Menu, 
  X, 
  FileText,
  Calendar,
  Clock,
  Grid,
  Plus,
  MessageSquare,
  Settings as SettingsIcon,
  Crown,
  Shield,
  UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import AppointmentForm from "./AppointmentForm";
import FooterContactIcons from "./FooterContactIcons";
import { apiRequest } from "@/lib/queryClient";
import UserLicenseBadge from "./UserLicenseBadge";

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export default function Layout({ children, hideHeader = false }: LayoutProps) {
  const [location] = useLocation();
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useTranslation();
  const { licenseInfo, appTitle } = useLicense();

  // Verifica se l'utente corrente è un amministratore
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await apiRequest('GET', '/api/current-user');
        if (response.ok) {
          const userData = await response.json();
          setIsAdmin(userData.type === "admin");
        }
      } catch (error) {
        console.error("Errore nel verificare lo stato di amministratore:", error);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Check active route
  const isActive = (path: string) => location === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - in alcune pagine mostriamo solo il menu senza il titolo principale */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <Link href="/dashboard">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <CalendarDays className="h-5 w-5" />
                  {/* Mostra il titolo solo se non siamo nella pagina delle notifiche o nella home */}
                  {(location === "/" || (location !== "/notifications" && location !== "/whatsapp-center" && location !== "/phone-device-setup" && location !== "/simple-phone-setup" && !hideHeader)) && (
                    <h1 className="text-xl font-medium flex items-center">
                      {appTitle || t('app.title')}
                      <UserLicenseBadge />
                    </h1>
                  )}
                </div>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              {/* Mostra il pulsante Home solo se non siamo già nella dashboard */}
              {location !== "/dashboard" && (
                <Link href="/dashboard">
                  <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                    <Grid className="h-4 w-4" />
                    <span>{t('navigation.home')}</span>
                  </Button>
                </Link>
              )}
            
              <Link href="/calendar">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Calendar className="h-4 w-4" />
                  <span>{t('calendar.title')}</span>
                </Button>
              </Link>
              
              <Link href="/clients">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Users className="h-4 w-4" />
                  <span>{t('clients.title')}</span>
                </Button>
              </Link>
              
              <Link href="/whatsapp-center">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <MessageSquare className="h-4 w-4" />
                  <span>Notifiche ai clienti</span>
                </Button>
              </Link>
              
              <Link href="/pro">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span>Funzionalità PRO</span>
                </Button>
              </Link>

              {/* Mostra il collegamento per la gestione staff solo agli amministratori */}
              {isAdmin && (
                <Link href="/staff-management">
                  <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                    <UserCog className="h-4 w-4" />
                    <span>Gestione Staff</span>
                  </Button>
                </Link>
              )}

              {/* Mostra il pulsante Impostazioni e il selettore lingua solo nella dashboard */}
              {location === "/dashboard" && (
                <>
                  <Link href="/settings">
                    <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                      <SettingsIcon className="h-4 w-4" />
                      <span>{t('settings.title')}</span>
                    </Button>
                  </Link>
                  
                  <LanguageSelector />
                </>
              )}
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 py-4">
                  <h2 className="text-lg font-medium">Menu</h2>
                  <nav className="flex flex-col gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} className="justify-start w-full">
                        Home
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} className="justify-start w-full">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {t('calendar.title')}
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} className="justify-start w-full">
                        <Users className="mr-2 h-4 w-4" />
                        {t('clients.title')}
                      </Button>
                    </Link>
                    
                    <Link href="/whatsapp-center">
                      <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} className="justify-start w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Notifiche ai clienti
                      </Button>
                    </Link>
                    
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} className="justify-start w-full">
                        <Crown className="mr-2 h-4 w-4 text-amber-400" />
                        Funzionalità PRO
                      </Button>
                    </Link>
                    
                    {/* Mostra il collegamento per la gestione staff solo agli amministratori */}
                    {isAdmin && (
                      <Link href="/staff-management">
                        <Button variant={isActive("/staff-management") ? "secondary" : "ghost"} className="justify-start w-full">
                          <UserCog className="mr-2 h-4 w-4" />
                          Gestione Staff
                        </Button>
                      </Link>
                    )}
                    
                    {/* Mostra il pulsante Impostazioni solo nella dashboard */}
                    {location === "/dashboard" && (
                      <Link href="/settings">
                        <Button variant={isActive("/settings") ? "secondary" : "ghost"} className="justify-start w-full">
                          <SettingsIcon className="mr-2 h-4 w-4" />
                          {t('settings.title')}
                        </Button>
                      </Link>
                    )}
                  </nav>
                  {/* Mostra il selettore lingua solo nella dashboard */}
                  {location === "/dashboard" && (
                    <div className="mt-4">
                      <LanguageSelector />
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer - nascosto nella pagina delle notifiche o quando specificato */}
      {location !== "/notifications" && location !== "/whatsapp-center" && location !== "/phone-device-setup" && location !== "/simple-phone-setup" && (
        <footer className="bg-gray-100 border-t border-gray-300 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600 mb-2 md:mb-0">
                &copy; {new Date().getFullYear()} Zambelli Andrea - G.A.
              </div>
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0">
                {/* Links */}
                <div className="flex space-x-4">
                  <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.support', 'Supporto')}</Button>
                  <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</Button>
                  <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.terms', 'Termini di Servizio')}</Button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
