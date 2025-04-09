import React from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings as SettingsIcon, Smartphone, Image, Brush, Type } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import AppNameEditor from '@/components/AppNameEditor';

export default function Settings() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 h-8 w-8"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        </div>
        <p className="text-muted-foreground">
          Personalizza l'applicazione e configura le preferenze
        </p>
      </header>

      <Tabs defaultValue="app" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="app" className="flex items-center">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Generali
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <Brush className="mr-2 h-4 w-4" />
            Aspetto
          </TabsTrigger>
          <TabsTrigger value="client-app" className="flex items-center">
            <Smartphone className="mr-2 h-4 w-4" />
            App Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
              <CardDescription>
                Configura le impostazioni generali dell'applicazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Questa sezione è in fase di sviluppo. Presto saranno disponibili opzioni per personalizzare l'applicazione.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Personalizzazione Aspetto</CardTitle>
              <CardDescription>
                Personalizza l'aspetto dell'applicazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Questa sezione è in fase di sviluppo. Presto saranno disponibili opzioni per personalizzare i colori e l'aspetto dell'applicazione.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-app">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                Personalizzazione App Cliente
              </CardTitle>
              <CardDescription>
                Personalizza l'aspetto dell'app che i clienti installeranno sui loro dispositivi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center mb-4">
                  <Type className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Nome App</h3>
                </div>
                <AppNameEditor />
              </div>
              
              <Separator className="my-8" />
              
              <div>
                <div className="flex items-center mb-4">
                  <Image className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Icona App</h3>
                </div>
                <AppIconUploader />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}