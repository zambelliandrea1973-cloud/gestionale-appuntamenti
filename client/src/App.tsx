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

// Componenti che devono essere mostrati senza il layout dello staff
const noStaffLayoutRoutes = ['/activate', '/client-login', '/client-area'];

function AppRoutes() {
  return (
    <Switch>
      {/* Rotte con il layout dello staff */}
      <Route path="/">
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/clients" component={Clients} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route path="/client-medical-details" component={ClientMedicalDetails} />
            {/* Aggiungi qui altre rotte che usano il layout dello staff */}
          </Switch>
        </Layout>
      </Route>
      
      {/* Rotte senza layout dello staff */}
      <Route path="/activate" component={ActivateAccount} />
      <Route path="/client-login" component={ClientLogin} />
      <Route path="/client-area" component={ClientArea} />
      
      {/* Route fallback */}
      <Route path="/:rest*">
        <Layout>
          <NotFound />
        </Layout>
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
