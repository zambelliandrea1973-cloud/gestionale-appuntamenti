import * as React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import NotFound from "./pages/not-found";

function App() {
  // Componente di test molto semplice per verificare che React funzioni
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600">
          Sistema di Gestione Appuntamenti
        </h1>
        
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Diagnostica Applicazione</h2>
          <p className="mb-4">
            Versione React: <code className="bg-gray-100 px-2 py-1 rounded">{React.version}</code>
          </p>
          <p className="text-green-600 font-medium">
            ✅ Applicazione funzionante
          </p>
          
          <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="font-medium mb-2">Prossimi passi:</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Ristabilire i percorsi di routing</li>
              <li>Riconfigurare i componenti della UI</li>
              <li>Implementare la rotazione dell'icona "Fleur de Vie"</li>
            </ol>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
