import { ReactNode } from "react";
import { Link } from "wouter";
import { 
  CalendarDays, 
  Users, 
  FileText,
  Calendar,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

// Versione semplificata senza useState per evitare errori
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <h1 className="text-xl font-medium">Gestione Appuntamenti</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/calendar">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Calendar className="h-4 w-4" />
                  <span>Calendario</span>
                </Button>
              </Link>
              
              <Link href="/clients">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Users className="h-4 w-4" />
                  <span>Clienti</span>
                </Button>
              </Link>
              
              <Link href="/invoices">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <FileText className="h-4 w-4" />
                  <span>Fatture</span>
                </Button>
              </Link>
              
              <Link href="/settings">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Settings className="h-4 w-4" />
                  <span>Impostazioni</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Gestione Appuntamenti - Tutti i diritti riservati
            </div>
            <div className="flex space-x-4">
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Supporto</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Termini di Servizio</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
