import { useState, ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { useLicense, LicenseType } from '@/hooks/use-license';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
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
  UserCog,
  LogOut,
  Home,
  CalendarClock,
  ClipboardList,
  BookOpen,
  BookText,
  Book,
  Clipboard,
  FileQuestion
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import AppointmentForm from "./AppointmentForm";
import FooterContactIcons from "./FooterContactIcons";
import { apiRequest } from "@/lib/queryClient";
import UserLicenseBadge from "./UserLicenseBadge";
import LogoutButton from "./LogoutButton";

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export default function Layout({ children, hideHeader = false }: LayoutProps) {
  const [location] = useLocation();
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const { t } = useTranslation();
  const { licenseInfo, appTitle } = useLicense();
  
  // Utilizziamo direttamente l'hook per ottenere i dati dell'utente
  const { user: userWithLicense, isLoading: isUserLoading } = useUserWithLicense();
  const isAdmin = userWithLicense?.type === 'admin';
  const isStaff = userWithLicense?.type === 'staff';
  
  // Check active route
  const isActive = (path: string) => location === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - in alcune pagine mostriamo solo il menu senza il titolo principale */}
      <header className="bg-primary text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-2 py-2">
          {/* Layout a tre colonne per desktop - riduzione dei gap e utilizzo container più ampio */}
          <div className="hidden md:grid grid-cols-3 gap-4 items-center w-full">
            {/* Colonna sinistra: Solo informazioni essenziali */}
            <div className="border border-white/30 rounded-md p-2 bg-primary-dark/20 flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 flex-shrink-0" />
              <div className="overflow-hidden">
                {/* Rimuove "Prova" dal titolo dell'app se l'utente è admin o staff */}
                <h1 className="text-xl font-medium truncate">
                  {appTitle || t('app.title')}
                </h1>
                {/* Il badge contiene già l'informazione sul tipo di utente, rimuovo duplicato */}
                <div className="text-sm flex items-center gap-1">
                  <UserLicenseBadge />
                </div>
                {/* Mostra il conteggio solo se l'utente è in prova (trial) */}
                {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-amber-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(licenseInfo.expiresAt) > new Date() 
                          ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} giorni` 
                          : 'Scaduto'}
                      </span>
                    </div>
                    <div className="text-xs text-amber-200 flex items-center">
                      <Link href="/pro" className="hover:text-amber-100 underline transition-colors">
                        {t('trial.upgradeMessage', 'Scopri i piani premium')} →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Colonna centrale: Menu di navigazione su due righe - maggiore larghezza */}
            <div className="flex flex-col w-full">
              {/* Prima riga di navigazione - massimo a sinistra */}
              <div className="flex justify-start space-x-4 mb-1 pl-0 pr-96">
                <Link href="/dashboard">
                  <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[80px]">
                    <Home className="h-4 w-4 mr-1" />
                    <span>Home</span>
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    <span>{t('calendar.title')}</span>
                  </Button>
                </Link>
                <Link href="/clients">
                  <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{t('clients.title')}</span>
                  </Button>
                </Link>
                <Link href="/whatsapp-center">
                  <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>Notifiche</span>
                  </Button>
                </Link>
              </div>
              
              {/* Seconda riga di navigazione - massimo a sinistra */}
              <div className="flex justify-start space-x-4 pl-0 pr-96">
                <Link href="/pro">
                  <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[70px]">
                    <Crown className="h-4 w-4 mr-1 text-amber-400" />
                    <span>PRO</span>
                  </Button>
                </Link>
                
                {/* Pulsante Staff per admin - più visibile e prominente */}
                {isAdmin && (
                  <Link href="/staff-management">
                    <Button variant={isActive("/staff-management") ? "secondary" : "outline"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[80px] border-white/60 font-medium">
                      <UserCog className="h-4 w-4 mr-1" />
                      <span>Staff</span>
                    </Button>
                  </Link>
                )}
                
                {/* Pulsante impostazioni */}
                <Link href="/settings">
                  <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                    <SettingsIcon className="h-4 w-4 mr-1" />
                    <span>{t('settings.title')}</span>
                  </Button>
                </Link>
                
                {/* Selettore lingua con dimensione ridotta */}
                <LanguageSelector />
              </div>
            </div>
            
            {/* Colonna destra: Solo pulsante logout */}
            <div className="flex justify-end">
              <LogoutButton variant="secondary" className="w-24 h-10" iconPosition="right" />
            </div>
          </div>
          
          {/* Layout mobile ottimizzato */}
          <div className="flex md:hidden items-center justify-between py-2">
            <div className="flex items-center space-x-2 overflow-hidden">
              <Link href="/dashboard">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <CalendarDays className="h-5 w-5 flex-shrink-0" />
                  <h1 className="text-lg font-medium truncate max-w-[200px]">
                    {appTitle || t('app.title')}
                  </h1>
                </div>
              </Link>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 py-4">
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <UserLicenseBadge />
                      {/* Solo informazioni essenziali, senza duplicati */}
                      {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-amber-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(licenseInfo.expiresAt) > new Date() 
                                ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} giorni` 
                                : 'Scaduto'}
                            </span>
                          </div>
                          <div className="text-xs text-amber-500">
                            <Link href="/pro" className="hover:text-amber-400 underline transition-colors">
                              {t('trial.upgradeMessage', 'Scopri i piani premium')} →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h2 className="text-lg font-medium">Menu</h2>
                  <nav className="flex flex-col gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} className="justify-start w-full">
                        <Home className="mr-2 h-4 w-4" />
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
                        Notifiche
                      </Button>
                    </Link>
                    
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} className="justify-start w-full">
                        <Crown className="mr-2 h-4 w-4 text-amber-400" />
                        Funzionalità PRO
                      </Button>
                    </Link>
                    
                    <Link href="/appointments">
                      <Button variant={isActive("/appointments") ? "secondary" : "ghost"} className="justify-start w-full">
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Appuntamenti
                      </Button>
                    </Link>
                    
                    <Link href="/questionnaires">
                      <Button variant={isActive("/questionnaires") ? "secondary" : "ghost"} className="justify-start w-full">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Questionari
                      </Button>
                    </Link>
                    
                    {/* Mostra il collegamento per la gestione staff solo agli amministratori - più visibile */}
                    {isAdmin && (
                      <Link href="/staff-management">
                        <Button variant={isActive("/staff-management") ? "secondary" : "outline"} className="justify-start w-full border-primary-light/40 font-medium">
                          <UserCog className="mr-2 h-4 w-4" />
                          <span className="font-medium">Gestione Staff</span>
                        </Button>
                      </Link>
                    )}
                    
                    {/* Mostra il pulsante Impostazioni */}
                    <Link href="/settings">
                      <Button variant={isActive("/settings") ? "secondary" : "ghost"} className="justify-start w-full">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        {t('settings.title')}
                      </Button>
                    </Link>
                  </nav>
                  
                  {/* Selettore lingua */}
                  <div className="mt-4">
                    <LanguageSelector />
                  </div>
                  
                  {/* Pulsante di logout nel menu mobile */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <LogoutButton 
                      variant="secondary" 
                      fullWidth={true} 
                      className="justify-center" 
                      iconPosition="right" 
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow w-full max-w-[1400px] mx-auto px-2 py-6">
        {children}
      </main>

      {/* Footer - nascosto nella pagina delle notifiche o quando specificato */}
      {location !== "/notifications" && location !== "/whatsapp-center" && location !== "/phone-device-setup" && location !== "/simple-phone-setup" && (
        <footer className="bg-gray-100 border-t border-gray-300 py-4">
          <div className="w-full max-w-[1400px] mx-auto px-2">
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
