import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import FooterContactIcons from './FooterContactIcons';
import FooterContent from './FooterContent';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const hideOwnerContacts = new Set([
    '/login', '/staff-login', '/customer-login', '/register',
    '/forgot-password', '/reset-password',
  ]).has(location);
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header per il client più semplice */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium">{t('app.clientAreaTitle', 'Client Area')}</h1>
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
              &copy; {new Date().getFullYear()} Zambelli Andrea - G.A.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0">
              {!hideOwnerContacts && (
                <div className="flex items-center">
                  <FooterContactIcons />
                </div>
              )}

              {/* Links */}
              <FooterContent />
            </div>
          </div>
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}