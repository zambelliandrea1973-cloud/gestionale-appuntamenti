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
  Bell,
  FlaskConical,
  Menu,
  X
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
  const userRole = (userWithLicense as any)?.role;
  const hasEvShopAccess = userRole === 'ev_staff' || userRole === 'ev_admin';
  
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
              <div className="flex items-center gap-3 min-w-0">
                <UserIcon className="h-8 w-8 flex-shrink-0" userId={userWithLicense?.id} />
                <div className="flex flex-col min-w-0">
                  <h1 className="text-2xl font-bold whitespace-nowrap leading-tight">{appTitle || t('app.title')}</h1>
                  {(userWithLicense?.assignmentCode || userWithLicense?.professionistCode) && (
                    <span className="text-sm text-amber-200 font-mono leading-tight">
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
                  {/* Riga 3: EV Admin (ev_admin) + EV Shop (ev_staff/ev_admin) + lingua */}
                  <div className="flex justify-center gap-2">
                    {userRole === 'ev_admin' && (
                      <Link href="/ev-cosmetics/admin">
                        <Button variant={isActive("/ev-cosmetics/admin") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                          <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evAdmin')}</span>
                        </Button>
                      </Link>
                    )}
                    {hasEvShopAccess && (
                      <Link href="/ev-cosmetics/shop">
                        <Button variant={isActive("/ev-cosmetics/shop") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                          <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evShop')}</span>
                        </Button>
                      </Link>
                    )}
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
                  {/* Riga 3: EV Admin (ev_admin) + EV Shop (ev_staff/ev_admin) + lingua */}
                  <div className="flex justify-center gap-2">
                    {userRole === 'ev_admin' && (
                      <Link href="/ev-cosmetics/admin">
                        <Button variant={isActive("/ev-cosmetics/admin") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                          <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evAdmin')}</span>
                        </Button>
                      </Link>
                    )}
                    {hasEvShopAccess && (
                      <Link href="/ev-cosmetics/shop">
                        <Button variant={isActive("/ev-cosmetics/shop") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                          <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evShop')}</span>
                        </Button>
                      </Link>
                    )}
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
                  {/* Riga 3: EV Admin + EV Shop + impostazioni + lingua */}
                  <div className="flex justify-center gap-2">
                    <Link href="/ev-cosmetics/admin">
                      <Button variant={isActive("/ev-cosmetics/admin") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evAdmin')}</span>
                      </Button>
                    </Link>
                    <Link href="/ev-cosmetics/shop">
                      <Button variant={isActive("/ev-cosmetics/shop") ? "secondary" : "ghost"} size="sm" className="w-[120px] h-9 flex items-center justify-center gap-1.5 text-xs border border-white/25 rounded-md">
                        <FlaskConical className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" /><span className="truncate">{t('navigation.evShop')}</span>
                      </Button>
                    </Link>
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
          
          {/* Layout mobile — topbar compatto + hamburger */}
          <div className="flex md:hidden items-center gap-2 py-1">
            <UserIcon className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden" userId={userWithLicense?.id} />
            {/* Titolo + badge */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] font-bold leading-tight truncate">{appTitle || t('app.title')}</h1>
              {userWithLicense && (
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 leading-[18px] rounded-full text-[10px] font-semibold ${
                    (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'passepartout' ? 'bg-red-500 text-white' :
                    (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'pro' ? 'bg-amber-500 text-white' :
                    (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'business' ? 'bg-purple-500 text-white' :
                    (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'trial' ? 'bg-white/30 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {(userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'passepartout' ? 'Passepartout' :
                     (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'pro' ? 'Pro' :
                     (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'business' ? 'Business' :
                     (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'trial' ? 'Trial' :
                     (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'base' ? 'Base' : 'Standard'}
                  </span>
                  <span className="text-[10px] text-white/75">
                    {userWithLicense.type === 'admin' ? 'Admin' : userWithLicense.type === 'staff' ? 'Staff' : ''}
                  </span>
                </div>
              )}
            </div>
            {/* Campanella richieste pendenti */}
            {hasPendingRequests && (
              <Link href="/booking-requests" onClick={closeMobileMenu}>
                <button className="relative p-2 rounded-lg border border-white/25 hover:bg-white/10" aria-label={t('navigation.requests')}>
                  <Bell className="h-5 w-5 text-amber-300 animate-bounce" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{pendingCount}</span>
                </button>
              </Link>
            )}
            {/* Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg border border-white/25 hover:bg-white/10 flex-shrink-0"
              aria-label="Apri menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      {/* Pannello laterale */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 bg-primary text-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Intestazione drawer */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/20 flex-shrink-0">
          <UserIcon className="h-11 w-11 flex-shrink-0 rounded-xl overflow-hidden" userId={userWithLicense?.id} />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-tight truncate">{appTitle || t('app.title')}</h2>
            <p className="text-[11px] text-white/60 truncate mt-0.5">{userWithLicense?.username}</p>
            {userWithLicense && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`px-1.5 leading-[16px] rounded-full text-[10px] font-semibold ${
                  (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'passepartout' ? 'bg-red-500 text-white' :
                  (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'pro' ? 'bg-amber-500 text-white' :
                  (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'business' ? 'bg-purple-500 text-white' :
                  'bg-blue-400 text-white'
                }`}>
                  {(userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'passepartout' ? 'Passepartout' :
                   (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'pro' ? 'Pro' :
                   (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'business' ? 'Business' :
                   (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'trial' ? 'Trial' :
                   (userWithLicense.licenseType || userWithLicense.licenseInfo?.type) === 'base' ? 'Base' : 'Standard'}
                </span>
                {(userWithLicense.assignmentCode || userWithLicense.professionistCode) && (
                  <span className="text-[9px] font-mono border border-white/30 rounded px-1 text-amber-200">
                    {userWithLicense.assignmentCode || userWithLicense.professionistCode}
                  </span>
                )}
                {userWithLicense?.licenseInfo?.type === 'trial' && licenseInfo?.expiresAt && new Date(licenseInfo.expiresAt) > new Date() && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {Math.ceil((new Date(licenseInfo.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} {t('trial.days')}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={closeMobileMenu} className="p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0" aria-label="Chiudi menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Voci di navigazione */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* Voce helper */}
          {(() => {
            const NavItem = ({ href, icon: Icon, label, iconClass = "", badge = false }: { href: string; icon: any; label: string; iconClass?: string; badge?: boolean }) => (
              <Link href={href} onClick={closeMobileMenu}>
                <div className={`flex items-center gap-3 mx-2 px-3 py-3 rounded-xl cursor-pointer transition-colors ${isActive(href) ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}`}>
                  <div className="relative flex-shrink-0">
                    <Icon className={`h-5 w-5 ${iconClass}`} />
                    {badge && hasPendingRequests && !isActive(href) && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center animate-pulse">{pendingCount}</span>
                    )}
                  </div>
                  <span className="text-sm">{label}</span>
                </div>
              </Link>
            );
            return (
              <>
                <NavItem href="/dashboard" icon={Home} label={t('navigation.home')} />
                <NavItem href="/calendar" icon={CalendarDays} label={t('calendar.title')} />
                <NavItem href="/clients" icon={Users} label={t('clients.title')} />
                <NavItem href="/booking-requests" icon={hasPendingRequests ? Bell : ClipboardList} label={t('navigation.requests')} iconClass={hasPendingRequests ? 'text-amber-300 animate-bounce' : ''} badge={true} />
                <NavItem href="/whatsapp-center" icon={MessageSquare} label={t('navigation.notifications')} />
                {(isAdmin || isStaff) && <NavItem href="/referral" icon={CreditCard} label={t('navigation.referral')} iconClass="text-blue-300" />}
                <NavItem href="/ai-chat" icon={Sparkles} label={t('navigation.aiAssistant')} iconClass="text-cyan-300" />
                <NavItem href="/pro" icon={Crown} label="PRO" iconClass="text-amber-300" />
                {isAdmin && <NavItem href="/staff-management" icon={UserCog} label={t('navigation.staff')} />}
                {isAdmin && <NavItem href="/payment-admin" icon={CreditCard} label={t('navigation.payments')} iconClass="text-green-300" />}
                {(isAdmin || userRole === 'ev_admin') && <NavItem href="/ev-cosmetics/admin" icon={FlaskConical} label={t('navigation.evAdmin')} iconClass="text-violet-300" />}
                {(isAdmin || (isStaff && hasEvShopAccess)) && <NavItem href="/ev-cosmetics/shop" icon={FlaskConical} label={t('navigation.evShop')} iconClass="text-violet-300" />}
                <NavItem href="/settings" icon={SettingsIcon} label={t('settings.title')} />
              </>
            );
          })()}
        </nav>

        {/* Footer drawer: lingua + logout */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/20 flex-shrink-0">
          <div className="flex-1"><LanguageSelector /></div>
          <LogoutButton variant="secondary" className="text-sm h-9 px-3 border border-white/25 rounded-md" iconPosition="right" />
        </div>
      </div>

      {/* Contenuto principale */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6">
        <div className="bg-background text-foreground min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}