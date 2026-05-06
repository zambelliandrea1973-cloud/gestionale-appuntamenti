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
  { icon: Scissors,   label: "Hairdressers" },
  { icon: Heart,      label: "Beauticians" },
  { icon: Heart,      label: "Masseurs" },
  { icon: Brain,      label: "Psychologists" },
  { icon: Smile,      label: "Dentists" },
  { icon: Zap,        label: "Osteopaths" },
  { icon: Zap,        label: "Physiotherapists" },
  { icon: Heart,      label: "Naturopaths" },
  { icon: Smile,      label: "Nutritionists" },
  { icon: Brain,      label: "Coaches & Consultants" },
  { icon: Zap,        label: "Personal Trainers" },
  { icon: Heart,      label: "Tattoo Artists" },
];

const BENEFICI = [
  {
    icon: Calendar,
    title: "Your schedule, always with you",
    desc: "Manage appointments from smartphone, tablet or PC. Daily, weekly and monthly views with color codes by service.",
  },
  {
    icon: Bell,
    title: "Automatic reminders",
    desc: "Your clients receive a reminder via WhatsApp or email before their appointment. No-shows and late arrivals drop by up to 80%.",
  },
  {
    icon: Users,
    title: "Complete client profile",
    desc: "Medical history, allergies, notes, appointment history, GDPR consents. Everything in one place, accessible in 2 seconds.",
  },
  {
    icon: Euro,
    title: "Simple billing",
    desc: "Generate quotes and invoices in a few clicks. Track payments without complications.",
  },
  {
    icon: MessageSquare,
    title: "Online booking",
    desc: "Clients book on their own from the link you share on Instagram or WhatsApp. No unnecessary phone calls.",
  },
  {
    icon: TrendingUp,
    title: "Reports and statistics",
    desc: "Discover which services perform best, who your most loyal clients are and how your practice grows month by month.",
  },
];

const FAQ = [
  {
    q: "Do I need to be tech-savvy?",
    a: "No. The app is designed for people with little time who want simplicity. You are up and running in 10 minutes. If you have questions, our support responds within 24 hours.",
  },
  {
    q: "Are my data and my clients' data safe?",
    a: "Yes. Data is stored on European servers, encrypted and GDPR-compliant. Consent forms for your clients are also included.",
  },
  {
    q: "Does it work without an internet connection?",
    a: "The PWA lets you view your schedule offline. An internet connection is required to make changes and receive updates.",
  },
  {
    q: "Can I try it for free?",
    a: "Yes, 40 days free with no credit card required. No automatic charges at the end of the trial.",
  },
  {
    q: "Can I also manage my staff?",
    a: "Yes. You can add collaborators, assign appointments and view their schedules in a single screen.",
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
            <img src={fleurLogo} alt="Appointment Manager" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-semibold text-sm hidden sm:inline">Appointment Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin}>Log in</Button>
            <Button size="sm" className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white" onClick={goRegister}>
              Try for free
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#4a5e2a]/10 via-white to-[#4a5e2a]/5 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge className="bg-[#4a5e2a]/10 text-[#4a5e2a] border-[#4a5e2a]/20 hover:bg-[#4a5e2a]/10">
            ★ 5.0 on Google Play · 213 professionals already registered
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            The appointment manager<br className="hidden sm:block" />{" "}
            <span className="text-[#4a5e2a]">built for you</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            If you work independently and offer personal services, stop managing
            your schedule on paper or WhatsApp. You are up and running in 10 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-8"
              onClick={goRegister}
            >
              Start free · 40 days
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 text-base"
              onClick={goLogin}
            >
              I already have an account
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            No credit card required · No automatic charges
          </p>
        </div>
      </section>

      {/* ── PROFESSIONI ── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">
            Designed for independent professionals
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
            Everything you need, nothing you don't
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
              <div className="text-[#a8c060] text-sm mt-1">registered professionals</div>
            </div>
            <div>
              <div className="text-4xl font-bold">5.0★</div>
              <div className="text-[#a8c060] text-sm mt-1">Google Play rating</div>
            </div>
            <div>
              <div className="text-4xl font-bold">40d</div>
              <div className="text-[#a8c060] text-sm mt-1">free, no card needed</div>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {[
              { stars: 5, text: "Finally an app that understands solo work. I use it every day for my massage studio.", autore: "Lucia M. · Masseuse" },
              { stars: 5, text: "I stopped answering WhatsApp for every booking. The automatic reminders saved me.", autore: "Marco T. · Osteopath" },
              { stars: 5, text: "Simple, fast, professional. I recommend it to all hairdressers.", autore: "Sara V. · Hairdresser" },
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
            Why choose it over paper and WhatsApp?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Schedule always up to date in real time",
              "Automatic WhatsApp reminders to clients",
              "Client profile with medical history and GDPR consent",
              "Online booking without phone calls",
              "Monthly statistics and reports",
              "Works on smartphone, tablet and PC",
              "Automatic backup of your data",
              "Dedicated support",
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
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to simplify your schedule?</h2>
          <p className="text-gray-500 text-sm">
            40 days free. No credit card. No automatic charges.
            Cancel at any time.
          </p>
          <Button
            size="lg"
            className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-10 w-full sm:w-auto"
            onClick={goRegister}
          >
            Create your free account
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-gray-400">
            Takes less than 2 minutes · No installation required
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
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
          <span>Appointment Manager · Castinox Srl</span>
        </div>
        <div className="flex justify-center gap-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          <button onClick={goLogin} className="hover:text-gray-600 transition-colors">Log in</button>
        </div>
        <p>© {new Date().getFullYear()} Castinox Srl · VAT IT01234567890</p>
      </footer>
    </div>
  );
}
