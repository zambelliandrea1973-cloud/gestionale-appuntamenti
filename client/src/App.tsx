import { Route, Router as WouterRouter, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
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
import NotFound from "./pages/not-found";

/**
 * Wrapper per le pagine client (senza il layout standard)
 */
function ClientPageWrapper({ children }: { children: React.ReactNode }) {
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
      {/* Pagine client senza layout standard */}
      <Route path="/activate">
        <ClientPageWrapper>
          <ActivateAccount />
        </ClientPageWrapper>
      </Route>
      <Route path="/client-login">
        <ClientPageWrapper>
          <ClientLogin />
        </ClientPageWrapper>
      </Route>
      <Route path="/client-area">
        <ClientPageWrapper>
          <ClientArea />
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
      <WouterRouter>
        <AppRoutes />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
