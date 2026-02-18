import { useState, useEffect, useMemo } from 'react';
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

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'IT', label: 'Italia' },
  { code: 'CH', label: 'Svizzera / Schweiz' },
  { code: 'DE', label: 'Deutschland' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'España' },
  { code: 'US', label: 'United States' },
  { code: 'NL', label: 'Nederland' },
  { code: 'NO', label: 'Norge' },
  { code: 'RO', label: 'România' },
  { code: 'RU', label: 'Россия' },
];

const LANG_TO_COUNTRY: Record<string, string> = {
  it: 'IT', en: 'US', de: 'DE', fr: 'FR', es: 'ES', ru: 'RU', nl: 'NL', no: 'NO', ro: 'RO',
};

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function fmt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function fmtFull(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

interface Holiday {
  date: Date;
  name: string;
  dateStr: string;
}

function getHolidays(country: string, year: number): Holiday[] {
  const easter = computeEaster(year);
  const easterMonday = addDays(easter, 1);
  const goodFriday = addDays(easter, -2);
  const ascension = addDays(easter, 39);
  const whitsun = addDays(easter, 49);
  const whitMonday = addDays(easter, 50);
  const corpusChristi = addDays(easter, 60);

  const fixed = (month: number, day: number, name: string): Holiday => {
    const d = new Date(year, month - 1, day);
    return { date: d, name, dateStr: fmt(d) };
  };
  const mobile = (d: Date, name: string): Holiday => ({ date: d, name, dateStr: fmt(d) });

  const nthWeekday = (month: number, weekday: number, n: number, name: string): Holiday => {
    const first = new Date(year, month - 1, 1);
    let dayOfWeek = first.getDay();
    let diff = (weekday - dayOfWeek + 7) % 7;
    const d = new Date(year, month - 1, 1 + diff + (n - 1) * 7);
    return { date: d, name, dateStr: fmt(d) };
  };

  const lastWeekday = (month: number, weekday: number, name: string): Holiday => {
    const last = new Date(year, month, 0);
    let dayOfWeek = last.getDay();
    let diff = (dayOfWeek - weekday + 7) % 7;
    const d = new Date(year, month - 1, last.getDate() - diff);
    return { date: d, name, dateStr: fmt(d) };
  };

  const holidays: Holiday[] = [];

  switch (country) {
    case 'IT':
      holidays.push(
        fixed(1, 1, 'Capodanno'),
        fixed(1, 6, 'Epifania'),
        mobile(easterMonday, 'Lunedì dell\'Angelo'),
        fixed(4, 25, 'Festa della Liberazione'),
        fixed(5, 1, 'Festa del Lavoro'),
        fixed(6, 2, 'Festa della Repubblica'),
        fixed(8, 15, 'Ferragosto'),
        fixed(11, 1, 'Tutti i Santi'),
        fixed(12, 8, 'Immacolata Concezione'),
        fixed(12, 25, 'Natale'),
        fixed(12, 26, 'Santo Stefano'),
      );
      break;
    case 'CH':
      holidays.push(
        fixed(1, 1, 'Neujahr / Capodanno'),
        fixed(1, 2, 'Berchtoldstag'),
        mobile(goodFriday, 'Karfreitag / Venerdì Santo'),
        mobile(easterMonday, 'Ostermontag / Lunedì di Pasqua'),
        mobile(ascension, 'Auffahrt / Ascensione'),
        mobile(whitMonday, 'Pfingstmontag / Lunedì di Pentecoste'),
        mobile(corpusChristi, 'Fronleichnam / Corpus Domini'),
        fixed(8, 1, 'Bundesfeiertag / Festa nazionale'),
        fixed(8, 15, 'Mariä Himmelfahrt / Assunzione'),
        fixed(11, 1, 'Allerheiligen / Ognissanti'),
        fixed(12, 25, 'Weihnachten / Natale'),
        fixed(12, 26, 'Stephanstag / Santo Stefano'),
      );
      break;
    case 'DE':
      holidays.push(
        fixed(1, 1, 'Neujahrstag'),
        mobile(goodFriday, 'Karfreitag'),
        mobile(easterMonday, 'Ostermontag'),
        fixed(5, 1, 'Tag der Arbeit'),
        mobile(ascension, 'Christi Himmelfahrt'),
        mobile(whitMonday, 'Pfingstmontag'),
        fixed(10, 3, 'Tag der Deutschen Einheit'),
        fixed(12, 25, 'Erster Weihnachtstag'),
        fixed(12, 26, 'Zweiter Weihnachtstag'),
      );
      break;
    case 'FR':
      holidays.push(
        fixed(1, 1, "Jour de l'An"),
        mobile(easterMonday, 'Lundi de Pâques'),
        fixed(5, 1, 'Fête du Travail'),
        fixed(5, 8, 'Victoire 1945'),
        mobile(ascension, 'Ascension'),
        mobile(whitMonday, 'Lundi de Pentecôte'),
        fixed(7, 14, 'Fête Nationale'),
        fixed(8, 15, 'Assomption'),
        fixed(11, 1, 'Toussaint'),
        fixed(11, 11, 'Armistice'),
        fixed(12, 25, 'Noël'),
      );
      break;
    case 'ES':
      holidays.push(
        fixed(1, 1, 'Año Nuevo'),
        fixed(1, 6, 'Epifanía'),
        mobile(goodFriday, 'Viernes Santo'),
        fixed(5, 1, 'Día del Trabajo'),
        fixed(8, 15, 'Asunción'),
        fixed(10, 12, 'Fiesta Nacional'),
        fixed(11, 1, 'Todos los Santos'),
        fixed(12, 6, 'Constitución'),
        fixed(12, 8, 'Inmaculada'),
        fixed(12, 25, 'Navidad'),
      );
      break;
    case 'US':
      holidays.push(
        fixed(1, 1, "New Year's Day"),
        nthWeekday(1, 1, 3, "Martin Luther King Jr. Day"),
        nthWeekday(2, 1, 3, "Presidents' Day"),
        lastWeekday(5, 1, "Memorial Day"),
        fixed(6, 19, "Juneteenth"),
        fixed(7, 4, "Independence Day"),
        nthWeekday(9, 1, 1, "Labor Day"),
        nthWeekday(10, 1, 2, "Columbus Day"),
        fixed(11, 11, "Veterans Day"),
        nthWeekday(11, 4, 4, "Thanksgiving Day"),
        fixed(12, 25, "Christmas Day"),
      );
      break;
    case 'NL':
      holidays.push(
        fixed(1, 1, 'Nieuwjaarsdag'),
        mobile(goodFriday, 'Goede Vrijdag'),
        mobile(easterMonday, 'Tweede Paasdag'),
        fixed(4, 27, 'Koningsdag'),
        mobile(ascension, 'Hemelvaartsdag'),
        mobile(whitMonday, 'Tweede Pinksterdag'),
        fixed(12, 25, 'Eerste Kerstdag'),
        fixed(12, 26, 'Tweede Kerstdag'),
      );
      break;
    case 'NO':
      holidays.push(
        fixed(1, 1, 'Nyttårsdag'),
        mobile(goodFriday, 'Langfredag'),
        mobile(easterMonday, 'Andre påskedag'),
        fixed(5, 1, 'Arbeidernes dag'),
        mobile(ascension, 'Kristi himmelfartsdag'),
        fixed(5, 17, 'Grunnlovsdag'),
        mobile(whitMonday, 'Andre pinsedag'),
        fixed(12, 25, 'Første juledag'),
        fixed(12, 26, 'Andre juledag'),
      );
      break;
    case 'RO':
      holidays.push(
        fixed(1, 1, 'Anul Nou'),
        fixed(1, 2, 'A doua zi de Anul Nou'),
        fixed(1, 24, 'Unirea Principatelor'),
        mobile(goodFriday, 'Vinerea Mare'),
        mobile(easterMonday, 'A doua zi de Paște'),
        fixed(5, 1, 'Ziua Muncii'),
        fixed(6, 1, 'Ziua Copilului'),
        mobile(whitMonday, 'A doua zi de Rusalii'),
        fixed(8, 15, 'Adormirea Maicii Domnului'),
        fixed(11, 30, 'Sf. Andrei'),
        fixed(12, 1, 'Ziua Națională'),
        fixed(12, 25, 'Crăciunul'),
        fixed(12, 26, 'A doua zi de Crăciun'),
      );
      break;
    case 'RU':
      holidays.push(
        fixed(1, 1, 'Новый год'),
        fixed(1, 7, 'Рождество'),
        fixed(2, 23, 'День защитника Отечества'),
        fixed(3, 8, 'Международный женский день'),
        fixed(5, 1, 'Праздник Весны и Труда'),
        fixed(5, 9, 'День Победы'),
        fixed(6, 12, 'День России'),
        fixed(11, 4, 'День народного единства'),
      );
      break;
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

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
          const lang = localStorage.getItem('i18nextLng')?.substring(0, 2) || 'it';
          const detectedCountry = LANG_TO_COUNTRY[lang] || 'IT';
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

  const currentYear = new Date().getFullYear();
  const currentHolidays = useMemo(() => {
    const thisYear = getHolidays(data.holidaysCountry, currentYear);
    const nextYear = getHolidays(data.holidaysCountry, currentYear + 1);
    const janNextYear = nextYear.filter(h => h.date.getMonth() === 0);
    return [...thisYear, ...janNextYear].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data.holidaysCountry, currentYear]);

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
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              {currentHolidays.length > 0 && (
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">
                    Festività {currentYear} + gennaio {currentYear + 1} — aggiornate automaticamente:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {currentHolidays.map((h, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{h.date.getFullYear() > currentYear ? fmtFull(h.date) : h.dateStr}</span> — {h.name}
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
