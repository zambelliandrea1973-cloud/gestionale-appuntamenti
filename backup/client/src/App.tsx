import { Route, Router as WouterRouter, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import ClientLayout from "./components/ClientLayout";
import PwaSessionManager from "./components/PwaSessionManager";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import ClientMedicalDetails from "./pages/ClientMedicalDetails";
import ActivateAccount from "./pages/ActivateAccount";
import ClientLogin from "./pages/ClientLogin";
import AutoLogin from "./pages/AutoLogin";
import PwaLauncher from "./pages/PwaLauncher";
import ClientArea from "./pages/ClientArea";
import ConsentPage from "./pages/ConsentPage";
import TestSmsPage from "./pages/TestSmsPage";
import NotFound from "./pages/not-found";
import TimezoneDetector from "./components/TimezoneDetector";
import { useEffect } from "react";

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
 */
function StaffPageWrapper({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
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
      
      {/* Pagina di auto-login per PWA (metodo precedente, mantenuto per retrocompatibilità) */}
      <Route path="/auto-login">
        <ClientPageWrapper>
          <AutoLogin />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagina di login client con layout cliente */}
      <Route path="/client-login">
        <ClientPageWrapper>
          <ClientLogin />
        </ClientPageWrapper>
      </Route>
      
      {/* Alias per client-login (più intuitivo) */}
      <Route path="/login">
        <ClientPageWrapper>
          <ClientLogin />
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
      
      {/* Pagina consenso privacy con layout cliente */}
      <Route path="/consent">
        <ClientPageWrapper>
          <ConsentPage />
        </ClientPageWrapper>
      </Route>
      
      {/* Pagine staff con layout standard */}
      <Route path="/">
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
      <Route path="/test-sms">
        <StaffPageWrapper>
          <TestSmsPage />
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
            // Altrimenti, reindirizza alla pagina di login predefinita
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '') {
              console.log('Reindirizzamento alla pagina di login predefinita');
              window.location.href = event.data.defaultPath || '/client-login';
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
      {/* TimezoneDetector rileva il fuso orario del browser e lo sincronizza con il server */}
      <TimezoneDetector />
      <WouterRouter>
        <AppRoutes />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
