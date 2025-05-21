import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  Download,
  Calendar,
  UserCheck,
  Clock,
  Loader2,
  Crown,
  CalendarPlus,
  FileSpreadsheet,
  Receipt
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateForApi } from "@/lib/utils/date";
import ProFeatureGuard from "@/components/ProFeatureGuard";
import ProFeatureNavbar from "@/components/ProFeatureNavbar";

export default function Reports() {
  const { t } = useTranslation();
  
  return (
    <ProFeatureGuard 
      featureName="Report Statistici"
      description="I report dettagliati sull'attività sono disponibili nella versione PRO. Aggiorna il tuo piano per accedere a questa funzionalità."
    >
      <ReportsContent />
    </ProFeatureGuard>
  );
}

function ReportsContent() {
  const [reportType, setReportType] = useState("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aggregatedData, setAggregatedData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  
  // Create date range based on selected report type
  const getDateRange = () => {
    if (reportType === "weekly") {
      return {
        start: formatDateForApi(startOfWeek(selectedDate, { locale: it })),
        end: formatDateForApi(endOfWeek(selectedDate, { locale: it }))
      };
    } else if (reportType === "monthly") {
      return {
        start: formatDateForApi(startOfMonth(selectedDate)),
        end: formatDateForApi(endOfMonth(selectedDate))
      };
    } else {
      // For yearly, we use Jan 1 to Dec 31
      return {
        start: `${selectedDate.getFullYear()}-01-01`,
        end: `${selectedDate.getFullYear()}-12-31`
      };
    }
  };
  
  const { start, end } = getDateRange();
  
  // Fetch appointments for the selected date range
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: [`/api/appointments/range/${start}/${end}`],
  });
  
  // Fetch all services
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services'],
  });
  
  // Helper function to safely calculate revenue
  const calculateRevenue = (appointments) => {
    return appointments.reduce((sum, a) => {
      // Try to get price from service object first
      if (a.service && typeof a.service.price === 'number') {
        return sum + a.service.price;
      }
      // If service price is not available, use the service directly from services array
      const serviceData = services.find(s => s.id === a.serviceId);
      if (serviceData && typeof serviceData.price === 'number') {
        return sum + serviceData.price;
      }
      return sum;
    }, 0);
  };

  // Aggregate data for reports when appointments or report type changes
  useEffect(() => {
    if (appointments.length === 0 || isLoadingAppointments || isLoadingServices) return;
    
    if (reportType === "weekly") {
      // Aggregate by day of week
      const weekStart = startOfWeek(selectedDate, { locale: it });
      const weekDays = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(selectedDate, { locale: it })
      });
      
      const weeklyData = weekDays.map(day => {
        const dayStr = formatDateForApi(day);
        const dayAppointments = appointments.filter(a => a.date === dayStr);
        
        return {
          name: format(day, 'EEEE', { locale: it }),
          count: dayAppointments.length,
          revenue: calculateRevenue(dayAppointments),
          date: day
        };
      });
      
      setAggregatedData(weeklyData);
    } else if (reportType === "monthly") {
      // Aggregate by day of month
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const monthlyData = daysInMonth.map(day => {
        const dayStr = formatDateForApi(day);
        const dayAppointments = appointments.filter(a => a.date === dayStr);
        
        return {
          name: format(day, 'd', { locale: it }),
          count: dayAppointments.length,
          revenue: calculateRevenue(dayAppointments),
          date: day
        };
      });
      
      setAggregatedData(monthlyData);
    } else {
      // Aggregate by month for yearly report
      const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(selectedDate.getFullYear(), monthIndex, 1);
        const monthStr = format(monthDate, 'yyyy-MM');
        const monthAppointments = appointments.filter(a => a.date.startsWith(monthStr));
        
        return {
          name: format(monthDate, 'MMM', { locale: it }),
          count: monthAppointments.length,
          revenue: calculateRevenue(monthAppointments),
          date: monthDate
        };
      });
      
      setAggregatedData(monthlyData);
    }
    
    // Aggregate by service type
    const serviceAggregation = services.map(service => {
      const serviceAppointments = appointments.filter(a => a.serviceId === service.id);
      
      return {
        name: service.name,
        count: serviceAppointments.length,
        revenue: serviceAppointments.length * (service.price || 0),
        color: service.color || "#3f51b5"
      };
    }).filter(s => s.count > 0);
    
    setServiceData(serviceAggregation);
    
  }, [appointments, services, reportType, selectedDate, isLoadingAppointments, isLoadingServices]);
  
  // Navigation functions
  const goToPrevious = () => {
    if (reportType === "weekly") {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() - 7);
        return newDate;
      });
    } else if (reportType === "monthly") {
      setSelectedDate(prevDate => subMonths(prevDate, 1));
    } else {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setFullYear(newDate.getFullYear() - 1);
        return newDate;
      });
    }
  };
  
  const goToNext = () => {
    if (reportType === "weekly") {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + 7);
        return newDate;
      });
    } else if (reportType === "monthly") {
      setSelectedDate(prevDate => addMonths(prevDate, 1));
    } else {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setFullYear(newDate.getFullYear() + 1);
        return newDate;
      });
    }
  };
  
  const goToCurrent = () => {
    setSelectedDate(new Date());
  };
  
  // Title based on report type
  const getReportTitle = () => {
    if (reportType === "weekly") {
      const weekStart = startOfWeek(selectedDate, { locale: it });
      const weekEnd = endOfWeek(selectedDate, { locale: it });
      return `Settimana ${format(weekStart, 'd MMM', { locale: it })} - ${format(weekEnd, 'd MMM yyyy', { locale: it })}`;
    } else if (reportType === "monthly") {
      return format(selectedDate, 'MMMM yyyy', { locale: it });
    } else {
      return `Anno ${selectedDate.getFullYear()}`;
    }
  };
  
  // Calculate summary statistics
  const totalAppointments = aggregatedData.reduce((sum, day) => sum + day.count, 0);
  const totalRevenue = aggregatedData.reduce((sum, day) => sum + day.revenue, 0);
  const avgAppointmentsPerDay = totalAppointments / Math.max(aggregatedData.length, 1);
  
  // Get different colors for services
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B', '#6B66FF'];
  
  // Generate PDF report
  const generatePdfReport = () => {
    const reportTitle = getReportTitle();
    
    // Create printable version for download
    const printContent = `
      <html>
        <head>
          <title>Report - ${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
            h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; }
            .summary { margin-bottom: 20px; display: flex; justify-content: space-between; }
            .summary-item { padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; width: 30%; text-align: center; }
            .summary-item h3 { margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #666; }
            .summary-item p { margin: 0; font-size: 24px; font-weight: bold; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e0e0e0; }
            .data-table th { background-color: #f5f5f5; font-weight: bold; }
            .date { margin-top: 30px; text-align: right; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Report - ${reportTitle}</h1>
          
          <div class="summary">
            <div class="summary-item">
              <h3>Totale Appuntamenti</h3>
              <p>${totalAppointments}</p>
            </div>
            <div class="summary-item">
              <h3>Fatturato Totale</h3>
              <p>€${totalRevenue.toFixed(2)}</p>
            </div>
            <div class="summary-item">
              <h3>Media Giornaliera</h3>
              <p>${avgAppointmentsPerDay.toFixed(1)}</p>
            </div>
          </div>
          
          <h2>Dettaglio Appuntamenti</h2>
          <table class="data-table">
            <tr>
              <th>${reportType === "weekly" ? "Giorno" : reportType === "monthly" ? "Data" : "Mese"}</th>
              <th>Numero Appuntamenti</th>
              <th>Fatturato</th>
            </tr>
            ${aggregatedData.map(data => `
              <tr>
                <td>${data.name}</td>
                <td>${data.count}</td>
                <td>€${data.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Dettaglio Servizi</h2>
          <table class="data-table">
            <tr>
              <th>Servizio</th>
              <th>Numero Appuntamenti</th>
              <th>Fatturato</th>
            </tr>
            ${serviceData.map(service => `
              <tr>
                <td>${service.name}</td>
                <td>${service.count}</td>
                <td>€${service.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          
          <div class="date">
            Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
          </div>
        </body>
      </html>
    `;
    
    // Open printable version in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Print or save as PDF
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h2 className="text-2xl font-medium">Report</h2>
        
        <Button variant="outline" onClick={generatePdfReport}>
          <Download className="mr-2 h-4 w-4" />
          Scarica PDF
        </Button>
      </div>
      
      {/* Report Type Selector and Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <Tabs defaultValue="monthly" value={reportType} onValueChange={setReportType}>
          <TabsList>
            <TabsTrigger value="weekly">
              <Calendar className="h-4 w-4 mr-2" />
              Settimanale
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <Calendar className="h-4 w-4 mr-2" />
              Mensile
            </TabsTrigger>
            <TabsTrigger value="yearly">
              <Calendar className="h-4 w-4 mr-2" />
              Annuale
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToPrevious}
          >
            Precedente
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToCurrent}
          >
            Attuale
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToNext}
          >
            Successivo
          </Button>
        </div>
      </div>
      
      {/* Report Title */}
      <div className="text-center my-6">
        <h3 className="text-2xl font-bold">{getReportTitle()}</h3>
      </div>
      
      {/* Loading State */}
      {(isLoadingAppointments || isLoadingServices) && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {/* Summary Cards */}
      {!isLoadingAppointments && !isLoadingServices && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Totale Appuntamenti
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  {appointments.length === 0 
                    ? "Nessun appuntamento nel periodo" 
                    : `+${Math.round(totalAppointments / aggregatedData.length)} al giorno`}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fatturato Stimato
                </CardTitle>
                <BarChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {appointments.length === 0 
                    ? "Nessun appuntamento nel periodo" 
                    : `€${(totalRevenue / aggregatedData.length).toFixed(2)} al giorno`}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Media Giornaliera
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgAppointmentsPerDay.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  appuntamenti al giorno
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          {appointments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by Time Period */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Appuntamenti per {reportType === "weekly" ? "Giorno" : reportType === "monthly" ? "Data" : "Mese"}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aggregatedData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === "count") return [value, "Appuntamenti"];
                          if (name === "revenue") return [`€${value}`, "Fatturato"];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="count" name="Appuntamenti" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Services Breakdown */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Distribuzione Servizi</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="count"
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [`${value} appuntamenti`, props.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Revenue Chart */}
              <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Fatturato per {reportType === "weekly" ? "Giorno" : reportType === "monthly" ? "Data" : "Mese"}</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aggregatedData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`€${value}`, "Fatturato"]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Fatturato" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <BarChartIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun dato per il periodo selezionato</h3>
              <p className="text-gray-500 mb-4">
                Non ci sono appuntamenti registrati per il periodo indicato.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
