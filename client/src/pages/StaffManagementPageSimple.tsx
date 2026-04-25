import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPageSimple() {
  const { t } = useTranslation();
  console.log("🔥 SIMPLE PAGE: Componente caricato!");
  
  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
    queryFn: async () => {
      console.log("🔥 SIMPLE PAGE: Chiamata API");
      const response = await fetch('/api/staff/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("🔥 SIMPLE PAGE: Dati ricevuti:", data);
      return data;
    },
  });

  console.log("🔥 SIMPLE PAGE: Rendering, isLoading:", isLoading, "error:", error, "staffUsers:", staffUsers);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('i18nFinale.staffManagementSimple.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Errore: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('i18nFinale.staffSimple.pageTitle')}</h1>
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {t('i18nFinale.staffSimple.pageLoadedSuccess', { count: staffUsers.length })}
      </div>
      
      <div className="space-y-4">
        {staffUsers.map((user: StaffUser) => (
          <div key={user.id} className="border p-4 rounded-lg">
            <h3 className="font-bold">{user.username}</h3>
            <p>Email: {user.email}</p>
            <p>Ruolo: {user.role}</p>
            <p>Codice referral: {user.referralCode}</p>
          </div>
        ))}
      </div>
    </div>
  );
}