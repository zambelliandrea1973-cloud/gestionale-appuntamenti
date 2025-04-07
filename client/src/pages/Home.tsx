import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  Users, 
  BarChart,
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Grid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [_, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div className="text-center my-8">
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.img 
            src="/assets/fleur-de-vie.jpg" 
            alt="Fleur de Vie" 
            className="w-32 h-32 rounded-full shadow-lg object-cover border-4 border-primary/20"
            whileHover={{ rotate: 360, transition: { duration: 1.5 } }}
          />
        </motion.div>
        <motion.h1 
          className="text-3xl font-bold mb-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Benvenuto nella Gestione Appuntamenti
        </motion.h1>
        <motion.p 
          className="text-muted-foreground"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Gestisci facilmente gli appuntamenti, i clienti e le fatture
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="transition-all"
        >
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
                className="w-full group" 
                onClick={() => navigate("/calendar")}
              >
                Vai al Calendario
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="transition-all"
        >
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
                className="w-full group" 
                onClick={() => navigate("/clients")}
              >
                Gestisci Clienti
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="transition-all"
        >
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
                className="w-full group" 
                onClick={() => navigate("/invoices")}
              >
                Gestisci Fatture
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="transition-all"
        >
          <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
                className="w-full group" 
                onClick={() => navigate("/reports")}
              >
                Visualizza Report
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
