import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar, Users, Bell, Star, CheckCircle2, ArrowRight,
  Scissors, Heart, Brain, Smile, Zap, Shield, Clock,
  Smartphone, Euro, MessageSquare, TrendingUp, Lock,
} from "lucide-react";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import fleurLogo from "../assets/fleur-de-vie.jpg";

const PROFESSIONI = [
  { icon: Scissors,   label: "Parrucchieri" },
  { icon: Heart,      label: "Estetiste" },
  { icon: Heart,      label: "Massaggiatori" },
  { icon: Brain,      label: "Psicologi" },
  { icon: Smile,      label: "Dentisti" },
  { icon: Zap,        label: "Osteopati" },
  { icon: Zap,        label: "Fisioterapisti" },
  { icon: Heart,      label: "Naturopati" },
  { icon: Smile,      label: "Nutrizionisti" },
  { icon: Brain,      label: "Coach & Consulenti" },
  { icon: Zap,        label: "Personal Trainer" },
  { icon: Heart,      label: "Tatuatori" },
];

const BENEFICI = [
  {
    icon: Calendar,
    title: "Agenda sempre con te",
    desc: "Gestisci appuntamenti da smartphone, tablet o PC. Visualizzazione giornaliera, settimanale e mensile con codice colore per servizio.",
  },
  {
    icon: Bell,
    title: "Promemoria automatici",
    desc: "I tuoi clienti ricevono un promemoria via WhatsApp o email prima dell'appuntamento. Dimentichi, ritardi e no-show si riducono fino all'80%.",
  },
  {
    icon: Users,
    title: "Scheda cliente completa",
    desc: "Anamnesi, allergie, note, storico appuntamenti, consensi GDPR. Tutto in un posto, accessibile in 2 secondi.",
  },
  {
    icon: Euro,
    title: "Fatturazione semplice",
    desc: "Genera preventivi e fatture in pochi clic. Tieni traccia dei pagamenti senza complicazioni.",
  },
  {
    icon: MessageSquare,
    title: "Prenotazione online",
    desc: "I clienti prenotano autonomamente dal link che condividi su Instagram o WhatsApp. Nessuna telefonata inutile.",
  },
  {
    icon: TrendingUp,
    title: "Report e statistiche",
    desc: "Scopri quali servizi rendono di più, chi sono i clienti più fedeli e come cresce il tuo studio mese per mese.",
  },
];

const FAQ = [
  {
    q: "Devo essere bravo con la tecnologia?",
    a: "No. L'app è pensata per chi ha poco tempo e vuole semplicità. In 10 minuti sei operativo. Se hai dubbi, la nostra assistenza risponde entro 24 ore.",
  },
  {
    q: "I miei dati e quelli dei miei clienti sono al sicuro?",
    a: "Sì. I dati sono salvati su server europei, crittografati e conformi al GDPR. Include anche i moduli di consenso per i tuoi clienti.",
  },
  {
    q: "Funziona anche senza connessione internet?",
    a: "La PWA permette di vedere l'agenda anche offline. Per modifiche e aggiornamenti è necessaria la connessione.",
  },
  {
    q: "Posso provarlo gratis?",
    a: "Sì, 40 giorni gratuiti senza carta di credito. Nessun addebito automatico alla scadenza.",
  },
  {
    q: "Posso gestire anche il mio personale?",
    a: "Sì. Puoi aggiungere collaboratori, assegnare appuntamenti e visualizzare le loro agende in un'unica schermata.",
  },
];

export default function ProfessionistiLandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useUserWithLicense();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const goRegister = () => setLocation("/register");
  const goLogin    = () => setLocation("/login");

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={fleurLogo} alt="Gestionale Appuntamenti" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-semibold text-sm hidden sm:inline">Gestionale Appuntamenti</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin}>Accedi</Button>
            <Button size="sm" className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white" onClick={goRegister}>
              Prova gratis
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#4a5e2a]/10 via-white to-[#4a5e2a]/5 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge className="bg-[#4a5e2a]/10 text-[#4a5e2a] border-[#4a5e2a]/20 hover:bg-[#4a5e2a]/10">
            ★ 5,0 su Google Play · 213 professionisti già iscritti
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Il gestionale appuntamenti<br className="hidden sm:block" />{" "}
            <span className="text-[#4a5e2a]">pensato per te</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Se lavori in proprio e offri servizi alla persona, smetti di gestire
            l'agenda su carta o su WhatsApp. In 10 minuti sei operativo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-8"
              onClick={goRegister}
            >
              Inizia gratis · 40 giorni
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 text-base"
              onClick={goLogin}
            >
              Ho già un account
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Nessuna carta di credito richiesta · Nessun addebito automatico
          </p>
        </div>
      </section>

      {/* ── PROFESSIONI ── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">
            Adatto a chi lavora in autonomia
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {PROFESSIONI.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
              >
                <div className="h-9 w-9 rounded-full bg-[#4a5e2a]/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#4a5e2a]" />
                </div>
                <span className="text-xs text-center font-medium text-gray-700 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICI ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Tutto quello che ti serve, niente di superfluo
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {BENEFICI.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#4a5e2a]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#4a5e2a]" />
                  </div>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-14 px-4 bg-[#4a5e2a] text-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">213</div>
              <div className="text-[#a8c060] text-sm mt-1">professionisti iscritti</div>
            </div>
            <div>
              <div className="text-4xl font-bold">5,0★</div>
              <div className="text-[#a8c060] text-sm mt-1">valutazione Google Play</div>
            </div>
            <div>
              <div className="text-4xl font-bold">40gg</div>
              <div className="text-[#a8c060] text-sm mt-1">gratis, senza carta</div>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { stars: 5, text: "Finalmente un'app che capisce il lavoro da soli. Lo uso ogni giorno per il mio studio di massaggi.", autore: "Lucia M. · Massaggiatrice" },
              { stars: 5, text: "Ho smesso di rispondere su WhatsApp per ogni prenotazione. I promemoria automatici mi hanno salvato.", autore: "Marco T. · Osteopata" },
              { stars: 5, text: "Semplice, veloce, professionale. Lo consiglio a tutti i parrucchieri.", autore: "Sara V. · Parrucchiera" },
            ].map(({ stars, text, autore }) => (
              <div key={autore} className="bg-white/10 rounded-xl p-4 space-y-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed">"{text}"</p>
                <p className="text-xs text-[#a8c060] font-medium">{autore}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHECKLIST ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Perché sceglierlo rispetto a carta e WhatsApp?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Agenda sempre aggiornata in tempo reale",
              "Promemoria WhatsApp automatici ai clienti",
              "Scheda cliente con anamnesi e consenso GDPR",
              "Prenotazione online senza telefonate",
              "Statistiche e report mensili",
              "Funziona su smartphone, tablet e PC",
              "Backup automatico dei tuoi dati",
              "Supporto dedicato in italiano",
            ].map((v) => (
              <div key={v} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#4a5e2a] shrink-0" />
                <span className="text-sm text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA CENTRALE ── */}
      <section className="py-14 px-4 bg-gradient-to-br from-[#4a5e2a]/10 via-white to-[#4a5e2a]/5">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-[#4a5e2a]" />
            <Shield className="h-4 w-4 text-[#4a5e2a]" />
            <Smartphone className="h-4 w-4 text-[#4a5e2a]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">Pronto a semplificare la tua agenda?</h2>
          <p className="text-gray-500 text-sm">
            40 giorni gratuiti. Nessuna carta di credito. Nessun addebito automatico.
            Puoi disdire in qualsiasi momento.
          </p>
          <Button
            size="lg"
            className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-10 w-full sm:w-auto"
            onClick={goRegister}
          >
            Crea il tuo account gratis
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-gray-400">
            Ci vogliono meno di 2 minuti · Nessuna installazione richiesta
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Domande frequenti</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-2">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 border-t border-gray-100 text-center text-xs text-gray-400 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <img src={fleurLogo} alt="Logo" className="h-6 w-6 rounded-full object-cover" />
          <span>Gestionale Appuntamenti · Castinox Srl</span>
        </div>
        <div className="flex justify-center gap-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">Termini di servizio</a>
          <button onClick={goLogin} className="hover:text-gray-600 transition-colors">Accedi</button>
        </div>
        <p>© {new Date().getFullYear()} Castinox Srl · P.IVA IT01234567890</p>
      </footer>
    </div>
  );
}
