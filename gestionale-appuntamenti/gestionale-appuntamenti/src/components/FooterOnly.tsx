import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const FooterOnly: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-100 border-t border-gray-300 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-2 md:mb-0">
            &copy; {new Date().getFullYear()} Zambelli Andrea - G.A.
          </div>
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0">
            {/* Links */}
            <div className="flex space-x-4">
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.support', 'Supporto')}</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">Privacy Policy</Button>
              <Button variant="link" className="text-primary hover:text-primary-dark text-sm">{t('common.terms', 'Termini di Servizio')}</Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterOnly;