import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Download, Share, Menu, Plus, ArrowRight, ExternalLink } from "lucide-react";

export const InstallationGuide = () => {
  const [browserType, setBrowserType] = useState<"chrome" | "safari" | "firefox" | "edge" | "duckduckgo" | "other">("chrome");
  
  useEffect(() => {
    // Rileva automaticamente il browser
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("duckduckgo") > -1) {
      setBrowserType("duckduckgo");
    } else if (userAgent.indexOf("chrome") > -1 && userAgent.indexOf("edg") === -1) {
      setBrowserType("chrome");
    } else if (userAgent.indexOf("safari") > -1 && userAgent.indexOf("chrome") === -1) {
      setBrowserType("safari");
    } else if (userAgent.indexOf("firefox") > -1) {
      setBrowserType("firefox");
    } else if (userAgent.indexOf("edg") > -1) {
      setBrowserType("edge");
    } else {
      setBrowserType("other");
    }
  }, []);
  
  return (
    <Card className="mt-4 mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Come installare l'app sul tuo dispositivo</h2>
        
        <Tabs defaultValue={browserType} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chrome">Chrome</TabsTrigger>
            <TabsTrigger value="safari">Safari</TabsTrigger>
            <TabsTrigger value="edge">Edge</TabsTrigger>
            <TabsTrigger value="firefox">Firefox</TabsTrigger>
            <TabsTrigger value="duckduckgo">DuckDuckGo</TabsTrigger>
          </TabsList>
          
          {/* Istruzioni per Chrome */}
          <TabsContent value="chrome" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Istruzioni per Google Chrome:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">Clicca sui tre puntini</span> <Menu className="inline-block h-4 w-4" /> in alto a destra
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/Pnf9sMv.png" alt="Chrome menu" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Seleziona "Installa app..."</span> dal menu
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/WU8Q8UZ.png" alt="Chrome install" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Conferma</span> cliccando su "Installa" nel popup
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/BnvYjoH.png" alt="Chrome confirm" className="h-32 object-contain" />
                  </div>
                </li>
              </ol>
            </div>
          </TabsContent>
          
          {/* Istruzioni per Safari */}
          <TabsContent value="safari" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Istruzioni per Safari (iOS):</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">Tocca il pulsante Condividi</span> <Share className="inline-block h-4 w-4" /> in basso (iPhone) o in alto (iPad)
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/uDWkauZ.png" alt="Safari share" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Scorri e tocca "Aggiungi a Home"</span> <Plus className="inline-block h-4 w-4" />
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/ZMbLzpY.png" alt="Safari add to home" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Tocca "Aggiungi"</span> nell'angolo in alto a destra
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/q0SzPPI.png" alt="Safari confirm" className="h-32 object-contain" />
                  </div>
                </li>
              </ol>
            </div>
          </TabsContent>
          
          {/* Istruzioni per Edge */}
          <TabsContent value="edge" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Istruzioni per Microsoft Edge:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">Clicca sui tre puntini</span> <Menu className="inline-block h-4 w-4" /> in alto a destra
                </li>
                <li className="pb-2">
                  <span className="font-medium">Seleziona "App"</span> <ArrowRight className="inline-block h-4 w-4" /> <span className="font-medium">"Installa questo sito come app"</span>
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/ZdyhEhY.png" alt="Edge install" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Conferma</span> cliccando su "Installa" nel popup
                </li>
              </ol>
            </div>
          </TabsContent>
          
          {/* Istruzioni per Firefox */}
          <TabsContent value="firefox" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Istruzioni per Firefox:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">Clicca sul menu</span> <Menu className="inline-block h-4 w-4" /> in alto a destra
                </li>
                <li className="pb-2">
                  <span className="font-medium">Seleziona "+ Aggiungi alla schermata Home"</span>
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/GPiyIno.png" alt="Firefox add" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">Conferma</span> l'installazione
                </li>
              </ol>
            </div>
          </TabsContent>
          
          {/* Istruzioni per DuckDuckGo */}
          <TabsContent value="duckduckgo" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Istruzioni per DuckDuckGo:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">Tocca i tre puntini</span> <Menu className="inline-block h-4 w-4" /> in alto a destra
                </li>
                <li className="pb-2">
                  <span className="font-medium">Seleziona "Condividi"</span> <Share className="inline-block h-4 w-4" /> dal menu
                </li>
                <li className="pb-2">
                  <span className="font-medium">Scegli "Chrome"</span> <ExternalLink className="inline-block h-4 w-4" /> dall'elenco delle app
                </li>
                <li className="pb-2">
                  <span className="font-medium">In Chrome</span> vedrai apparire un banner o un pulsante di installazione
                </li>
                <li className="pb-2">
                  <span className="font-medium">Tocca "Installa"</span> per completare l'installazione
                </li>
              </ol>
              
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="font-medium text-amber-800 mb-2">Perché usare Chrome per l'installazione:</p>
                <p className="text-amber-700 text-sm">
                  DuckDuckGo non supporta direttamente l'installazione di PWA. Per questo motivo, è necessario
                  utilizzare Chrome che offre pieno supporto per l'installazione di app web sul tuo dispositivo.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-gray-500 mt-4 text-center">
          Nota: se le istruzioni non funzionano, prova a usare Chrome su Android o Safari su iOS che supportano meglio le PWA.
        </div>
      </CardContent>
    </Card>
  );
};