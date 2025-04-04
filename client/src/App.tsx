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
import NotFound from "./pages/not-found";
import ActivateAccount from "./pages/ActivateAccount";
import ClientLogin from "./pages/ClientLogin";
import ClientArea from "./pages/ClientArea";

function Router() {
  return (
    <Switch>
      {/* Rotte per l'area cliente (senza Layout principale) */}
      <Route path="/activate" component={ActivateAccount} />
      <Route path="/client-login" component={ClientLogin} />
      <Route path="/client-area" component={ClientArea} />
      
      {/* Rotte per l'area admin */}
      <Route path="/">
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
      </Route>
    </Switch>
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
