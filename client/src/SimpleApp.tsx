import * as React from 'react';

/**
 * Applicazione React estremamente semplificata (senza componenti esterni)
 */
function SimpleApp(): React.ReactElement {
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Roboto, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        marginBottom: '1.5rem', 
        color: '#4f46e5' 
      }}>
        Sistema di Gestione Appuntamenti
      </h1>
      
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 600, 
          marginBottom: '1rem' 
        }}>
          Icona Fleur de Vie
        </h2>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          margin: '2rem 0'
        }}>
          {/* Immagine con effetto rotazione (usando classe CSS) */}
          <img 
            src="/attached_assets/Fleur%20de%20Vie%20multicolore.jpg" 
            alt="Fleur de Vie"
            className="hover:rotate-30"
            style={{ 
              width: '250px', 
              height: '250px',
              borderRadius: '9999px',
              objectFit: 'cover',
              border: '4px solid #556b2f',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          />
          
          <p style={{
            textAlign: 'center',
            color: '#4b5563',
            marginTop: '1rem'
          }}>
            Passa il mouse sull'icona per vedere l'effetto di rotazione.
          </p>
        </div>
        
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Informazioni:</h3>
          <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.25rem' }}>
              Versione React: <code style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '0.25rem' 
              }}>{React.version}</code>
            </li>
            <li style={{ marginBottom: '0.25rem' }}>
              App React minimale (senza QueryClient o altri provider)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;