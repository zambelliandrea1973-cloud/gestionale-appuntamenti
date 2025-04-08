import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { 
  CalendarDays, 
  Users, 
  BarChart, 
  Menu, 
  X, 
  FileText,
  Calendar,
  Clock,
  Grid,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import AppointmentForm from "./AppointmentForm";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const { t } = useTranslation();

  // Check active route
  const isActive = (path: string) => location === path;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <CalendarDays className="h-5 w-5" />
                  <h1 className="text-xl font-medium">{t('app.title')}</h1>
                </div>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Grid className="h-4 w-4" />
                  <span>{t('navigation.home')}</span>
                </Button>
              </Link>
            
              <Link href="/calendar">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Calendar className="h-4 w-4" />
                  <span>{t('calendar.title')}</span>
                </Button>
              </Link>
              
              <Link href="/clients">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <Users className="h-4 w-4" />
                  <span>{t('clients.title')}</span>
                </Button>
              </Link>
              
              <Link href="/invoices">
                <Button variant="ghost" className="flex items-center space-x-1 hover:bg-primary-dark">
                  <FileText className="h-4 w-4" />
                  <span>{t('invoices.title')}</span>
                </Button>
              </Link>
              
              <LanguageSelector />
              
              {/* Pulsante Nuovo Appuntamento rimosso come richiesto */}
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 py-4">
                  <h2 className="text-lg font-medium">Menu</h2>
                  <nav className="flex flex-col gap-2">
                    <Link href="/">
                      <Button variant={isActive("/") ? "secondary" : "ghost"} className="justify-start w-full">
                        Home
                      </Button>
                    </Link>
                    <Link href="/calendar">
                      <Button variant={isActive("/calendar") ? "secondary" : "ghost"} className="justify-start w-full">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {t('calendar.title')}
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button variant={isActive("/clients") ? "secondary" : "ghost"} className="justify-start w-full">
                        <Users className="mr-2 h-4 w-4" />
                        {t('clients.title')}
                      </Button>
                    </Link>
                    <Link href="/invoices">
                      <Button variant={isActive("/invoices") ? "secondary" : "ghost"} className="justify-start w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        {t('invoices.title')}
                      </Button>
                    </Link>
                    <Link href="/reports">
                      <Button variant={isActive("/reports") ? "secondary" : "ghost"} className="justify-start w-full">
                        <BarChart className="mr-2 h-4 w-4" />
                        {t('reports.title')}
                      </Button>
                    </Link>
                  </nav>
                  <div className="mt-4">
                    <LanguageSelector />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
              &copy; {new Date().getFullYear()} {t('app.title')}
            </div>
            <div className="flex space-x-4">
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.support', 'Supporto')}</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.terms', 'Termini di Servizio')}</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
