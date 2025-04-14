import { Route, Router as WouterRouter, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import ClientLayout from "./components/ClientLayout";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import ClientMedicalDetails from "./pages/ClientMedicalDetails";
import ActivateAccount from "./pages/ActivateAccount";
import ClientLogin from "./pages/ClientLogin";
import ClientArea from "./pages/ClientArea";
import ConsentPage from "./pages/ConsentPage";
import TestSmsPage from "./pages/TestSmsPage";
import NotFound from "./pages/not-found";
import TimezoneDetector from "./components/TimezoneDetector";

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
      {/* Pagina di login client con layout cliente */}
      <Route path="/client-login">
        <ClientPageWrapper>
          <ClientLogin />
        </ClientPageWrapper>
      </Route>
      {/* Pagina area client con layout cliente */}
      <Route path="/client-area">
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
