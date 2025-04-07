import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import PageTransition from "./components/PageTransition";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import ClientMedicalDetails from "./pages/ClientMedicalDetails";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";
import ActivateAccount from "./pages/ActivateAccount";
import ClientLogin from "./pages/ClientLogin";
import ClientArea from "./pages/ClientArea";
import ConsentPage from "./pages/ConsentPage";
import DirectAccess from "./pages/DirectAccess";
import AutoLogin from "./pages/AutoLogin";

function Router() {
  // Utilizziamo l'hook useLocation di wouter
  const [location] = useLocation();
  
  // Percorsi che non utilizzano il layout principale
  const isClientPath = 
    location.startsWith('/activate') || 
    location.startsWith('/client-login') || 
    location.startsWith('/client-area') || 
    location.startsWith('/consent') ||
    location.startsWith('/direct-access') ||
    location.startsWith('/auto-login'); // Aggiungiamo il percorso di AutoLogin
  
  // Se è un percorso client, non utilizziamo il layout principale
  if (isClientPath) {
    return (
      <PageTransition location={location}>
        <Switch>
          <Route path="/activate" component={ActivateAccount} />
          <Route path="/client-login" component={ClientLogin} />
          <Route path="/client-area" component={ClientArea} />
          <Route path="/consent" component={ConsentPage} />
          <Route path="/direct-access" component={DirectAccess} />
          <Route path="/auto-login" component={AutoLogin} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    );
  }
  
  // Altrimenti utilizziamo il layout per l'area amministrativa
  return (
    <Layout>
      <PageTransition location={location}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/clients" component={Clients} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/reports" component={Reports} />
          <Route path="/client-medical-details" component={ClientMedicalDetails} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
