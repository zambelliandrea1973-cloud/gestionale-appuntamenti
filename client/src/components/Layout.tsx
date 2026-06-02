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
  Settings as SettingsIcon,
  UserCog,
  Clock,
  Sparkles,
  BookOpen,
  ClipboardList,
  Bell
} from "lucide-react";
import { useLicense } from "@/hooks/use-license";
import { usePendingRequests } from "@/hooks/use-pending-requests";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useMobileSync } from "@/hooks/use-mobile-sync";
import { useMobileForcedSync } from "@/hooks/use-mobile-force-sync";
import { LanguageSelector } from "./ui/language-selector";
import UserLicenseBadge from "./UserLicenseBadge";
import LogoutButton from "./LogoutButton";

function UserIcon({ className, userId }: { className?: string; userId?: number }) {
  const [imgError, setImgError] = useState(false);

  if (!userId || imgError) {
    return <CalendarDays className={className} />;
  }

  return (
    <img 
      src={`/pwa-icon/96x96?owner=${userId}`}
      alt="App icon"
      className={`${className} rounded-sm object-cover`}
      onError={() => setImgError(true)}
    />
  );
}

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export default function Layout({ children, hideHeader = false }: LayoutProps) {
  const [location] = useLocation();
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const { t } = useTranslation();
  const { licenseInfo, appTitle, hasProAccess, hasBusinessAccess } = useLicense();
  
  const { user: userWithLicense, isLoading: isUserLoading } = useUserWithLicense();
  const isAdmin = userWithLicense?.type === 'admin';
  const isStaff = userWithLicense?.type === 'staff';
  
  // Attiva sincronizzazione automatica per dispositivi mobili
  const { isMobile } = useMobileSync();
  
  // Sistema di sincronizzazione forzata per mobile - stesso percorso del PC
  const { syncData, isForcesynced, clientsCount } = useMobileForcedSync();
  
  // Richieste appuntamento pendenti per notifica campanella
  const { pendingCount, hasPendingRequests } = usePendingRequests();
  
  // Debug per verificare sincronizzazione
  if (isMobile && syncData) {
    console.log(`📱 [LAYOUT] Mobile synced: ${clientsCount} clients, settings:`, syncData.companySettings);
  }
  
  const isActive = (path: string) => location === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - identico per desktop e mobile */}
      <header className="bg-primary text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-2 py-2">
          
          {/* Layout desktop - menu compatto a 3 righe centrato */}
          <div className="hidden md:flex flex-col items-center w-full">
            {/* Header con titolo app e badge utente — 3 colonne: titolo | badge centrato | esci */}
            <div className="w-full grid grid-cols-3 items-center mb-2">
              {/* Sinistra: icona + titolo + codice sotto */}
              <div className="flex items-center gap-2 min-w-0">
                <UserIcon className="h-5 w-5 flex-shrink-0" userId={userWithLicense?.id} />
                <div className="flex flex-col min-w-0">
                  <h1 className="text-lg font-medium whitespace-nowrap leading-tight">{appTitle || t('app.title')}</h1>
                  {(userWithLicense?.assignmentCode || userWithLicense?.professionistCode) && (
                    <span className="text-[10px] text-amber-200 font-mono leading-tight">
                      {t('staffManagement.referralCodeBadge', { code: userWithLicense.assignmentCode || userWithLicense.professionistCode })}
                    </span>
                  )}
                </div>
              </div>
              {/* Centro: badge piano + eventuale trial */}
              <div className="flex flex-col items-center gap-0.5">
                <UserLicenseBadge hideCode={true} />
                {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                  <span className="text-xs text-amber-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(licenseInfo.expiresAt) > new Date() 
                      ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ${t('trial.days')}` 
                      : t('trial.expired')}
                  </span>
                )}
              </div>
              {/* Destra: pulsante esci */}
              <div className="flex justify-end">
                <LogoutButton variant="secondary" className="h-8 px-3 flex-shrink-0" iconPosition="right" />
              </div>
            </div>
            
            {/* Menu navigazione desktop/tablet — per piano, centrato, bordi uniformi */}
            <div className="flex flex-col items-center w-full gap-2">

              {/* ── STAFF desktop ── */}
              {isStaff && (
                <>
                  {/* Riga 1: 5 voci principali */}
                  <div className="flex justify-center gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/booking-requests">
                      <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md relative">
                        {hasPendingRequests && !isActive("/booking-requests") ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" /> : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span className="truncate">{t('navigation.requests')}</span>
                        {hasPendingRequests && !isActive("/booking-requests") && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>}
                      </Button>
                    </Link>
                    <Link href="/whatsapp-center">
                      <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 2: 4 strumenti */}
                  <div className="flex justify-center gap-2">
                    <Link href="/referral">
                      <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" /><span className="truncate">{t('navigation.referral')}</span>
                      </Button>
                    </Link>
                    <Link href="/ai-chat">
                      <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                      </Button>
                    </Link>
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 3: lingua */}
                  <div className="flex justify-center gap-2">
                    <div className="flex items-center justify-center border border-white/25 rounded-md h-9 px-2"><LanguageSelector /></div>
                  </div>
                </>
              )}

              {/* ── PRO / BUSINESS desktop ── */}
              {!isAdmin && !isStaff && hasProAccess && (
                <>
                  {/* Riga 1: 5 voci principali */}
                  <div className="flex justify-center gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/booking-requests">
                      <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md relative">
                        {hasPendingRequests && !isActive("/booking-requests") ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" /> : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span className="truncate">{t('navigation.requests')}</span>
                        {hasPendingRequests && !isActive("/booking-requests") && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>}
                      </Button>
                    </Link>
                    <Link href="/whatsapp-center">
                      <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 2: 3 strumenti PRO */}
                  <div className="flex justify-center gap-2">
                    <Link href="/ai-chat">
                      <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                      </Button>
                    </Link>
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 3: lingua */}
                  <div className="flex justify-center gap-2">
                    <div className="flex items-center justify-center border border-white/25 rounded-md h-9 px-2"><LanguageSelector /></div>
                  </div>
                </>
              )}

              {/* ── BASE / TRIAL desktop ── */}
              {!isAdmin && !isStaff && !hasProAccess && (
                <>
                  {/* Riga 1: 4 voci principali */}
                  <div className="flex justify-center gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/booking-requests">
                      <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md relative">
                        {hasPendingRequests && !isActive("/booking-requests") ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" /> : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span className="truncate">{t('navigation.requests')}</span>
                        {hasPendingRequests && !isActive("/booking-requests") && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>}
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 2: 3 strumenti */}
                  <div className="flex justify-center gap-2">
                    <Link href="/whatsapp-center">
                      <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                      </Button>
                    </Link>
                    <Link href="/ai-chat">
                      <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                      </Button>
                    </Link>
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">↑ PRO</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 3: impostazioni + lingua */}
                  <div className="flex justify-center gap-2">
                    <Link href="/settings">
                      <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                      </Button>
                    </Link>
                    <div className="flex items-center justify-center border border-white/25 rounded-md h-9 px-2"><LanguageSelector /></div>
                  </div>
                </>
              )}

              {/* ── ADMIN desktop — 5 | 5 | 2 ── */}
              {isAdmin && (
                <>
                  {/* Riga 1: 5 voci navigazione */}
                  <div className="flex justify-center gap-2">
                    <Link href="/dashboard">
                      <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                      </Button>
                    </Link>
                    <Link href="/booking-requests">
                      <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md relative">
                        {hasPendingRequests && !isActive("/booking-requests") ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" /> : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                        <span className="truncate">{t('navigation.requests')}</span>
                        {hasPendingRequests && !isActive("/booking-requests") && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>}
                      </Button>
                    </Link>
                    <Link href="/whatsapp-center">
                      <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 2: 5 strumenti admin */}
                  <div className="flex justify-center gap-2">
                    <Link href="/referral">
                      <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" /><span className="truncate">{t('navigation.referral')}</span>
                      </Button>
                    </Link>
                    <Link href="/ai-chat">
                      <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                      </Button>
                    </Link>
                    <Link href="/pro">
                      <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                      </Button>
                    </Link>
                    <Link href="/staff-management">
                      <Button variant={isActive("/staff-management") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <UserCog className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.staff')}</span>
                      </Button>
                    </Link>
                    <Link href="/payment-admin">
                      <Button variant={isActive("/payment-admin") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-green-300" /><span className="truncate">{t('navigation.payments')}</span>
                      </Button>
                    </Link>
                  </div>
                  {/* Riga 3: impostazioni + lingua */}
                  <div className="flex justify-center gap-2">
                    <Link href="/settings">
                      <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                      </Button>
                    </Link>
                    <div className="flex items-center justify-center border border-white/25 rounded-md h-9 px-2"><LanguageSelector /></div>
                  </div>
                </>
              )}

            </div>
          </div>
          
          {/* Layout mobile */}
          <div className="flex md:hidden flex-col w-full">
            {/* Intestazione utente */}
            <div className="w-full mb-2">
              <div className="border border-white/30 rounded-md p-2 bg-primary-dark/20 flex items-center gap-2">
                <UserIcon className="h-7 w-7 flex-shrink-0" userId={userWithLicense?.id} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-semibold leading-tight truncate">
                    {appTitle || t('app.title')}
                  </h1>
                  <div className="flex items-center gap-1 mt-0.5">
                    <UserLicenseBadge />
                    {userWithLicense?.username && (
                      <span className="text-[10px] text-white/70 truncate">{userWithLicense.username}</span>
                    )}
                  </div>
                  {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && (
                    <div className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {new Date(licenseInfo.expiresAt) > new Date()
                          ? `${Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ${t('trial.days')}`
                          : t('trial.expired')}
                      </span>
                      <Link href="/settings?tab=subscription" className="underline text-amber-200 ml-1">
                        {t('trial.upgradeMessage', 'Scopri i piani')} →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── STAFF mobile nav ── */}
            {isStaff && (
              <div className="flex flex-col w-full gap-1.5">
                {/* Riga 1: navigazione principale */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/dashboard" className="contents">
                    <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                    </Button>
                  </Link>
                  <Link href="/calendar" className="contents">
                    <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/clients" className="contents">
                    <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/booking-requests" className="contents">
                    <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md relative">
                      {hasPendingRequests && !isActive("/booking-requests")
                        ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" />
                        : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{t('navigation.requests')}</span>
                      {hasPendingRequests && !isActive("/booking-requests") && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>
                      )}
                    </Button>
                  </Link>
                </div>
                {/* Riga 2: strumenti */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/whatsapp-center" className="contents">
                    <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                    </Button>
                  </Link>
                  <Link href="/referral" className="contents">
                    <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" /><span className="truncate">{t('navigation.referral')}</span>
                    </Button>
                  </Link>
                  <Link href="/ai-chat" className="contents">
                    <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                    </Button>
                  </Link>
                  <Link href="/pro" className="contents">
                    <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                    </Button>
                  </Link>
                </div>
                {/* Riga 3: impostazioni + azioni */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/settings" className="contents">
                    <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center border border-white/25 rounded-md h-9"><LanguageSelector /></div>
                  <LogoutButton variant="secondary" className="w-full text-[11px] h-9 px-0 border border-white/25 rounded-md" iconPosition="right" />
                </div>
              </div>
            )}

            {/* ── PRO / BUSINESS mobile nav (non-admin, non-staff) ── */}
            {!isAdmin && !isStaff && hasProAccess && (
              <div className="flex flex-col w-full gap-1.5">
                {/* Riga 1: navigazione principale */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/dashboard" className="contents">
                    <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                    </Button>
                  </Link>
                  <Link href="/calendar" className="contents">
                    <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/clients" className="contents">
                    <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/booking-requests" className="contents">
                    <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md relative">
                      {hasPendingRequests && !isActive("/booking-requests")
                        ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" />
                        : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{t('navigation.requests')}</span>
                      {hasPendingRequests && !isActive("/booking-requests") && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>
                      )}
                    </Button>
                  </Link>
                </div>
                {/* Riga 2: strumenti PRO */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/whatsapp-center" className="contents">
                    <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                    </Button>
                  </Link>
                  <Link href="/ai-chat" className="contents">
                    <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                    </Button>
                  </Link>
                  <Link href="/pro" className="contents">
                    <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                    </Button>
                  </Link>
                </div>
                {/* Riga 3: impostazioni + azioni */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/settings" className="contents">
                    <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center border border-white/25 rounded-md h-9"><LanguageSelector /></div>
                  <LogoutButton variant="secondary" className="w-full text-[11px] h-9 px-0 border border-white/25 rounded-md" iconPosition="right" />
                </div>
              </div>
            )}

            {/* ── BASE / TRIAL mobile nav (non-admin, non-staff, no pro access) ── */}
            {!isAdmin && !isStaff && !hasProAccess && (
              <div className="flex flex-col w-full gap-1.5">
                {/* Riga 1: navigazione principale */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/dashboard" className="contents">
                    <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                    </Button>
                  </Link>
                  <Link href="/calendar" className="contents">
                    <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/clients" className="contents">
                    <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/booking-requests" className="contents">
                    <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md relative">
                      {hasPendingRequests && !isActive("/booking-requests")
                        ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" />
                        : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{t('navigation.requests')}</span>
                      {hasPendingRequests && !isActive("/booking-requests") && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>
                      )}
                    </Button>
                  </Link>
                </div>
                {/* Riga 2: strumenti base */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/whatsapp-center" className="contents">
                    <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                    </Button>
                  </Link>
                  <Link href="/ai-chat" className="contents">
                    <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                    </Button>
                  </Link>
                  <Link href="/pro" className="contents">
                    <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">↑ PRO</span>
                    </Button>
                  </Link>
                </div>
                {/* Riga 3: impostazioni + azioni */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/settings" className="contents">
                    <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                    </Button>
                  </Link>
                  <div className="flex items-center justify-center border border-white/25 rounded-md h-9"><LanguageSelector /></div>
                  <LogoutButton variant="secondary" className="w-full text-[11px] h-9 px-0 border border-white/25 rounded-md" iconPosition="right" />
                </div>
              </div>
            )}

            {/* ── ADMIN mobile nav — 4 | 4 | 3 | 2 ── */}
            {isAdmin && (
              <div className="flex flex-col w-full gap-1.5">
                {/* Riga 1: 4 voci navigazione */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/dashboard" className="contents">
                    <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Home className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.home')}</span>
                    </Button>
                  </Link>
                  <Link href="/calendar" className="contents">
                    <Button variant={isActive("/calendar") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('calendar.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/clients" className="contents">
                    <Button variant={isActive("/clients") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('clients.title')}</span>
                    </Button>
                  </Link>
                  <Link href="/booking-requests" className="contents">
                    <Button variant={isActive("/booking-requests") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md relative">
                      {hasPendingRequests && !isActive("/booking-requests") ? <Bell className="h-3.5 w-3.5 flex-shrink-0 text-amber-300 animate-bounce" /> : <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{t('navigation.requests')}</span>
                      {hasPendingRequests && !isActive("/booking-requests") && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>}
                    </Button>
                  </Link>
                </div>
                {/* Riga 2: 4 strumenti */}
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <Link href="/whatsapp-center" className="contents">
                    <Button variant={isActive("/whatsapp-center") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.notifications')}</span>
                    </Button>
                  </Link>
                  <Link href="/referral" className="contents">
                    <Button variant={isActive("/referral") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" /><span className="truncate">{t('navigation.referral')}</span>
                    </Button>
                  </Link>
                  <Link href="/ai-chat" className="contents">
                    <Button variant={isActive("/ai-chat") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" /><span className="truncate">{t('navigation.aiAssistant')}</span>
                    </Button>
                  </Link>
                  <Link href="/pro" className="contents">
                    <Button variant={isActive("/pro") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-300" /><span className="truncate">PRO</span>
                    </Button>
                  </Link>
                </div>
                {/* Riga 3: 3 voci admin */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <Link href="/staff-management" className="contents">
                    <Button variant={isActive("/staff-management") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <UserCog className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('navigation.staff')}</span>
                    </Button>
                  </Link>
                  <Link href="/payment-admin" className="contents">
                    <Button variant={isActive("/payment-admin") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <CreditCard className="h-3.5 w-3.5 flex-shrink-0 text-green-300" /><span className="truncate">{t('navigation.payments')}</span>
                    </Button>
                  </Link>
                  <Link href="/settings" className="contents">
                    <Button variant={isActive("/settings") ? "secondary" : "ghost"} size="sm" className="w-full h-9 flex items-center justify-center gap-1 px-1 text-[11px] border border-white/25 rounded-md">
                      <SettingsIcon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('settings.title')}</span>
                    </Button>
                  </Link>
                </div>
                {/* Riga 4: lingua + logout */}
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  <div className="flex items-center justify-center border border-white/25 rounded-md h-9"><LanguageSelector /></div>
                  <LogoutButton variant="secondary" className="w-full text-[11px] h-9 px-0 border border-white/25 rounded-md" iconPosition="right" />
                </div>
              </div>
            )}
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