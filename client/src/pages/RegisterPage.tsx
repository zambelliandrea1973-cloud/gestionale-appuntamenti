import { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { addDays, format } from 'date-fns';
import { Loader2, User, CalendarCheck, Mail, Key, Info, Lock } from 'lucide-react';

const registerFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Il nome deve contenere almeno 2 caratteri',
  }),
  email: z.string().email({
    message: 'Inserisci un indirizzo email valido',
  }),
  username: z.string().min(4, {
    message: 'Lo username deve contenere almeno 4 caratteri',
  }),
  password: z.string().min(6, {
    message: 'La password deve contenere almeno 6 caratteri',
  }),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(value => value === true, {
    message: 'Devi accettare i termini e le condizioni',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/register', {
        name: values.name,
        email: values.email,
        username: values.username,
        password: values.password,
      });

      if (response.ok) {
        toast({
          title: 'Registrazione completata',
          description: 'Il tuo account è stato creato con successo. Ora puoi accedere.',
        });
        // Reindirizza alla pagina di login dopo un breve ritardo
        setTimeout(() => {
          setLocation('/login');
        }, 1500);
      } else {
        const error = await response.json();
        toast({
          title: 'Errore di registrazione',
          description: error.message || 'Si è verificato un errore durante la registrazione',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      toast({
        title: 'Errore di registrazione',
        description: 'Si è verificato un errore durante la registrazione. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcola la data di scadenza della prova gratuita (40 giorni da oggi)
  const trialEndDate = addDays(new Date(), 40);
  const formattedTrialEndDate = format(trialEndDate, 'dd/MM/yyyy');

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Form di registrazione */}
        <div className="w-full md:w-1/2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{t('register.title', 'Registrazione')}</CardTitle>
              <CardDescription>
                {t('register.subtitle', 'Crea un nuovo account per iniziare il periodo di prova gratuito di 40 giorni.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome e Cognome</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="Mario Rossi" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="email@esempio.com" 
                              type="email" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="il_tuo_username" 
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="••••••••" 
                              type={showPassword ? "text" : "password"}
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="••••••••" 
                              type={showPassword ? "text" : "password"}
                              className="pl-10" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-password"
                      checked={showPassword}
                      onCheckedChange={(checked) => setShowPassword(checked as boolean)}
                    />
                    <Label htmlFor="show-password">Mostra password</Label>
                  </div>
                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Accetto i <a href="#" className="text-primary underline">Termini e Condizioni</a> e la <a href="#" className="text-primary underline">Privacy Policy</a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrazione in corso...
                      </>
                    ) : (
                      'Registrati'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col items-center justify-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Hai già un account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setLocation('/login')}>
                  Accedi
                </Button>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Informazioni sul periodo di prova */}
        <div className="w-full md:w-1/2">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-8 space-y-6">
            <div className="flex flex-col items-center text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Prova gratuita di 40 giorni</h2>
              <p className="text-muted-foreground mb-4">
                Scopri tutte le funzionalità della nostra piattaforma senza alcun costo.
              </p>
              <div className="w-full max-w-xs bg-white/50 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Inizio prova:</span>
                  <span className="text-sm">{format(new Date(), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fine prova:</span>
                  <span className="text-sm font-bold">{formattedTrialEndDate}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Nessuna carta di credito richiesta per iniziare la prova.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CalendarCheck className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Gestisci i tuoi appuntamenti</h3>
                  <p className="text-sm text-muted-foreground">
                    Organizza facilmente il tuo calendario e traccia tutti gli appuntamenti in un'unica interfaccia.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <User className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Database clienti completo</h3>
                  <p className="text-sm text-muted-foreground">
                    Archivio dettagliato con tutte le informazioni dei clienti, comprese le schede mediche.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Notifiche automatiche</h3>
                  <p className="text-sm text-muted-foreground">
                    Sistema di promemoria automatico via email e WhatsApp per ridurre le cancellazioni.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Info className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Conversione automatica</h3>
                  <p className="text-sm text-muted-foreground">
                    Al termine del periodo di prova, scegli il piano più adatto alle tue esigenze per continuare.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}