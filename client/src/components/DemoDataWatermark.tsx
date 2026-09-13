import { useQuery } from "@tanstack/react-query";

type DemoRow = {
  id: number;
  isDemo?: boolean;
};

interface DemoDataWatermarkProps {
  enabled: boolean;
  userId?: number;
}

export function useHasOnlyDemoClients(enabled: boolean, userId?: number) {
  const { data: clients = [] } = useQuery<DemoRow[]>({
    queryKey: ["/api/clients"],
    enabled: enabled && Boolean(userId),
  });

  if (!enabled || !userId) return false;

  const hasDemoData = clients.some((client) => client.isDemo);
  const hasRealData = clients.some((client) => !client.isDemo);
  return hasDemoData && !hasRealData;
}

export default function DemoDataWatermark({
  enabled,
  userId,
}: DemoDataWatermarkProps) {
  const hasOnlyDemoClients = useHasOnlyDemoClients(enabled, userId);
  if (!hasOnlyDemoClients) return null;

  return (
    <div className="demo-data-watermark" aria-hidden="true">
      <span>DATI DEMO</span>
    </div>
  );
}