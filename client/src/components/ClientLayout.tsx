import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';
import FooterContactIcons from './FooterContactIcons';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header per il client più semplice */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">{t('app.clientAreaTitle', 'Area Clienti')}</h1>
          </div>
        </div>
      </header>

      {/* Contenuto principale */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Zambelli Andrea - {t('app.title')}
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0">
              {/* Icone dei contatti */}
              <div className="flex items-center">
                <FooterContactIcons />
              </div>
              
              {/* Separatore - visibile solo se ci sono icone */}
              <div id="footer-client-separator" className="hidden md:block h-6 w-px bg-gray-300 mx-2"></div>

              <script dangerouslySetInnerHTML={{ __html: `
                // Nascondi il separatore se non ci sono icone di contatto
                function updateSeparator() {
                  const icons = document.querySelector('.flex.space-x-4');
                  const separator = document.getElementById('footer-client-separator');
                  if (separator) {
                    separator.style.display = icons ? 'block' : 'none';
                  }
                }
                
                // Controlla all'avvio e ogni 5 secondi
                updateSeparator();
                setInterval(updateSeparator, 5000);

                // Ascolta l'evento personalizzato
                window.addEventListener('contactInfoUpdated', updateSeparator);
              `}} />

              {/* Links */}
              <div className="flex space-x-4">
                <a href="#" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}