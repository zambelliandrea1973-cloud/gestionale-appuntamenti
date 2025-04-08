import React from 'react';
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import Layout from "./components/Layout";
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

// Componente separato per i percorsi client
function ClientRoutes() {
  return (
    <div className="client-routes">
      <Switch>
        <Route path="/activate" component={ActivateAccount} />
        <Route path="/client-login" component={ClientLogin} />
        <Route path="/client-area" component={ClientArea} />
        <Route path="/consent" component={ConsentPage} />
        <Route path="/direct-access" component={DirectAccess} />
        <Route path="/auto-login" component={AutoLogin} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// Componente separato per i percorsi admin
function AdminRoutes() {
  return (
    <Layout>
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
    </Layout>
  );
}

function Router() {
  // Usiamo window.location.pathname direttamente invece di useLocation
  const pathname = window.location.pathname;
  
  // Percorsi che non utilizzano il layout principale
  const isClientPath = 
    pathname.startsWith('/activate') || 
    pathname.startsWith('/client-login') || 
    pathname.startsWith('/client-area') || 
    pathname.startsWith('/consent') ||
    pathname.startsWith('/direct-access') ||
    pathname.startsWith('/auto-login');
  
  // Renderizziamo i percorsi appropriati in base al path
  return isClientPath ? <ClientRoutes /> : <AdminRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
