import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, 
  Home, 
  Users, 
  MessageSquare, 
  Crown, 
  CreditCard, 
  Brain, 
  Settings as SettingsIcon,
  UserCog,
  Clock
} from "lucide-react";
import { useLicense } from "@/hooks/use-license";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useMobileSync } from "@/hooks/use-mobile-sync";
import { LanguageSelector } from "./ui/language-selector";
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
  
  const { user: userWithLicense, isLoading: isUserLoading } = useUserWithLicense();
  const isAdmin = userWithLicense?.type === 'admin';
  const isStaff = userWithLicense?.type === 'staff';
  
  // Attiva sincronizzazione automatica per dispositivi mobili
  const { isMobile } = useMobileSync();
  
  const isActive = (path: string) => location === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - identico per desktop e mobile */}
      <header className="bg-primary text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-2 py-2">
          
          {/* Layout desktop */}
          <div className="hidden md:flex items-center w-full">
            {/* Colonna sinistra: informazioni utente - 35% */}
            <div className="w-[35%]">
              <div className="border border-white/30 rounded-md p-2 bg-primary-dark/20 flex items-center space-x-2 mr-auto max-w-none min-w-[380px]">
                <CalendarDays className="h-6 w-6 flex-shrink-0" />
                <div className="w-full">
                  <h1 className="text-xl font-medium">
                    {appTitle || t('app.title')}
                  </h1>
                  <div className="text-sm flex items-center gap-1">
                    <UserLicenseBadge />
                  </div>
                  {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-xs text-amber-300 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(licenseInfo.expiresAt) > new Date() 
                            ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ${t('trial.days')}` 
                            : t('trial.expired')}
                        </span>
                      </div>
                      <div className="text-xs text-amber-200 flex items-center whitespace-nowrap">
                        <Link href="/pro" className="hover:text-amber-100 underline transition-colors">
                          {t('trial.upgradeMessage', 'Scopri i piani premium')} →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Colonna centrale: menu navigazione - 55% */}
            <div className="flex flex-col w-[55%] items-center">
              {/* Prima riga navigazione */}
              <div className="flex justify-center gap-x-3 mb-1 w-full">
                <Link href="/dashboard">
                  <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[80px]">
                    <Home className="h-4 w-4 mr-1" />
                    <span>{t('navigation.home')}</span>
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
                    <span>{t('navigation.notifications')}</span>
                  </Button>
                </Link>
                {(userWithLicense?.type === 'staff' || userWithLicense?.type === 'admin') && (
                  <Link href="/referral">
                    <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                      <CreditCard className="h-4 w-4 mr-1 text-blue-400" />
                      <span>{t('navigation.referral')}</span>
                    </Button>
                  </Link>
                )}
              </div>
              
              {/* Seconda riga navigazione */}
              <div className="flex justify-center gap-x-3 w-full">
                <Link href="/onboarding">
                  <Button variant={isActive("/onboarding") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[100px]">
                    <Brain className="h-4 w-4 mr-1 text-purple-400" />
                    <span>{t('navigation.aiSetup')}</span>
                  </Button>
                </Link>
                <Link href="/pro">
                  <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[70px]">
                    <Crown className="h-4 w-4 mr-1 text-amber-400" />
                    <span>PRO</span>
                  </Button>
                </Link>
                
                {isAdmin && (
                  <>
                    <Link href="/staff-management">
                      <Button variant={isActive("/staff-management") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[80px]">
                        <UserCog className="h-4 w-4 mr-1" />
                        <span>{t('navigation.staff')}</span>
                      </Button>
                    </Link>
                    <Link href="/payment-admin">
                      <Button variant={isActive("/payment-admin") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[110px]">
                        <CreditCard className="h-4 w-4 mr-1 text-green-400" />
                        <span>{t('navigation.payments')}</span>
                      </Button>
                    </Link>
                  </>
                )}
                
                <Link href="/settings">
                  <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-2 min-w-[90px]">
                    <SettingsIcon className="h-4 w-4 mr-1" />
                    <span>{t('settings.title')}</span>
                  </Button>
                </Link>
                
                <LanguageSelector />
              </div>
            </div>
            
            {/* Colonna destra: logout - 10% */}
            <div className="flex justify-end w-[10%]">
              <LogoutButton variant="secondary" className="w-24 h-10" iconPosition="right" />
            </div>
          </div>
          
          {/* Layout mobile - IDENTICO al desktop */}
          <div className="flex md:hidden flex-col items-center w-full">
            {/* Informazioni utente mobile - identiche al desktop */}
            <div className="w-full mb-2">
              <div className="border border-white/30 rounded-md p-2 bg-primary-dark/20 flex items-center space-x-2">
                <CalendarDays className="h-6 w-6 flex-shrink-0" />
                <div className="w-full">
                  <h1 className="text-xl font-medium">
                    {appTitle || t('app.title')}
                  </h1>
                  <div className="text-sm flex items-center gap-1">
                    <UserLicenseBadge />
                  </div>
                  {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-xs text-amber-300 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(licenseInfo.expiresAt) > new Date() 
                            ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ${t('trial.days')}` 
                            : t('trial.expired')}
                        </span>
                      </div>
                      <div className="text-xs text-amber-200 flex items-center whitespace-nowrap">
                        <Link href="/pro" className="hover:text-amber-100 underline transition-colors">
                          {t('trial.upgradeMessage', 'Scopri i piani premium')} →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu navigazione mobile - identico al desktop ma adattato */}
            <div className="flex flex-col w-full items-center">
              {/* Prima riga mobile */}
              <div className="flex justify-center gap-x-1 mb-1 w-full flex-wrap">
                <Link href="/dashboard">
                  <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[70px] text-xs">
                    <Home className="h-3 w-3 mr-1" />
                    <span>{t('navigation.home')}</span>
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[80px] text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    <span>{t('calendar.title')}</span>
                  </Button>
                </Link>
                <Link href="/clients">
                  <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[70px] text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{t('clients.title')}</span>
                  </Button>
                </Link>
                <Link href="/whatsapp-center">
                  <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[80px] text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>{t('navigation.notifications')}</span>
                  </Button>
                </Link>
              </div>
              
              {/* Seconda riga mobile */}
              <div className="flex justify-center gap-x-1 mb-1 w-full flex-wrap">
                {(userWithLicense?.type === 'staff' || userWithLicense?.type === 'admin') && (
                  <Link href="/referral">
                    <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[70px] text-xs">
                      <CreditCard className="h-3 w-3 mr-1 text-blue-400" />
                      <span>{t('navigation.referral')}</span>
                    </Button>
                  </Link>
                )}
                <Link href="/onboarding">
                  <Button variant={isActive("/onboarding") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[80px] text-xs">
                    <Brain className="h-3 w-3 mr-1 text-purple-400" />
                    <span>{t('navigation.aiSetup')}</span>
                  </Button>
                </Link>
                <Link href="/pro">
                  <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[60px] text-xs">
                    <Crown className="h-3 w-3 mr-1 text-amber-400" />
                    <span>PRO</span>
                  </Button>
                </Link>
                
                {isAdmin && (
                  <>
                    <Link href="/staff-management">
                      <Button variant={isActive("/staff-management") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[70px] text-xs">
                        <UserCog className="h-3 w-3 mr-1" />
                        <span>{t('navigation.staff')}</span>
                      </Button>
                    </Link>
                    <Link href="/payment-admin">
                      <Button variant={isActive("/payment-admin") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[80px] text-xs">
                        <CreditCard className="h-3 w-3 mr-1 text-green-400" />
                        <span>{t('navigation.payments')}</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Terza riga mobile */}
              <div className="flex justify-center gap-x-1 w-full flex-wrap">
                <Link href="/settings">
                  <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="flex items-center hover:bg-primary-dark px-1 min-w-[80px] text-xs">
                    <SettingsIcon className="h-3 w-3 mr-1" />
                    <span>{t('settings.title')}</span>
                  </Button>
                </Link>
                <LanguageSelector />
                <LogoutButton variant="secondary" className="text-xs h-8 px-2" iconPosition="right" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenuto principale */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6">
        <div className="bg-background text-foreground min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}