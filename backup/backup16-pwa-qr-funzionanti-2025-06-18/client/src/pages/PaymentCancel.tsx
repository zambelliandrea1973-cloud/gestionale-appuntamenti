import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCancel() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-amber-500" />
            {t('payment.cancel.title', 'Pagamento non completato')}
          </CardTitle>
          <CardDescription>
            {t('payment.cancel.description', 'Il processo di pagamento è stato interrotto o annullato.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-amber-50 text-amber-700 rounded-lg p-4 my-4">
            <p>{t('payment.cancel.info', 'Il tuo pagamento non è stato elaborato e non ti è stato addebitato alcun importo.')}</p>
            <p className="mt-2">{t('payment.cancel.retry', 'Puoi riprovare il pagamento in qualsiasi momento dalla pagina di abbonamento.')}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={() => navigate('/subscribe')}
            className="w-full"
            variant="default"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t('payment.cancel.tryAgain', 'Riprova il pagamento')}
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('payment.return', 'Torna alla dashboard')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}