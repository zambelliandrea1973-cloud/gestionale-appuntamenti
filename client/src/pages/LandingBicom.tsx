import { useState } from 'react';
import { Calendar, Users, Bell, Smartphone, Shield, Clock, CheckCircle, Mail, Phone, Globe, Star, Zap, BarChart3, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingBicom() {
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestionale Appuntamenti</h1>
              <p className="text-xs text-gray-500">Proposta Partnership BICOM</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Gennaio 2026</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Proposta Esclusiva per BICOM Italia
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Il Gestionale Perfetto per i<br />
            <span className="text-blue-600">Professionisti della Biorisonanza</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Offri ai tuoi clienti un valore aggiunto unico: un sistema completo per gestire 
            appuntamenti, pazienti e fatturazione, integrato con l'acquisto delle macchine BICOM.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowContact(true)}>
              <Mail className="mr-2 h-5 w-5" />
              Richiedi Demo Personalizzata
            </Button>
            <Button size="lg" variant="outline">
              <Phone className="mr-2 h-5 w-5" />
              +39 347 255 0110
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Perché BICOM Dovrebbe Offrire Questo Gestionale?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-blue-100 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Valore Aggiunto Unico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Differenziati dalla concorrenza offrendo non solo hardware, ma una soluzione 
                  completa. Il cliente riceve macchina + software gestionale.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Aumenta il Valore Percepito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Puoi aumentare il prezzo del bundle macchina+software, creando un margine 
                  aggiuntivo su ogni vendita.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100 hover:border-purple-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Fidelizzazione Clienti</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  I professionisti che usano il tuo software rimangono nel tuo ecosistema. 
                  Più engagement = più opportunità di upselling.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Funzionalità del Gestionale
          </h3>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Un sistema completo già pronto, testato e in produzione, 
            facilmente personalizzabile per le esigenze BICOM.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Agenda Appuntamenti', desc: 'Calendario intuitivo con vista giornaliera, settimanale e mensile' },
              { icon: Users, title: 'Gestione Pazienti', desc: 'Database completo con anamnesi, note mediche, storico trattamenti' },
              { icon: Bell, title: 'Notifiche Push', desc: 'Promemoria automatici via app, email e WhatsApp' },
              { icon: Smartphone, title: 'App Mobile (PWA)', desc: 'Funziona su Android e iOS senza installazione da store' },
              { icon: Shield, title: 'Area Cliente Dedicata', desc: 'Ogni paziente ha la sua area per vedere appuntamenti e documenti' },
              { icon: Clock, title: 'Prenotazione Online', desc: 'I pazienti prenotano autonomamente negli slot disponibili' },
              { icon: CheckCircle, title: 'Fatturazione Integrata', desc: 'Genera fatture PDF, gestisci pagamenti e incassi' },
              { icon: Globe, title: 'Multi-lingua', desc: 'Supporto per 9 lingue, perfetto per studi internazionali' },
              { icon: HeartPulse, title: 'Personalizzabile', desc: 'Adattabile alle specifiche esigenze della biorisonanza' },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Models */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Modelli di Partnership Proposti
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-gray-500 block mb-2">Opzione 1</span>
                  Licenza White-Label
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Branding BICOM completo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Dominio dedicato</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Supporto tecnico incluso</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Aggiornamenti continui</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">500-1.000€</p>
                  <p className="text-sm text-gray-500">/mese canone fisso</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Consigliato
              </div>
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-blue-600 block mb-2">Opzione 2</span>
                  Royalty per Vendita
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Nessun costo fisso iniziale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Paghi solo quando vendi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Rischio condiviso</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Scalabile con la crescita</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-blue-600">50-100€</p>
                  <p className="text-sm text-gray-500">/macchina venduta</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-gray-500 block mb-2">Opzione 3</span>
                  Modello Ibrido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Setup iniziale una tantum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Canone ridotto mensile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Personalizzazioni incluse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Formazione staff BICOM</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">Da definire</p>
                  <p className="text-sm text-gray-500">in base alle esigenze</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold mb-2">100%</p>
              <p className="text-blue-100">Cloud-based</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">9</p>
              <p className="text-blue-100">Lingue supportate</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">PWA</p>
              <p className="text-blue-100">Android + iOS</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">GDPR</p>
              <p className="text-blue-100">Compliant</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Parliamone Insieme
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Sono disponibile per una demo personalizzata e per discutere 
            il modello di partnership più adatto alle esigenze di BICOM.
          </p>
          
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="text-center md:text-left">
                  <p className="font-semibold text-gray-900">Andrea Zambelli</p>
                  <p className="text-gray-600">Sviluppatore & Founder</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="tel:+393472550110" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Phone className="h-4 w-4" />
                    +39 347 255 0110
                  </a>
                  <a href="mailto:zambelli.andrea.1973@gmail.com" className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            Proposta commerciale riservata - Gennaio 2026
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Gestionale Appuntamenti - Sistema di gestione per professionisti sanitari
          </p>
        </div>
      </footer>
    </div>
  );
}
