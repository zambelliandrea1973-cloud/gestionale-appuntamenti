import { useEffect } from "react";
import { useLocation } from "wouter";
import { 
  CalendarDays, 
  Users, 
  BarChart,
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Grid,
  Flower
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [_, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div className="text-center my-8">
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-full shadow-lg bg-primary/10 border-4 border-primary/20 flex items-center justify-center icon-rotate">
            <Flower className="h-20 w-20 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Benvenuto nella Gestione Appuntamenti
        </h1>
        <p className="text-muted-foreground">
          Gestisci facilmente gli appuntamenti, i clienti e le fatture
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <Card className="h-full card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                Calendario
              </CardTitle>
              <CardDescription>
                Visualizza e gestisci tutti gli appuntamenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Visualizza gli appuntamenti in modalità giornaliera, settimanale o mensile, 
                e crea facilmente nuovi appuntamenti.
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/calendar")}
              >
                Vai al Calendario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Clienti
              </CardTitle>
              <CardDescription>
                Gestisci l'anagrafica dei clienti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Aggiungi, modifica e visualizza i dati dei clienti, 
                compresi i dati anagrafici e medici.
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/clients")}
              >
                Gestisci Clienti
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Fatture
              </CardTitle>
              <CardDescription>
                Gestisci fatture e pagamenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Crea e gestisci fatture, registra pagamenti e 
                monitora lo stato delle fatture in tempo reale.
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/invoices")}
              >
                Gestisci Fatture
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-primary" />
                Report
              </CardTitle>
              <CardDescription>
                Analizza l'andamento delle attività
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Visualizza report giornalieri, settimanali e mensili 
                per analizzare l'andamento delle attività.
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/reports")}
              >
                Visualizza Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
