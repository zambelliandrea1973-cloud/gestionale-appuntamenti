import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

const FooterOnly: React.FC = () => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

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
              <Button 
                variant="link" 
                className="text-primary hover:text-primary-dark text-sm"
                onClick={() => window.location.href = 'mailto:support@gestionale-appuntamenti.it'}
                data-testid="button-support"
              >
                {t('common.support', 'Supporto')}
              </Button>
              <Button 
                variant="link" 
                className="text-primary hover:text-primary-dark text-sm"
                onClick={() => navigate('/privacy')}
                data-testid="button-privacy-policy"
              >
                Privacy Policy
              </Button>
              <Button 
                variant="link" 
                className="text-primary hover:text-primary-dark text-sm"
                onClick={() => navigate('/terms')}
                data-testid="button-terms-service"
              >
                {t('common.terms', 'Termini di Servizio')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterOnly;