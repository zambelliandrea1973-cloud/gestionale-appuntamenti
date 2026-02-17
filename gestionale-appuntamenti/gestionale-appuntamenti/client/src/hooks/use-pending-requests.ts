import { useQuery } from "@tanstack/react-query";

interface BookingRequest {
  id: number;
  status: 'slots_proposed' | 'client_selected' | 'admin_confirmed' | 'rejected';
}

export function usePendingRequests() {
  const { data: requests = [], isLoading } = useQuery<BookingRequest[]>({
    queryKey: ['/api/booking-requests'],
    queryFn: async () => {
      const res = await fetch('/api/booking-requests', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const pendingCount = requests.filter(
    r => r.status === 'client_selected' || r.status === 'slots_proposed'
  ).length;

  return {
    pendingCount,
    isLoading,
    hasPendingRequests: pendingCount > 0
  };
}
