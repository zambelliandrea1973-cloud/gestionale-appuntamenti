import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
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
import { LanguageSelector } from "@/components/ui/language-selector";

export default function Home() {
  const [_, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center my-8">
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-full shadow-lg bg-white border-4 border-primary/20 flex items-center justify-center overflow-hidden icon-rotate">
            <img 
              src="/icons/default-app-icon.jpg" 
              alt="Fleur de Vie multicolore" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {t('app.welcome')}
        </h1>
        <p className="text-muted-foreground">
          {t('app.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <Card className="h-full card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                {t('calendar.title')}
              </CardTitle>
              <CardDescription>
                {t('calendar.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {t('calendar.subDescription')}
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/calendar")}
              >
                {t('calendar.goTo')}
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
                {t('clients.title')}
              </CardTitle>
              <CardDescription>
                {t('clients.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {t('clients.subDescription')}
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/clients")}
              >
                {t('clients.goTo')}
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
                {t('invoices.title')}
              </CardTitle>
              <CardDescription>
                {t('invoices.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {t('invoices.subDescription')}
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/invoices")}
              >
                {t('invoices.goTo')}
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
                {t('reports.title')}
              </CardTitle>
              <CardDescription>
                {t('reports.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                {t('reports.subDescription')}
              </p>
              <Button 
                variant="outline" 
                className="w-full btn-with-icon" 
                onClick={() => navigate("/reports")}
              >
                {t('reports.goTo')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
