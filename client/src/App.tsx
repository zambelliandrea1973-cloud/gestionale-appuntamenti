import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import ClientLayout from "./components/ClientLayout";
import PwaSessionManager from "./components/PwaSessionManager";
import { BetaStatusChecker } from "./components/BetaStatusChecker";
import { UserLicenseProvider, useUserWithLicense } from "./hooks/use-user-with-license";
import { TenantContextProvider } from "./hooks/use-tenant-context";
import { useEffect } from "react";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import EmailSettings from "./pages/EmailSettings";
import ClientMedicalDetails from "./pages/ClientMedicalDetails";
import ActivateAccount from "./pages/ActivateAccount";

import AutoLogin from "./pages/AutoLogin";
import PwaLauncher from "./pages/PwaLauncher";

import ClientArea from "./pages/ClientArea";
import ConsentPage from "./pages/ConsentPage";
import TestNotificationsPage from "./pages/TestNotificationsPage";
import ClientAppointments from "./pages/ClientAppointments";
import BetaPage from "./pages/BetaPage";
import BetaAdmin from "./pages/BetaAdmin";
import PaymentAdmin from "./pages/PaymentAdmin";
import StaffManagementPageFixed from "./pages/StaffManagementPageFixed";
import SubscribePage from "./pages/SubscribePage";
import RegisterPage from "./pages/RegisterPage";
import StaffLogin from "./pages/StaffLogin";
import CustomerLogin from "./pages/CustomerLogin";
import NotificationsPage from "./pages/NotificationsPage";
import PhoneDeviceSetupPage from "./pages/PhoneDeviceSetupPage";
import SimplePhoneSetup from "./pages/SimplePhoneSetup";
import WhatsAppCenterPage from "./pages/WhatsAppCenterPage";
import GoogleSetupInstructionsPage from "./pages/GoogleSetupInstructionsPage";
import GoogleTroubleshootingPage from "./pages/GoogleTroubleshootingPage";
import ProFeaturesPage from "./pages/ProFeaturesPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentPage from "./pages/PaymentPage";
import WelcomePage from "./pages/WelcomePage";
import ReferralCommissionsPage from "./pages/ReferralCommissionsPage";
import BankingSettingsPage from "./pages/BankingSettingsPage";
import OnboardingWizard from "./pages/OnboardingWizard";

import NotFound from "./pages/not-found";
import { TimezoneDetector } from "./components/TimezoneDetector";

/**
 * Wrapper per le pagine client (con layout cliente)
 */
function ClientPageWrapper({ children }: { children: React.ReactNode }) {
  // Utilizziamo il layout cliente per le pagine dell'area client
  return <ClientLayout>{children}</ClientLayout>;
}

/**
 * Wrapper per le pagine di attivazione (senza layout)
 */
function ActivationPageWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Wrapper per le pagine staff (con il layout standard)
 * Include anche il controllo per gli utenti beta
 */
function StaffPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}

function AppRoutes() {
  // Hook per ottenere dati utente e licenza
  const { user, isLoading } = useUserWithLicense();
  const [location, setLocation] = useLocation();
  
  // Effetto per reindirizzare SOLO gli utenti non autenticati dalle pagine protette alla home
  useEffect(() => {
    // Percorsi che sono sempre accessibili anche senza autenticazione
    const publicPaths = [
      '/activate', '/pwa', '/auto-login', 
      '/staff-login', '/customer-login', '/register', '/client-area', 
      '/consent', '/'
    ];
    
    // Percorsi dedicati ai clienti finali (pazienti) - NON devono essere gestiti dal sistema staff
    const clientOnlyPaths = [
      '/client-area', '/auto-login', '/pwa', '/consent', '/activate'
    ];
    
    // Aspetta che il caricamento delle informazioni utente sia completo
    if (!isLoading) {
      console.log('Stato autenticazione:', { user: !!user, location, isLoading });
      
      // Se siamo su un percorso dedicato ai clienti, NON applicare la logica di autenticazione staff
      if (clientOnlyPaths.includes(location)) {
        console.log('Percorso cliente rilevato, salto controlli autenticazione staff');
        return;
      }
      
      // SOLO se l'utente NON è autenticato e sta cercando di accedere a una pagina protetta
      if (!user && !publicPaths.includes(location)) {
        console.log('Utente non autenticato su pagina protetta, reindirizzamento a /');
        setLocation('/');
      }
      
      // Non facciamo altri reindirizzamenti automatici
      // Il reindirizzamento dopo il login è gestito direttamente dalle pagine di login
    }
  }, [user, isLoading, location, setLocation]);

  return (
    <Switch>
      {/* Pagina di attivazione senza layout */}
      <Route path="/activate">
        <ActivationPageWrapper>
          <ActivateAccount />
        </ActivationPageWrapper>
      </Route>
      
      {/* Pagina di avvio PWA semplificata */}
      <Route path="/pwa">
        <ClientPageWrapper>
          <PwaLauncher />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina di attivazione QR - Route principale per link QR */}
      <Route path="/activate">
        <ClientPageWrapper>
          <AutoLogin />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina di auto-login per PWA (metodo precedente, mantenuto per retrocompatibilità) */}
      <Route path="/auto-login">
        <ClientPageWrapper>
          <AutoLogin />
        </ClientPageWrapper>
      </Route>
      

      
      {/* Pagina di login staff */}
      <Route path="/staff-login">
        <ClientPageWrapper>
          <StaffLogin />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina di login customer (professionisti abbonati) */}
      <Route path="/customer-login">
        <ClientPageWrapper>
          <CustomerLogin />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina di registrazione nuovo account */}
      <Route path="/register">
        <ClientPageWrapper>
          <RegisterPage />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina area client con layout cliente */}
      <Route path="/client-area">
        <ClientPageWrapper>
          <PwaSessionManager>
            <ClientArea />
          </PwaSessionManager>
        </ClientPageWrapper>
      </Route>
      
      {/* AREA CLIENTE senza protezione password - accesso diretto con QR */}
      <Route path="/client/:token?">
        <ClientPageWrapper>
          <ClientArea />
        </ClientPageWrapper>
      </Route>
      
      <Route path="/client">
        <ClientPageWrapper>
          <ClientArea />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina consenso privacy con layout cliente */}
      <Route path="/consent">
        <ClientPageWrapper>
          <ConsentPage />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina iniziale (Welcome) con layout specifico della pagina */}
      <Route path="/">
        <WelcomePage />
      </Route>
      
      {/* Interactive AI-Powered Onboarding Wizard */}
      <Route path="/onboarding">
        <StaffPageWrapper>
          <OnboardingWizard />
        </StaffPageWrapper>
      </Route>
      
      {/* Dashboard principale (spostata da root a /dashboard) */}
      <Route path="/dashboard">
        <StaffPageWrapper>
          <Home />
        </StaffPageWrapper>
      </Route>
      <Route path="/calendar">
        <StaffPageWrapper>
          <Calendar />
        </StaffPageWrapper>
      </Route>
      <Route path="/clients">
        <StaffPageWrapper>
          <Clients />
        </StaffPageWrapper>
      </Route>
      <Route path="/invoices">
        <StaffPageWrapper>
          <Invoices />
        </StaffPageWrapper>
      </Route>
      <Route path="/reports">
        <StaffPageWrapper>
          <Reports />
        </StaffPageWrapper>
      </Route>
      <Route path="/settings">
        <StaffPageWrapper>
          <Settings />
        </StaffPageWrapper>
      </Route>
      <Route path="/client-medical-details">
        <StaffPageWrapper>
          <ClientMedicalDetails />
        </StaffPageWrapper>
      </Route>
      <Route path="/test-notifications">
        <StaffPageWrapper>
          <TestNotificationsPage />
        </StaffPageWrapper>
      </Route>
      {/* Manteniamo temporaneamente la rotta vecchia per retrocompatibilità */}
      <Route path="/test-sms">
        <StaffPageWrapper>
          <TestNotificationsPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Nuove rotte per beta test e abbonamento */}
      <Route path="/beta">
        <StaffPageWrapper>
          <BetaPage />
        </StaffPageWrapper>
      </Route>
      <Route path="/beta-admin">
        <StaffPageWrapper>
          <BetaAdmin />
        </StaffPageWrapper>
      </Route>
      <Route path="/payment-admin">
        <StaffPageWrapper>
          <PaymentAdmin />
        </StaffPageWrapper>
      </Route>
      <Route path="/staff-management">
        <StaffPageWrapper>
          <StaffManagementPageFixed />
        </StaffPageWrapper>
      </Route>
      <Route path="/subscribe">
        <StaffPageWrapper>
          <SubscribePage />
        </StaffPageWrapper>
      </Route>
      <Route path="/referral">
        <StaffPageWrapper>
          <ReferralCommissionsPage />
        </StaffPageWrapper>
      </Route>
      <Route path="/banking-settings">
        <StaffPageWrapper>
          <BankingSettingsPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Pagine per il risultato dei pagamenti */}
      <Route path="/payment/success">
        <StaffPageWrapper>
          <PaymentSuccess />
        </StaffPageWrapper>
      </Route>
      
      <Route path="/payment/cancel">
        <StaffPageWrapper>
          <PaymentCancel />
        </StaffPageWrapper>
      </Route>
      
      {/* Centro notifiche WhatsApp unificato */}
      <Route path="/notifications">
        <StaffPageWrapper>
          <WhatsAppCenterPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Route alternative che reindirizzano al nuovo centro WhatsApp unificato */}
      <Route path="/phone-device-setup">
        <StaffPageWrapper>
          <WhatsAppCenterPage />
        </StaffPageWrapper>
      </Route>
      
      <Route path="/simple-phone-setup">
        <StaffPageWrapper>
          <WhatsAppCenterPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Route per la nuova pagina del Centro WhatsApp */}
      <Route path="/whatsapp-center">
        <StaffPageWrapper>
          <WhatsAppCenterPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Pagina di istruzioni per la configurazione di Google Calendar */}
      <Route path="/google-setup">
        <StaffPageWrapper>
          <GoogleSetupInstructionsPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Pagina di risoluzione problemi Google */}
      <Route path="/google-troubleshooting">
        <StaffPageWrapper>
          <GoogleTroubleshootingPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Pagina delle funzionalità PRO */}
      <Route path="/pro">
        <StaffPageWrapper>
          <ProFeaturesPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Alias per la pagina delle funzionalità PRO */}
      <Route path="/pro-features">
        <StaffPageWrapper>
          <ProFeaturesPage />
        </StaffPageWrapper>
      </Route>
      
      {/* Pagina delle impostazioni email */}
      <Route path="/email-settings">
        <StaffPageWrapper>
          <EmailSettings />
        </StaffPageWrapper>
      </Route>

      {/* Route per visualizzare gli appuntamenti di un cliente */}
      <Route path="/clients/:id/appointments">
        <StaffPageWrapper>
          <ClientAppointments />
        </StaffPageWrapper>
      </Route>


      
      {/* Fallback route */}
      <Route>
        <StaffPageWrapper>
          <NotFound />
        </StaffPageWrapper>
      </Route>
    </Switch>
  );
}

function App() {
  // Gestione dei messaggi dal service worker per PWA - Versione semplificata per QR code
  useEffect(() => {
    // Ascolta messaggi dal service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Messaggio ricevuto dal Service Worker:', event.data);
      
      // Se il service worker viene attivato e dobbiamo reindirizzare
      if (event.data && event.data.type === 'SW_ACTIVATED' && event.data.redirectOnLaunch) {
        // Controlliamo se siamo in una PWA installata
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        if (isPWA) {
          // Verifichiamo se abbiamo dati QR salvati
          const qrData = localStorage.getItem('qrData');
          const qrLink = localStorage.getItem('qrLink');
          
          if (qrLink) {
            // Se abbiamo un link QR, reindirizza direttamente lì
            console.log('Reindirizzamento al link QR salvato:', qrLink);
            window.location.href = qrLink;
          } else if (qrData) {
            // Se abbiamo dati QR, reindirizza alla pagina di attivazione con i dati
            console.log('Reindirizzamento alla pagina di attivazione con dati QR');
            window.location.href = `/activate?data=${encodeURIComponent(qrData)}`;
          } else {
            // Altrimenti, reindirizza alla pagina principale
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '') {
              console.log('Reindirizzamento alla pagina principale');
              window.location.href = event.data.defaultPath || '/';
            }
          }
        }
      }
      
      // Salva i dati QR nel localStorage
      if (event.data && event.data.type === 'STORE_QR_DATA_LOCALLY' && event.data.qrData) {
        console.log('Salvataggio dati QR nel localStorage');
        localStorage.setItem('qrData', event.data.qrData);
        
        // Opzionalmente, se il qrData contiene un link diretto, lo salviamo separatamente
        try {
          const data = JSON.parse(event.data.qrData);
          if (data.link) {
            localStorage.setItem('qrLink', data.link);
            
            // Salviamo anche come URL originale per compatibilità
            localStorage.setItem('originalUrl', data.link);
            console.log('URL originale salvato:', data.link);
          }
        } catch (e) {
          // Se non è JSON o non ha un campo link, ignoriamo
        }
      }
      
      // Salva l'URL originale nel localStorage
      if (event.data && event.data.type === 'STORE_ORIGINAL_URL' && event.data.url) {
        console.log('Salvataggio URL originale nel localStorage:', event.data.url);
        localStorage.setItem('originalUrl', event.data.url);
      }
    };
    
    // Registra il listener
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      // Rimuovi il listener quando il componente viene smontato
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {/* UserLicenseProvider fornisce le informazioni sulla licenza e l'utente corrente */}
      <UserLicenseProvider>
        {/* TimezoneDetector DEVE essere dentro i provider React per evitare errori hooks */}
        <TimezoneDetector />
        {/* TenantContextProvider fornisce isolamento completo dei dati per ogni utente */}
        <TenantContextProvider>
          {/* BetaStatusChecker verifica se l'utente è un beta tester - DEVE essere dentro UserLicenseProvider */}
          <BetaStatusChecker />
          <WouterRouter>
            <AppRoutes />
          </WouterRouter>
        </TenantContextProvider>
      </UserLicenseProvider>
    </QueryClientProvider>
  );
}

export default App;
