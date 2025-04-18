import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, Calendar, Clock, Monitor, ArrowDownWideNarrow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/dateUtils";

type ClientAccessesDetailsProps = {
  clientId: number;
  showTitle?: boolean;
};

type SortField = "date" | "time" | "userAgent";
type SortOrder = "asc" | "desc";

export default function ClientAccessesDetails({ clientId, showTitle = true }: ClientAccessesDetailsProps) {
  const { t, i18n } = useTranslation();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Query per recuperare gli accessi dettagliati per un client specifico
  const {
    data: accessesData,
    isLoading,
    isError
  } = useQuery({
    queryKey: [`/api/client-access/${clientId}`],
    enabled: !!clientId
  });

  const sortedAccesses = accessesData
    ? [...accessesData].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === "date") {
          comparison = new Date(a.accessDate).getTime() - new Date(b.accessDate).getTime();
        } else if (sortField === "time") {
          const timeA = new Date(a.accessDate).toTimeString();
          const timeB = new Date(b.accessDate).toTimeString();
          comparison = timeA.localeCompare(timeB);
        } else if (sortField === "userAgent") {
          comparison = (a.userAgent || "").localeCompare(b.userAgent || "");
        }
        
        return sortOrder === "asc" ? comparison : -comparison;
      })
    : [];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <ArrowDownWideNarrow className={`ml-1 h-3 w-3 ${sortOrder === "asc" ? "transform rotate-180" : ""}`} />
    );
  };

  const formatUserAgent = (userAgent: string) => {
    if (!userAgent) return t('clients.accesses.unknownDevice');
    
    // Formatta l'user agent per renderlo più leggibile
    if (userAgent.includes("Mobile")) return "Smartphone";
    if (userAgent.includes("Tablet")) return "Tablet";
    if (userAgent.includes("Windows")) return "PC Windows";
    if (userAgent.includes("Macintosh")) return "Mac";
    if (userAgent.includes("Linux")) return "PC Linux";
    
    return t('clients.accesses.browserAccess');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>{t('clients.accesses.loadingDetails')}</span>
      </div>
    );
  }

  if (isError || !accessesData) {
    return (
      <div className="text-center p-6 text-destructive">
        {t('clients.accesses.errorLoadingDetails')}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Eye className="h-5 w-5 mr-2 text-blue-500" />
            {t('clients.accesses.title')}
          </CardTitle>
          <CardDescription>
            {t('clients.accesses.description', { count: accessesData.length })}
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent>
        {accessesData.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('clients.accesses.noData')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("date")}>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {t('clients.accesses.date')}
                    {renderSortIcon("date")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("time")}>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {t('clients.accesses.time')}
                    {renderSortIcon("time")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("userAgent")}>
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 mr-1" />
                    {t('clients.accesses.device')}
                    {renderSortIcon("userAgent")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccesses.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    {formatDate(access.accessDate, i18n.language)}
                  </TableCell>
                  <TableCell>
                    {formatTime(access.accessDate)}
                  </TableCell>
                  <TableCell>
                    {formatUserAgent(access.userAgent || "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}