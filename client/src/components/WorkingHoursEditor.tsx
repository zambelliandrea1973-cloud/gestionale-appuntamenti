import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save, Loader2, Coffee, CalendarOff, Info } from "lucide-react";

const DAYS = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' },
];

const LANG_TO_COUNTRY: Record<string, { code: string; label: string }> = {
  it: { code: 'IT', label: 'Italia' },
  en: { code: 'US', label: 'United States' },
  de: { code: 'DE', label: 'Deutschland' },
  fr: { code: 'FR', label: 'France' },
  es: { code: 'ES', label: 'España' },
  ru: { code: 'RU', label: 'Россия' },
  nl: { code: 'NL', label: 'Nederland' },
  no: { code: 'NO', label: 'Norge' },
  ro: { code: 'RO', label: 'România' },
};

const HOLIDAYS: Record<string, Array<{ date: string; name: string }>> = {
  IT: [
    { date: '01-01', name: 'Capodanno' },
    { date: '01-06', name: 'Epifania' },
    { date: '04-25', name: 'Festa della Liberazione' },
    { date: '05-01', name: 'Festa del Lavoro' },
    { date: '06-02', name: 'Festa della Repubblica' },
    { date: '08-15', name: 'Ferragosto' },
    { date: '11-01', name: 'Tutti i Santi' },
    { date: '12-08', name: 'Immacolata Concezione' },
    { date: '12-25', name: 'Natale' },
    { date: '12-26', name: 'Santo Stefano' },
  ],
  US: [
    { date: '01-01', name: "New Year's Day" },
    { date: '07-04', name: 'Independence Day' },
    { date: '11-11', name: "Veterans Day" },
    { date: '12-25', name: 'Christmas Day' },
  ],
  DE: [
    { date: '01-01', name: 'Neujahrstag' },
    { date: '05-01', name: 'Tag der Arbeit' },
    { date: '10-03', name: 'Tag der Deutschen Einheit' },
    { date: '12-25', name: 'Weihnachtstag' },
    { date: '12-26', name: 'Zweiter Weihnachtstag' },
  ],
  FR: [
    { date: '01-01', name: "Jour de l'An" },
    { date: '05-01', name: 'Fête du Travail' },
    { date: '05-08', name: 'Victoire 1945' },
    { date: '07-14', name: 'Fête Nationale' },
    { date: '08-15', name: 'Assomption' },
    { date: '11-01', name: 'Toussaint' },
    { date: '11-11', name: 'Armistice' },
    { date: '12-25', name: 'Noël' },
  ],
  ES: [
    { date: '01-01', name: 'Año Nuevo' },
    { date: '01-06', name: 'Epifanía' },
    { date: '05-01', name: 'Día del Trabajo' },
    { date: '08-15', name: 'Asunción' },
    { date: '10-12', name: 'Fiesta Nacional' },
    { date: '11-01', name: 'Todos los Santos' },
    { date: '12-06', name: 'Constitución' },
    { date: '12-08', name: 'Inmaculada' },
    { date: '12-25', name: 'Navidad' },
  ],
  RU: [
    { date: '01-01', name: 'Новый год' },
    { date: '01-07', name: 'Рождество' },
    { date: '02-23', name: 'День защитника Отечества' },
    { date: '03-08', name: 'Международный женский день' },
    { date: '05-01', name: 'Праздник Весны и Труда' },
    { date: '05-09', name: 'День Победы' },
    { date: '06-12', name: 'День России' },
    { date: '11-04', name: 'День народного единства' },
  ],
  NL: [
    { date: '01-01', name: 'Nieuwjaarsdag' },
    { date: '04-27', name: 'Koningsdag' },
    { date: '05-05', name: 'Bevrijdingsdag' },
    { date: '12-25', name: 'Kerstdag' },
    { date: '12-26', name: 'Tweede Kerstdag' },
  ],
  NO: [
    { date: '01-01', name: 'Nyttårsdag' },
    { date: '05-01', name: 'Arbeidernes dag' },
    { date: '05-17', name: 'Grunnlovsdag' },
    { date: '12-25', name: 'Første juledag' },
    { date: '12-26', name: 'Andre juledag' },
  ],
  RO: [
    { date: '01-01', name: 'Anul Nou' },
    { date: '01-24', name: 'Unirea Principatelor' },
    { date: '05-01', name: 'Ziua Muncii' },
    { date: '06-01', name: 'Ziua Copilului' },
    { date: '08-15', name: 'Adormirea Maicii Domnului' },
    { date: '11-30', name: 'Sf. Andrei' },
    { date: '12-01', name: 'Ziua Națională' },
    { date: '12-25', name: 'Crăciunul' },
    { date: '12-26', name: 'A doua zi de Crăciun' },
  ],
};

interface WorkingHoursData {
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  lunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  holidaysEnabled: boolean;
  holidaysCountry: string;
}

export default function WorkingHoursEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WorkingHoursData>({
    workingHoursStart: '08:00',
    workingHoursEnd: '22:00',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    lunchBreakEnabled: false,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
    holidaysEnabled: false,
    holidaysCountry: 'IT',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/working-hours', {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const result = await response.json();
          const detectedCountry = detectCountryFromLang();
          setData({
            workingHoursStart: result.workingHoursStart || '08:00',
            workingHoursEnd: result.workingHoursEnd || '22:00',
            workingDays: result.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            lunchBreakEnabled: result.lunchBreakEnabled || false,
            lunchBreakStart: result.lunchBreakStart || '13:00',
            lunchBreakEnd: result.lunchBreakEnd || '14:00',
            holidaysEnabled: result.holidaysEnabled || false,
            holidaysCountry: result.holidaysCountry || detectedCountry,
          });
        }
      } catch (error) {
        console.error('Errore caricamento orari:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const detectCountryFromLang = (): string => {
    const lang = localStorage.getItem('i18nextLng')?.substring(0, 2) || 'it';
    return LANG_TO_COUNTRY[lang]?.code || 'IT';
  };

  const toggleDay = (day: string) => {
    setData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/working-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast({ title: "Salvato", description: "Orari di lavoro aggiornati con successo" });
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile salvare gli orari", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentHolidays = HOLIDAYS[data.holidaysCountry] || [];

  if (loading) {
    return (
      <Card className="border">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <Clock className="mr-2 h-5 w-5 text-primary" />
          Orari di Lavoro
        </CardTitle>
        <CardDescription className="flex items-start gap-1.5 mt-1">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <span>Impostazioni opzionali — se non configurate, il calendario rimane aperto su tutti gli orari e giorni disponibili.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Ora inizio</Label>
            <input
              type="time"
              value={data.workingHoursStart}
              onChange={e => setData(prev => ({ ...prev, workingHoursStart: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Ora fine</Label>
            <input
              type="time"
              value={data.workingHoursEnd}
              onChange={e => setData(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 block">Giorni lavorativi</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  data.workingDays.includes(day.key)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Pausa pranzo</Label>
            </div>
            <Switch
              checked={data.lunchBreakEnabled}
              onCheckedChange={checked => setData(prev => ({ ...prev, lunchBreakEnabled: checked }))}
            />
          </div>
          {data.lunchBreakEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Inizio pausa</Label>
                  <input
                    type="time"
                    value={data.lunchBreakStart}
                    onChange={e => setData(prev => ({ ...prev, lunchBreakStart: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fine pausa</Label>
                  <input
                    type="time"
                    value={data.lunchBreakEnd}
                    onChange={e => setData(prev => ({ ...prev, lunchBreakEnd: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
                  />
                </div>
              </div>
              {(() => {
                const [sh, sm] = data.lunchBreakStart.split(':').map(Number);
                const [eh, em] = data.lunchBreakEnd.split(':').map(Number);
                const diff = (eh * 60 + em) - (sh * 60 + sm);
                if (diff <= 0) return (
                  <p className="text-xs text-destructive mt-1">L'orario di fine deve essere dopo l'inizio</p>
                );
                const hours = Math.floor(diff / 60);
                const mins = diff % 60;
                const label = hours > 0 && mins > 0 ? `${hours}h ${mins}min` : hours > 0 ? `${hours}h` : `${mins}min`;
                return (
                  <p className="text-xs text-muted-foreground mt-1">Durata pausa: <span className="font-medium">{label}</span></p>
                );
              })()}
            </>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Festività nazionali</Label>
            </div>
            <Switch
              checked={data.holidaysEnabled}
              onCheckedChange={checked => setData(prev => ({ ...prev, holidaysEnabled: checked }))}
            />
          </div>
          {data.holidaysEnabled && (
            <>
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Paese</Label>
                <select
                  value={data.holidaysCountry}
                  onChange={e => setData(prev => ({ ...prev, holidaysCountry: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
                >
                  {Object.entries(LANG_TO_COUNTRY).map(([, info]) => (
                    <option key={info.code} value={info.code}>{info.label}</option>
                  ))}
                </select>
              </div>
              {currentHolidays.length > 0 && (
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Giorni festivi che verranno bloccati:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {currentHolidays.map(h => (
                      <p key={h.date} className="text-xs text-muted-foreground">
                        <span className="font-medium">{h.date.replace('-', '/')}</span> — {h.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salva Orari di Lavoro
        </Button>
      </CardContent>
    </Card>
  );
}
