import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save, Loader2, Coffee } from "lucide-react";

const DAYS = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' },
];

interface WorkingHoursData {
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  lunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  timeSlotDuration: number;
}

export default function WorkingHoursEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WorkingHoursData>({
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    lunchBreakEnabled: false,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
    timeSlotDuration: 30,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/working-hours', {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const result = await response.json();
          setData({
            workingHoursStart: result.workingHoursStart || '09:00',
            workingHoursEnd: result.workingHoursEnd || '18:00',
            workingDays: result.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            lunchBreakEnabled: result.lunchBreakEnabled || false,
            lunchBreakStart: result.lunchBreakStart || '13:00',
            lunchBreakEnd: result.lunchBreakEnd || '14:00',
            timeSlotDuration: result.timeSlotDuration || 30,
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
          )}
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm font-medium">Durata slot appuntamenti (minuti)</Label>
          <select
            value={data.timeSlotDuration}
            onChange={e => setData(prev => ({ ...prev, timeSlotDuration: parseInt(e.target.value) }))}
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value={15}>15 minuti</option>
            <option value={30}>30 minuti</option>
            <option value={45}>45 minuti</option>
            <option value={60}>60 minuti</option>
            <option value={90}>90 minuti</option>
          </select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salva Orari di Lavoro
        </Button>
      </CardContent>
    </Card>
  );
}