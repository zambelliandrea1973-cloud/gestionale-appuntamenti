import { useQuery } from "@tanstack/react-query";

type DemoRow = {
  id: number;
  isDemo?: boolean;
};

interface DemoDataWatermarkProps {
  enabled: boolean;
  userId?: number;
}

export default function DemoDataWatermark({
  enabled,
  userId,
}: DemoDataWatermarkProps) {
  const { data: clients = [] } = useQuery<DemoRow[]>({
    queryKey: ["/api/clients"],
    enabled: enabled && Boolean(userId),
  });

  if (!enabled || !userId) return null;

  const hasDemoData = clients.some((client) => client.isDemo);
  const hasRealData = clients.some((client) => !client.isDemo);

  if (!hasDemoData || hasRealData) return null;

  return (
    <div className="demo-data-watermark" aria-hidden="true">
      <span>DATI DEMO</span>
    </div>
  );
}