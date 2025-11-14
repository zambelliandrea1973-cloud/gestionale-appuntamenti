import * as React from 'react';
import { useState } from 'react';

// Import dell'immagine "Fleur de Vie" 
function FleurDeVieDemo() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Fleur de Vie - Effetto di Rotazione</h2>
      
      <div className="mb-6 relative">
        <img 
          src="/attached_assets/Fleur de Vie multicolore.jpg" 
          alt="Fleur de Vie"
          className="w-32 h-32 rounded-full object-cover hover:rotate-30"
        />
      </div>
      
      <p className="text-sm text-gray-600 text-center">
        Passa il mouse sull'immagine per vedere l'effetto di rotazione
      </p>
    </div>
  );
}

// Componente per la dashboard di base
function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendario
        </h3>
        <p className="text-gray-600 mb-4">
          Visualizza e gestisci gli appuntamenti in modalità giornaliera, settimanale o mensile.
        </p>
        <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors w-full flex items-center justify-center">
          <span>Vai al calendario</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Clienti
        </h3>
        <p className="text-gray-600 mb-4">
          Gestisci l'anagrafica clienti, visualizza e modifica i dati personali e medici.
        </p>
        <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors w-full flex items-center justify-center">
          <span>Gestisci clienti</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Componente principale dell'applicazione
function App() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-indigo-600">
        Sistema di Gestione Appuntamenti
      </h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <FleurDeVieDemo />
        </div>
        
        <div className="md:w-2/3">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Dashboard Demo</h2>
            <p className="text-gray-600 mb-6">
              Questa è una versione semplificata del sistema di gestione appuntamenti.
              L'interfaccia completa include funzionalità di calendario, gestione clienti,
              fatturazione e reportistica.
            </p>
            
            <Dashboard />
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Informazioni:
        </h3>
        <p className="text-sm text-gray-600">
          Versione React: <code className="bg-gray-100 px-2 py-1 rounded">{React.version}</code>
        </p>
      </div>
    </div>
  );
}

export default App;
