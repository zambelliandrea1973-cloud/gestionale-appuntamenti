import { Route, Switch, Router as WouterRouter } from "wouter";
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

function AppRouter() {
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
      <WouterRouter>
        <AppRouter />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
