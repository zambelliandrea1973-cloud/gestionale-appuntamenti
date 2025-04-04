import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import ClientMedicalDetails from "./pages/ClientMedicalDetails";
import NotFound from "./pages/not-found";
import ActivateAccount from "./pages/ActivateAccount";
import ClientLogin from "./pages/ClientLogin";
import ClientArea from "./pages/ClientArea";
import ConsentPage from "./pages/ConsentPage";

function Router() {
  // Utilizziamo l'hook useLocation di wouter
  const [location] = useLocation();
  
  // Percorsi che non utilizzano il layout principale
  const isClientPath = 
    location.startsWith('/activate') || 
    location.startsWith('/client-login') || 
    location.startsWith('/client-area') || 
    location.startsWith('/consent');
  
  // Se è un percorso client, non utilizziamo il layout principale
  if (isClientPath) {
    return (
      <Switch>
        <Route path="/activate" component={ActivateAccount} />
        <Route path="/client-login" component={ClientLogin} />
        <Route path="/client-area" component={ClientArea} />
        <Route path="/consent" component={ConsentPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // Altrimenti utilizziamo il layout per l'area amministrativa
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/clients" component={Clients} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/reports" component={Reports} />
        <Route path="/client-medical-details" component={ClientMedicalDetails} />
        <Route component={NotFound} />
      </Switch>
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
