import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fireGtagMilestone } from "@/lib/analytics";

interface Milestones {
  firstService?: string | null;
  firstClient?: string | null;
  firstAppointment?: string | null;
  subscription?: string | null;
  professionalActivated?: string | null;
}

const MILESTONE_MAP: Array<{ key: keyof Milestones; event: string }> = [
  { key: "firstService", event: "first_service_created" },
  { key: "firstClient", event: "first_customer_created" },
  { key: "firstAppointment", event: "first_appointment_created" },
  { key: "subscription", event: "subscription_purchased" },
  { key: "professionalActivated", event: "professional_activated" },
];

/**
 * Invisible background component.
 * Queries /api/analytics/milestones and fires gtag events
 * exactly once per session for any milestone that has been reached.
 * Milestones are set server-side (in route handlers + Stripe webhook),
 * so demo data and admin accounts never trigger them.
 */
export function FunnelTracker() {
  const fired = useRef<Set<string>>(new Set());

  const { data: milestones } = useQuery<Milestones>({
    queryKey: ["/api/analytics/milestones"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!milestones) return;
    for (const { key, event } of MILESTONE_MAP) {
      if (milestones[key] && !fired.current.has(event)) {
        fired.current.add(event);
        fireGtagMilestone(event);
      }
    }
  }, [milestones]);

  return null;
}
