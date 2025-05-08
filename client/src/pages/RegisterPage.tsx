import { useState } from "react";
import { useNavigate } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Verifica che le password corrispondano
    if (formData.password !== formData.confirmPassword) {
      setError("Le password non corrispondono");
      return;
    }
    
    // Verifica che tutti i campi siano compilati
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setError("Tutti i campi sono obbligatori");
      return;
    }
    
    // Verifica che la password sia abbastanza complessa
    if (formData.password.length < 8) {
      setError("La password deve essere lunga almeno 8 caratteri");
      return;
    }
    
    try {
      setLoading(true);
      
      // Invia richiesta di registrazione
      const response = await apiRequest("POST", "/api/register", {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Errore durante la registrazione");
      }
      
      // Registrazione riuscita, reindirizza alla pagina di login
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Form di registrazione */}
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Registrati</CardTitle>
            <CardDescription className="text-center">
              Crea un nuovo account e inizia a gestire i tuoi appuntamenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errore</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Inserisci il tuo nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Scegli un username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="La tua email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Crea una password sicura"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ripeti la password"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Registrazione in corso..." : "Registrati"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm">
            <div>Hai già un account? <a href="/login" className="text-primary hover:underline">Accedi</a></div>
          </CardFooter>
        </Card>
        
        {/* Sezione informativa */}
        <div className="hidden md:block p-6">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Gestisci i tuoi appuntamenti con semplicità
          </h2>
          <p className="text-lg mb-6">
            La nostra piattaforma ti permette di:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Gestire i tuoi appuntamenti in modo efficiente</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Inviare promemoria automatici ai tuoi clienti</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Organizzare i servizi che offri</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Gestire le fatture e i pagamenti</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Tenere traccia dei tuoi clienti e delle loro preferenze</span>
            </li>
          </ul>
          <div className="mt-6 text-sm text-muted-foreground">
            Registrandoti riceverai automaticamente un periodo di prova gratuito di 40 giorni.
          </div>
        </div>
      </div>
    </div>
  );
}