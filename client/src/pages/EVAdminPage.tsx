// @ts-nocheck
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle as XCircleIcon, Truck } from "lucide-react";
import {
  Package, ShoppingCart, TrendingUp, FlaskConical, BarChart2,
  Percent, ChevronDown, ChevronUp, Settings, Lock, Shield, ShieldAlert,
  User, UserCog, Eye, EyeOff, ChevronRight, Sliders, Users,
  CheckCircle2, XCircle, AlertCircle, Crown, Briefcase, Mail, Phone,
  Menu, X, CreditCard, Building2, Save, RefreshCw, PieChart,
  PlusCircle, Trash2, Upload, ImageIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart as RechartsPie, Pie, Cell,
} from "recharts";

const F = "https://cdn.shopify.com/s/files/1/0657/6259/0955/files/";
const P = "https://cdn.shopify.com/s/files/1/0657/6259/0955/products/";

const PRODUCTS = [
  {code:"EL",name:"Elisir",desc:"Antiaging · Idratante",zone:"Viso e Corpo",color:"#c9a5d4",cat:"Spray",img:F+"IMG-5290.jpg",minPrice:22,maxPrice:75},
  {code:"RE",name:"Repair",desc:"Seboequilibrante",zone:"Viso e Corpo",color:"#7ab8cc",cat:"Spray",img:F+"IMG-5286.jpg",minPrice:22,maxPrice:75},
  {code:"DE",name:"Detox",desc:"Detossinante",zone:"Viso e Corpo",color:"#9ab87a",cat:"Spray",img:F+"IMG-5291.jpg",minPrice:22,maxPrice:75},
  {code:"EA",name:"Energy Activator",desc:"Idratante",zone:"Viso e Corpo",color:"#d4b87a",cat:"Spray",img:F+"IMG-5288.jpg",minPrice:22,maxPrice:56},
  {code:"LL",name:"Lift Lotion",desc:"Liftante",zone:"Viso e Corpo",color:"#7a8ec9",cat:"Spray",img:F+"IMG-5293.jpg",minPrice:22,maxPrice:75},
  {code:"SH",name:"Shine",desc:"Illuminante",zone:"Viso e Corpo",color:"#d4b030",cat:"Spray",img:F+"IMG-5289.jpg",minPrice:22,maxPrice:75},
  {code:"BF",name:"Body Flow",desc:"Drenante",zone:"Corpo",color:"#7accc0",cat:"Spray",img:F+"IMG-5294.jpg",minPrice:22,maxPrice:75},
  {code:"BS",name:"Body Slim",desc:"Anticellulite",zone:"Corpo",color:"#cc8a7a",cat:"Spray",img:F+"IMG-5295.jpg",minPrice:22,maxPrice:75},
  {code:"LB",name:"Lipo Burner",desc:"Snellente",zone:"Corpo",color:"#a07acc",cat:"Spray",img:F+"IMG-5296.jpg",minPrice:22,maxPrice:75},
  {code:"PC",name:"Piede Curato",desc:"Defaticante",zone:"Piedi",color:"#7acc8a",cat:"Spray",img:F+"IMG-5292.jpg",minPrice:22,maxPrice:56},
  {code:"HG",name:"Hair Genesis",desc:"Anticaduta",zone:"Capelli",color:"#cca07a",cat:"Spray",img:F+"IMG-5287.jpg",minPrice:22,maxPrice:56},
  {code:"OEL",name:"Olio Elisir",desc:"Massaggio antiaging",zone:"Corpo",color:"#c9a5d4",cat:"Oli",img:F+"IMG-5316.jpg",minPrice:37,maxPrice:37},
  {code:"OLL",name:"Olio Lift Lotion",desc:"Massaggio liftante",zone:"Corpo",color:"#7a8ec9",cat:"Oli",img:F+"IMG-5318.jpg",minPrice:37,maxPrice:37},
  {code:"OBF",name:"Olio Body Flow",desc:"Drenante",zone:"Corpo",color:"#7accc0",cat:"Oli",img:F+"IMG-5320.jpg",minPrice:37,maxPrice:37},
  {code:"OBS",name:"Olio Body Slim",desc:"Rassodante",zone:"Corpo",color:"#cc8a7a",cat:"Oli",img:F+"IMG-5321.jpg",minPrice:37,maxPrice:37},
  {code:"OLB",name:"Olio Lipo Burner",desc:"Snellente",zone:"Corpo",color:"#a07acc",cat:"Oli",img:F+"IMG-5319.jpg",minPrice:37,maxPrice:37},
  {code:"SVA",name:"Siero Vit. A",desc:"Rigenerante",zone:"Viso",color:"#f4a261",cat:"Sieri",img:F+"IMG-5309.jpg",minPrice:49,maxPrice:49},
  {code:"SVC",name:"Siero Vit. C",desc:"Antiossidante",zone:"Viso",color:"#f4e285",cat:"Sieri",img:F+"IMG-5311.jpg",minPrice:49,maxPrice:49},
  {code:"SVE",name:"Siero Vit. E",desc:"Antiossidante",zone:"Viso",color:"#b5e48c",cat:"Sieri",img:F+"IMG-5313.jpg",minPrice:49,maxPrice:49},
  {code:"SVK",name:"Siero Vit. K",desc:"Anti-rossori",zone:"Viso",color:"#90e0ef",cat:"Sieri",img:F+"IMG-5315.jpg",minPrice:49,maxPrice:49},
  {code:"CCI",name:"Crema Corpo Idr.",desc:"Idratante",zone:"Corpo",color:"#d4c5a9",cat:"Creme",img:F+"Untitleddesign-6_f31568cd-65c3-4cd7-a144-03fb0c486fc7.png",minPrice:36,maxPrice:36},
  {code:"CCR",name:"Crema Rimodellante",desc:"Anticellulite",zone:"Corpo",color:"#c9b8a8",cat:"Creme",img:F+"Untitleddesign-6_14545a03-51c2-4359-907d-dfc8a865b33e.png",minPrice:46,maxPrice:46},
  {code:"CRE",name:"Crema Rigenera",desc:"Antiage",zone:"Viso",color:"#e8c4b8",cat:"Creme",img:F+"Untitleddesign-6_aa91481e-4d23-4e87-8bb6-eacfc3f41edb.png",minPrice:47,maxPrice:47},
  {code:"CVT",name:"Crema + Vitamine",desc:"Nutriente",zone:"Viso",color:"#f0e6b2",cat:"Creme",img:F+"Untitleddesign-14.png",minPrice:45,maxPrice:45},
  {code:"FGE",name:"Fango Gel",desc:"Rassodante",zone:"Corpo",color:"#b5c4b1",cat:"Creme",img:F+"Untitleddesign-6_d626cc21-afed-4ff2-a0ce-dcc4cfe88ede.png",minPrice:38,maxPrice:38},
];

type DiscountTier = { label: string; min: number; pct: number };
const DEFAULT_TIERS: DiscountTier[] = [
  { label:"1–4 pz", min:1,  pct:20 },
  { label:"5–9 pz", min:5,  pct:22 },
  { label:"10–19 pz", min:10, pct:25 },
  { label:"20+ pz", min:20, pct:30 },
];


type StaffRole = "reception"|"estetista"|"massaggiatore";
type StaffMember = { id:number; name:string; email:string; phone:string; role:StaffRole; avatar:string; active:boolean; isSecondaryAdmin:boolean; adminSince?:string };

const STAFF_INIT: StaffMember[] = [
  {id:1,name:"Martina Colombo",email:"m.colombo@evcosmetics.it",phone:"338 1234567",role:"reception",avatar:"MC",active:true,isSecondaryAdmin:true,adminSince:"15/03/2026"},
  {id:2,name:"Sara Ferretti",email:"s.ferretti@evcosmetics.it",phone:"347 2345678",role:"estetista",avatar:"SF",active:true,isSecondaryAdmin:false},
  {id:3,name:"Giulia Moretti",email:"g.moretti@evcosmetics.it",phone:"333 4567890",role:"estetista",avatar:"GM",active:true,isSecondaryAdmin:true,adminSince:"01/05/2026"},
  {id:4,name:"Laura Ricci",email:"l.ricci@evcosmetics.it",phone:"391 5678901",role:"massaggiatore",avatar:"LR",active:true,isSecondaryAdmin:false},
  {id:5,name:"Paola Mancini",email:"p.mancini@evcosmetics.it",phone:"320 3456789",role:"estetista",avatar:"PM",active:false,isSecondaryAdmin:false},
];

const statusColor: Record<string,string> = {confermato:"bg-blue-100 text-blue-700",in_attesa:"bg-amber-100 text-amber-700",spedito:"bg-purple-100 text-purple-700",consegnato:"bg-emerald-100 text-emerald-700"};
const statusLabel: Record<string,string> = {confermato:"Confermato",in_attesa:"In attesa",spedito:"Spedito",consegnato:"Consegnato"};
const roleLabel: Record<StaffRole,string> = {reception:"Receptionist",estetista:"Estetista",massaggiatore:"Massaggiatore"};
const roleColor: Record<StaffRole,string> = {reception:"bg-blue-100 text-blue-700",estetista:"bg-pink-100 text-pink-700",massaggiatore:"bg-teal-100 text-teal-700"};
const TIER_RING: Record<string,string> = {gray:"bg-gray-100 text-gray-600 border-gray-200",blue:"bg-blue-100 text-blue-700 border-blue-200",emerald:"bg-emerald-100 text-emerald-700 border-emerald-200",violet:"bg-violet-100 text-violet-700 border-violet-200"};

function getTierColor(pct:number){return pct>=30?"violet":pct>=25?"emerald":pct>=22?"blue":"gray";}
function getTier(qty:number,tiers:DiscountTier[]){return [...tiers].reverse().find(t=>qty>=t.min)||tiers[0];}

function ProductImg({img,code,color,size=44}:{img:string;code:string;color:string;size?:number}){
  return(
    <div style={{width:size,height:size,borderRadius:8,overflow:"hidden",background:`linear-gradient(135deg,${color}bb,${color}66)`,flexShrink:0}}>
      <img src={img} alt={code} style={{width:"100%",height:"100%",objectFit:"contain"}}
        onError={e=>{const p=e.currentTarget.parentElement!;p.innerHTML=`<span style="font-size:10px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${code}</span>`;}}/>
    </div>
  );
}

function Av({initials,size=32}:{initials:string;size?:number}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:"#7b52d3",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{color:"#fff",fontSize:size>30?11:9,fontWeight:900}}>{initials}</span>
    </div>
  );
}

type Tab="catalogo"|"ordini"|"sconti"|"adpersonam"|"professionisti"|"commissioni"|"gestione-admin"|"report"|"impostazioni";

export default function EVAdminPage() {
  const { t } = useTranslation();
  const { user: userWithLicense } = useUserWithLicense();

  // ev_admin ha accesso completo come l'admin principale
  const userRole = (userWithLicense as any)?.role;
  const isMainAdmin = userWithLicense?.type === "admin" || userRole === 'ev_admin';
  const isSecondary = false; // nessun accesso limitato per ev_admin
  const isActualMainAdmin = userWithLicense?.type === "admin"; // solo per operazioni platform-only

  const [tab, setTab] = useState<Tab>(isActualMainAdmin ? "gestione-admin" : isMainAdmin ? "ordini" : "ordini");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tiers, setTiers] = useState<DiscountTier[]>(DEFAULT_TIERS.map(t=>({...t})));
  const [commRate, setCommRate] = useState(2);
  const [saved, setSaved] = useState(false);
  const [expandedProd, setExpandedProd] = useState<string|null>(null);
  const [catFilter, setCatFilter] = useState("Tutti");
  const [confirmRevoke, setConfirmRevoke] = useState<number|null>(null);
  const [justChanged, setJustChanged] = useState<number|null>(null);
  const [customDiscounts, setCustomDiscounts] = useState<Record<number,number[]>>({});
  const [selectedPro, setSelectedPro] = useState(0);

  // Carica utenti reali dal DB
  const { data: realUsers = [] } = useQuery({ queryKey: ['/api/staff/users'] });

  // Carica ordini reali EV
  const { data: evOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/inventory/ev-orders'],
    refetchInterval: 30000,
  });

  // Carica reports EV
  const [reportPeriod, setReportPeriod] = useState<'day'|'week'|'month'|'year'>('month');

  const { data: evReports, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['/api/inventory/ev-reports', reportPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/ev-reports?period=${reportPeriod}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error loading reports');
      return res.json();
    },
    enabled: tab === 'report',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Carica impostazioni EV
  const { data: evSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/inventory/ev-settings'],
    enabled: tab === 'impostazioni',
  });

  // Carica prodotti custom del catalogo
  const { data: customCatalogProducts = [], refetch: refetchCatalog } = useQuery({
    queryKey: ['/api/inventory/ev-catalog'],
  });

  // Carica sponsor links e commissioni EV
  const { data: sponsorLinks = [], refetch: refetchSponsorLinks } = useQuery({
    queryKey: ['/api/inventory/ev-sponsor-links'],
    enabled: tab === 'commissioni',
  });
  const { data: evCommissions = [], refetch: refetchCommissions } = useQuery({
    queryKey: ['/api/inventory/ev-commissions'],
    enabled: tab === 'commissioni',
    refetchInterval: tab === 'commissioni' ? 15000 : false,
  });

  // Stato locale impostazioni
  const [settingsForm, setSettingsForm] = useState<any>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [shipModal, setShipModal] = useState<{orderId:string;trackingCode:string;trackingUrl:string;notes:string}|null>(null);
  const [commSubTab, setCommSubTab] = useState<'sponsor'|'commissioni'>('commissioni');
  const [sponsorModal, setSponsorModal] = useState<{sponsorId:string;sponsoredId:string;pct:string;notes:string}|null>(null);
  const [editLinkModal, setEditLinkModal] = useState<{id:number;pct:string;active:boolean;notes:string}|null>(null);
  const [payNotesModal, setPayNotesModal] = useState<{id:number;notes:string}|null>(null);
  const [payMonthModal, setPayMonthModal] = useState<{month:string;notes:string}|null>(null);

  // Stato form aggiunta prodotto
  const EMPTY_PROD = {code:'',name:'',desc:'',cat:'Spray',zone:'Viso e Corpo',color:'#7b52d3',minPrice:'',maxPrice:'',img:''};
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm] = useState<any>({...EMPTY_PROD});
  const [prodImgPreview, setProdImgPreview] = useState<string>('');
  const [prodImgFile, setProdImgFile] = useState<File|null>(null);
  const [prodSaving, setProdSaving] = useState(false);

  const addProductMutation = useMutation({
    mutationFn: async (prod: any) => {
      const res = await apiRequest('POST', '/api/inventory/ev-catalog', prod);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-catalog'] });
      setShowProdForm(false);
      setProdForm({...EMPTY_PROD});
      setProdImgPreview('');
      setProdImgFile(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('DELETE', `/api/inventory/ev-catalog/${code}`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-catalog'] }); },
  });

  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.code) return;
    setProdSaving(true);
    try {
      let imgUrl = prodForm.img || '';
      // If user selected a local file, upload it first
      if (prodImgFile) {
        const fd = new FormData();
        fd.append('image', prodImgFile);
        const r = await fetch(`/api/inventory/ev-catalog/${encodeURIComponent(prodForm.code)}/image`, {
          method: 'POST', body: fd, credentials: 'include',
        });
        if (r.ok) { const d = await r.json(); imgUrl = d.url; }
      }
      addProductMutation.mutate({
        ...prodForm,
        img: imgUrl,
        minPrice: +prodForm.minPrice || 0,
        maxPrice: +prodForm.maxPrice || +prodForm.minPrice || 0,
      });
    } finally {
      setProdSaving(false);
    }
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PATCH', '/api/inventory/ev-settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-settings'] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    },
  });

  const shipOrderWithTrackingMutation = useMutation({
    mutationFn: async (data: {orderId:string;trackingCode:string;trackingUrl:string;notes:string}) => {
      const res = await apiRequest('PATCH', `/api/inventory/ev-orders/${data.orderId}/ship`, {
        trackingCode: data.trackingCode,
        trackingUrl: data.trackingUrl,
        notes: data.notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-orders'] });
      setShipModal(null);
    },
  });

  // Mutations: EV Sponsor Links
  const createSponsorLinkMutation = useMutation({
    mutationFn: async (data:any) => { const r = await apiRequest('POST', '/api/inventory/ev-sponsor-links', data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['/api/inventory/ev-sponsor-links']}); setSponsorModal(null); },
  });
  const updateSponsorLinkMutation = useMutation({
    mutationFn: async ({id,...d}:any) => { const r = await apiRequest('PATCH', `/api/inventory/ev-sponsor-links/${id}`, d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['/api/inventory/ev-sponsor-links']}); setEditLinkModal(null); },
  });
  const deleteSponsorLinkMutation = useMutation({
    mutationFn: async (id:number) => { const r = await apiRequest('DELETE', `/api/inventory/ev-sponsor-links/${id}`); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({queryKey:['/api/inventory/ev-sponsor-links']}),
  });

  // Mutations: EV Commissions
  const payCommissionMutation = useMutation({
    mutationFn: async ({id,notes}:{id:number;notes:string}) => { const r = await apiRequest('PATCH', `/api/inventory/ev-commissions/${id}/pay`, {paymentNotes:notes}); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['/api/inventory/ev-commissions']}); setPayNotesModal(null); },
  });
  const cancelCommissionMutation = useMutation({
    mutationFn: async (id:number) => { const r = await apiRequest('PATCH', `/api/inventory/ev-commissions/${id}/cancel`); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({queryKey:['/api/inventory/ev-commissions']}),
  });
  const payMonthlyMutation = useMutation({
    mutationFn: async ({month,notes}:{month:string;notes:string}) => { const r = await apiRequest('POST', '/api/inventory/ev-commissions/pay-monthly', {month,paymentNotes:notes}); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['/api/inventory/ev-commissions']}); setPayMonthModal(null); },
  });

  // Mutation: conferma ordine + carica magazzino
  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('PATCH', `/api/inventory/ev-orders/${orderId}/confirm`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-orders'] }); },
  });

  // Mutation: rifiuta ordine
  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('PATCH', `/api/inventory/ev-orders/${orderId}/reject`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-orders'] }); },
  });

  // Mutation: segna come spedito
  const shipOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest('PATCH', `/api/inventory/ev-orders/${orderId}/ship`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-orders'] }); },
  });

  const pendingOrdersCount = (evOrders as any[]).filter((o: any) => o.status === 'pending').length;

  // Mutazioni per promuovere/revocare
  const promoteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}`, { role: 'ev_admin' });
      return res.json();
    },
    onSuccess: (_,userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      setJustChanged(userId);
      setTimeout(()=>setJustChanged(null),2000);
    },
  });
  const grantEvStaffMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}`, { role: 'ev_staff' });
      return res.json();
    },
    onSuccess: (_,userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      setJustChanged(userId);
      setTimeout(()=>setJustChanged(null),2000);
    },
  });
  const revokeEvStaffMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}`, { role: 'staff' });
      return res.json();
    },
    onSuccess: (_,userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      setJustChanged(userId);
      setTimeout(()=>setJustChanged(null),2000);
    },
  });
  const revokeMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}`, { role: 'staff' });
      return res.json();
    },
    onSuccess: (_,userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      setConfirmRevoke(null);
      setJustChanged(userId);
      setTimeout(()=>setJustChanged(null),2000);
    },
  });

  const promoteStaff = (id:number) => promoteMutation.mutate(id);
  const revokeAdmin = (id:number) => revokeMutation.mutate(id);

  const allStaff = (realUsers as any[]).filter((u: any) => u.role !== 'admin');
  const secondaryAdmins = allStaff.filter((u: any) => u.role === 'ev_admin');
  const evStaffMembers = allStaff.filter((u: any) => u.role === 'ev_staff');
  const regularStaff = allStaff.filter((u: any) => u.role !== 'ev_admin' && u.role !== 'ev_staff');

  // Professionisti reali: utenti ev_staff + ev_admin con dati ordini calcolati live
  const professionals = (realUsers as any[])
    .filter((u: any) => u.role === 'ev_staff' || u.role === 'ev_admin')
    .map((u: any) => {
      const uOrders = (evOrders as any[]).filter((o: any) => o.professionalId === u.id);
      return {
        id: u.id,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username,
        code: u.assignmentCode || ((u.username || '').substring(0,3).toUpperCase() + String(u.id).padStart(4,'0')),
        email: u.email || '',
        orders: uOrders.length,
        revenue: uOrders.filter((o: any) => o.status !== 'rejected').reduce((s: number, o: any) => s + (o.totalPro || 0), 0),
      };
    });

  const totalRevenue = (evOrders as any[]).filter((o:any)=>o.status!=='rejected').reduce((s:number,o:any)=>s+(o.totalPro||0),0);
  const allProducts = [...PRODUCTS, ...(customCatalogProducts as any[])];
  const cats = ["Tutti",...Array.from(new Set(allProducts.map((p:any)=>p.cat)))];
  const visibleProds = catFilter==="Tutti"?allProducts:allProducts.filter((p:any)=>p.cat===catFilter);
  const proCustom = customDiscounts[selectedPro]??tiers.map(t=>t.pct);
  const updateTier = (i:number,pct:number)=>{setSaved(false);setTiers(ts=>ts.map((t,j)=>j===i?{...t,pct}:t));};
  const updateCustom = (i:number,pct:number)=>{setCustomDiscounts(d=>({...d,[selectedPro]:d[selectedPro].map((v,j)=>j===i?pct:v)}));};

  type Tab="catalogo"|"ordini"|"sconti"|"adpersonam"|"professionisti"|"commissioni"|"gestione-admin"|"report"|"impostazioni";

  type SideItem={id:Tab;icon:any;label:string;locked?:boolean;badge?:number};
  const sideItems:SideItem[]=[
    {id:"gestione-admin",icon:Users,label:"Gestione Admin",badge:secondaryAdmins.length,locked:isSecondary},
    {id:"catalogo",icon:Package,label:"Catalogo"},
    {id:"ordini",icon:ShoppingCart,label:"Ordini ricevuti",badge:pendingOrdersCount||undefined},
    {id:"sconti",icon:Percent,label:"Sconti default",locked:isSecondary},
    {id:"adpersonam",icon:Sliders,label:"Sconti ad personam"},
    {id:"professionisti",icon:UserCog,label:"Professionisti",locked:isSecondary},
    {id:"commissioni",icon:TrendingUp,label:"Commissioni",locked:isSecondary},
    {id:"report",icon:BarChart2,label:"Report & Fatturato",locked:isSecondary},
    {id:"impostazioni",icon:Settings,label:"Impostazioni Pagamento",locked:isSecondary},
  ];

  if (!isMainAdmin && !isSecondary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <Lock className="w-12 h-12 text-gray-300"/>
        <div className="text-lg font-semibold text-gray-600">Accesso riservato</div>
        <div className="text-sm text-gray-400">Solo admin e staff autorizzati possono accedere al portale EV Cosmetics.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{fontFamily:"Inter,sans-serif"}}>

      {/* Modal spedizione con tracking */}
      {shipModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-white"/>
                <span className="font-bold text-white">Segna come spedito</span>
              </div>
              <p className="text-violet-200 text-xs mt-1">Ordine <span className="font-mono font-bold">{shipModal.orderId}</span></p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Codice tracking <span className="text-gray-400">(opzionale)</span></label>
                <input
                  type="text"
                  value={shipModal.trackingCode}
                  onChange={e=>setShipModal(m=>m?{...m,trackingCode:e.target.value}:m)}
                  placeholder="es. IT123456789IT"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">URL tracking <span className="text-gray-400">(opzionale)</span></label>
                <input
                  type="url"
                  value={shipModal.trackingUrl}
                  onChange={e=>setShipModal(m=>m?{...m,trackingUrl:e.target.value}:m)}
                  placeholder="https://www.poste.it/cerca/index.html"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Note per il cliente <span className="text-gray-400">(opzionale)</span></label>
                <textarea
                  value={shipModal.notes}
                  onChange={e=>setShipModal(m=>m?{...m,notes:e.target.value}:m)}
                  placeholder="es. Pacco affidato a Poste Italiane il 10/06"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-start gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
                Una email con i dati di spedizione verrà inviata automaticamente al professionista.
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={()=>setShipModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">
                  Annulla
                </button>
                <button
                  onClick={()=>shipOrderWithTrackingMutation.mutate(shipModal)}
                  disabled={shipOrderWithTrackingMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {shipOrderWithTrackingMutation.isPending?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Truck className="w-3.5 h-3.5"/>}
                  Conferma spedizione
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm gap-3">
        <div className="flex items-center gap-2.5">
          {/* Hamburger mobile */}
          <button onClick={()=>setIsSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 mr-1" aria-label="Apri menu">
            <Menu className="w-5 h-5 text-gray-600"/>
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:"linear-gradient(135deg,#7b52d3,#9b72f3)"}}>
            <FlaskConical className="w-4 h-4 text-white"/>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">EV Cosmetics — Admin</div>
            <div className="text-[10px] text-gray-400 flex items-center gap-1"><Lock className="w-2.5 h-2.5"/>{isMainAdmin?"Admin Principale":"Admin Secondario"}</div>
          </div>
        </div>
        <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${isSecondary?"bg-amber-50 text-amber-700 border border-amber-200":"bg-violet-50 text-violet-700 border border-violet-200"}`}>
          {isSecondary?<><EyeOff className="w-3 h-3"/>Accesso limitato</>:<><Eye className="w-3 h-3"/>Accesso completo</>}
        </div>
      </div>

      {isSecondary&&(
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0"/>
          <span><strong>Accesso Admin Secondario EV</strong> — puoi visualizzare catalogo, ordini e configurare sconti ad personam. Non puoi accedere agli account professionisti né alle commissioni.</span>
        </div>
      )}

      {/* Backdrop mobile */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isSidebarOpen?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`}
        onClick={()=>setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="flex">
        {/* Sidebar — drawer su mobile, fisso su desktop */}
        <div className={`
          fixed md:static top-0 left-0 h-full md:h-auto z-50 md:z-auto
          w-52 bg-white border-r border-gray-100 flex flex-col gap-0.5 p-3
          transition-transform duration-300 ease-out
          ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `} style={{minHeight:"calc(100vh - 60px)"}}>
          {/* Intestazione drawer mobile */}
          <div className="md:hidden flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sezioni</span>
            <button onClick={()=>setIsSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Chiudi menu">
              <X className="w-4 h-4 text-gray-500"/>
            </button>
          </div>
          {sideItems.map(({id,icon:Icon,label,locked,badge})=>(
            <button key={id} onClick={()=>{if(!locked){setTab(id);setIsSidebarOpen(false);}}} disabled={locked}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full ${locked?"text-gray-300 cursor-not-allowed":tab===id?"bg-violet-50 text-violet-700 border border-violet-100":"text-gray-500 hover:bg-gray-50"}`}>
              <Icon className="w-4 h-4 flex-shrink-0"/>
              <span className="flex-1">{label}</span>
              {locked&&<Lock className="w-2.5 h-2.5 text-gray-300"/>}
              {badge!==undefined&&!locked&&<span className={`text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${tab===id?"bg-violet-200 text-violet-800":"bg-gray-200 text-gray-600"}`}>{badge}</span>}
            </button>
          ))}
          {!isSecondary&&(
            <div className="mt-auto pt-3 border-t border-gray-100">
              <div className="bg-violet-50 rounded-xl border border-violet-100 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Commissione</span>
                  <span className="text-sm font-bold text-violet-700">{commRate}%</span>
                </div>
                <input type="range" min={1} max={5} step={0.5} value={commRate} onChange={e=>setCommRate(+e.target.value)} className="w-full accent-violet-600"/>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto">
          {/* Stats */}
          <div className={`grid gap-3 mb-5 ${isSecondary?"grid-cols-2":"grid-cols-2 sm:grid-cols-4"}`}>
            <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center mb-2"><Package className="w-3.5 h-3.5 text-violet-500"/></div>
              <div className="text-xl font-bold text-gray-900">{allProducts.length}</div>
              <div className="text-xs text-gray-500">Prodotti</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mb-2"><ShoppingCart className="w-3.5 h-3.5 text-blue-500"/></div>
              <div className="text-xl font-bold text-gray-900">{(evOrders as any[]).length}</div>
              <div className="text-xs text-gray-500">Ordini{pendingOrdersCount>0&&<span className="ml-1 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingOrdersCount} in att.</span>}</div>
            </div>
            {!isSecondary&&<>
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center mb-2"><BarChart2 className="w-3.5 h-3.5 text-emerald-500"/></div>
                <div className="text-xl font-bold text-gray-900">€{totalRevenue.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Fatturato</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center mb-2"><Users className="w-3.5 h-3.5 text-amber-500"/></div>
                <div className="text-xl font-bold text-gray-900">{secondaryAdmins.length}</div>
                <div className="text-xs text-gray-500">Admin EV</div>
              </div>
            </>}
          </div>

          {/* GESTIONE ADMIN */}
          {tab==="gestione-admin"&&!isSecondary&&(
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Gestione Admin Secondari</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Promuovi qualsiasi account ad <strong>Admin Secondario EV</strong>. Avranno accesso al portale fornitore. Puoi anche assegnare questo ruolo dalla pagina <em>Gestione Staff</em>.</p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 text-center flex-shrink-0">
                  <div className="text-xl font-black text-violet-700">{secondaryAdmins.length}/{allStaff.length}</div>
                  <div className="text-[9px] text-violet-500">admin attivi</div>
                </div>
              </div>

              {secondaryAdmins.length>0&&(
                <div className="mb-4">
                  <div className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5 px-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/>ADMIN SECONDARI EV ATTIVI</div>
                  <div className="space-y-2">
                    {secondaryAdmins.map((u:any)=>(
                      <div key={u.id} className={`bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3 transition-all ${justChanged===u.id?"border-emerald-300 bg-emerald-50":"border-emerald-100"}`}>
                        <Av initials={(u.username||"?").substring(0,2).toUpperCase()}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900">{u.username}</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><ShieldAlert className="w-2.5 h-2.5"/>Admin EV</span>
                          </div>
                          {u.email&&<div className="mt-0.5"><span className="text-[10px] text-gray-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5"/>{u.email}</span></div>}
                        </div>
                        {confirmRevoke===u.id?(
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-red-700 font-medium">Revocare?</span>
                            <button onClick={()=>revokeAdmin(u.id)} disabled={revokeMutation.isPending} className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg">Sì</button>
                            <button onClick={()=>setConfirmRevoke(null)} className="text-[10px] text-gray-500 px-1">No</button>
                          </div>
                        ):(
                          <button onClick={()=>setConfirmRevoke(u.id)} className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50">
                            <XCircle className="w-3 h-3"/>Revoca
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EV STAFF — accesso solo shop */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5 px-1"><FlaskConical className="w-3 h-3 text-violet-400"/>STAFF CON ACCESSO SHOP EV</div>
                {evStaffMembers.length===0&&(
                  <div className="text-xs text-gray-400 py-2 px-1">Nessuno — promuovi uno staff dalla sezione qui sotto.</div>
                )}
                <div className="space-y-2">
                  {evStaffMembers.map((u:any)=>(
                    <div key={u.id} className={`bg-violet-50 rounded-xl border border-violet-100 shadow-sm p-3 flex items-center gap-3 ${justChanged===u.id?"border-violet-400":""}`}>
                      <Av initials={(u.username||"?").substring(0,2).toUpperCase()}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{u.username}</span>
                          <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">🛒 EV Shop</span>
                        </div>
                        {u.email&&<span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><Mail className="w-2.5 h-2.5"/>{u.email}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>promoteStaff(u.id)} disabled={promoteMutation.isPending} className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 hover:border-violet-400 rounded-lg px-2 py-1.5 hover:bg-white disabled:opacity-50">
                          <Shield className="w-3 h-3"/>Admin
                        </button>
                        <button onClick={()=>revokeEvStaffMutation.mutate(u.id)} disabled={revokeEvStaffMutation.isPending} className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 disabled:opacity-50">
                          <X className="w-3 h-3"/>Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAFF NORMALE — nessun accesso EV */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1.5 px-1"><Briefcase className="w-3 h-3 text-gray-400"/>STAFF GESTIONALE — SENZA ACCESSO EV</div>
                {regularStaff.length===0&&(
                  <div className="text-center py-6 text-xs text-gray-400">Nessun account staff senza accesso EV.<br/>Creane uno dalla pagina <strong>Gestione Staff</strong>.</div>
                )}
                <div className="space-y-2">
                  {regularStaff.map((u:any)=>(
                    <div key={u.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 ${justChanged===u.id?"border-violet-300 bg-violet-50":""}`}>
                      <Av initials={(u.username||"?").substring(0,2).toUpperCase()}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{u.username}</span>
                          <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold capitalize">{u.role}</span>
                        </div>
                        {u.email&&<span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><Mail className="w-2.5 h-2.5"/>{u.email}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={()=>grantEvStaffMutation.mutate(u.id)} disabled={grantEvStaffMutation.isPending} className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 hover:border-violet-400 rounded-lg px-2 py-1.5 hover:bg-violet-50 disabled:opacity-50">
                          <FlaskConical className="w-3 h-3"/>EV Shop
                        </button>
                        <button onClick={()=>promoteStaff(u.id)} disabled={promoteMutation.isPending} className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-violet-800 border border-gray-200 hover:border-violet-300 rounded-lg px-2 py-1.5 hover:bg-violet-50 disabled:opacity-50">
                          <Shield className="w-3 h-3"/>Admin EV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-700 mb-3">Confronto accessi per ruolo</div>
                <div className="grid gap-2 text-center" style={{gridTemplateColumns:"1fr auto auto auto"}}>
                  {["Funzione","Staff","EV Shop","Admin EV"].map(h=><div key={h} className="text-[10px] font-bold text-gray-600">{h}</div>)}
                  {[
                    ["Gestionale (agenda, clienti)","✅","✅","✅"],
                    ["Catalogo & shop EV","❌","✅","✅"],
                    ["Invio ordini EV","❌","✅","✅"],
                    ["Sconti ad personam","❌","❌","✅"],
                    ["Gestione ordini","❌","❌","✅"],
                    ["Account professionisti","❌","❌","❌"],
                    ["Commissioni","❌","❌","❌"],
                  ].map(([fn,st,evs,adm],i)=>[
                    <div key={`fn${i}`} className="text-[10px] text-gray-600 text-left">{fn}</div>,
                    <div key={`st${i}`} className="text-[10px]">{st}</div>,
                    <div key={`evs${i}`} className="text-[10px]">{evs}</div>,
                    <div key={`adm${i}`} className="text-[10px]">{adm}</div>,
                  ])}
                </div>
              </div>
            </div>
          )}

          {/* SCONTI DEFAULT */}
          {tab==="sconti"&&!isSecondary&&(
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Sconti Default Professionisti</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Fasce base per tutti i professionisti. Gli sconti ad personam non possono essere inferiori.</p>
                </div>
                <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}} className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl ${saved?"bg-emerald-100 text-emerald-700 border border-emerald-200":"bg-violet-600 text-white hover:bg-violet-700"}`}>
                  {saved?"✓ Salvato!":<><Settings className="w-3.5 h-3.5"/>Salva</>}
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                {tiers.map((tier,i)=>{
                  const c=getTierColor(tier.pct);
                  return (
                    <div key={i} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${TIER_RING[c]}`}>{tier.label}</div>
                        {i===0&&<span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Minimo garantito</span>}
                        <span className="ml-auto font-bold text-sm">–{tier.pct}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="range" min={i===0?10:tiers[i-1].pct+1} max={50} step={1} value={tier.pct} onChange={e=>updateTier(i,+e.target.value)} className="flex-1 accent-violet-600"/>
                        <input type="number" value={tier.pct} min={i===0?10:tiers[i-1].pct+1} max={50} onChange={e=>updateTier(i,+e.target.value)} className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-violet-400"/>
                        <span className="text-sm text-gray-400">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCONTI AD PERSONAM */}
          {tab==="adpersonam"&&(
            <div>
              <div className="mb-3">
                <h2 className="font-semibold text-gray-900">Sconti Ad Personam</h2>
                <p className="text-xs text-gray-500">Sconti riservati per professionista — mai inferiori al default.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 mb-2 tracking-widest px-1">PROFESSIONISTI</div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {professionals.length===0&&<div className="text-center py-4 text-xs text-gray-400">Nessun professionista abilitato</div>}
                    {professionals.map(pro=>(
                      <button key={pro.id} onClick={()=>setSelectedPro(pro.id)} className={`w-full flex items-center gap-2.5 px-3.5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left ${(selectedPro===pro.id||(selectedPro===0&&professionals[0]?.id===pro.id))?"bg-violet-50 border-l-2 border-l-violet-500":""}`}>
                        <Av initials={pro.name.split(" ").map((w:string)=>w[0]).join("").substring(0,2)} size={28}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-gray-900 truncate">{pro.name}</div>
                          <div className="text-[9px] text-gray-400">{pro.code}</div>
                          {!isSecondary&&<div className="text-[9px] text-gray-400 truncate">{pro.email}</div>}
                        </div>
                        <ChevronRight className={`w-3 h-3 ${selectedPro===pro.id?"text-violet-500":"text-gray-300"}`}/>
                      </button>
                    ))}
                  </div>
                  {isSecondary&&<div className="mt-1.5 text-[9px] text-amber-600 flex items-center gap-1 px-1"><EyeOff className="w-2.5 h-2.5"/>Solo nome e codice visibili</div>}
                </div>
                <div className="col-span-2">
                  {(()=>{
                    const pro=professionals.find(p=>p.id===(selectedPro||professionals[0]?.id))||professionals[0];
                    if (!pro) return <div className="text-center text-sm text-gray-400 py-8">Seleziona un professionista</div>;
                    return(
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <Av initials={pro.name.split(" ").map((w:string)=>w[0]).join("").substring(0,2)}/>
                          <div>
                            <div className="font-semibold text-gray-900">{pro.name}</div>
                            <div className="text-xs text-gray-400">{pro.code}</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                          {tiers.map((t,i)=>{
                            const cp=proCustom[i]??t.pct;
                            const c=getTierColor(cp);
                            return(
                              <div key={i} className="mb-4 last:mb-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TIER_RING[c]}`}>{t.label}</div>
                                  <span className="text-[9px] text-gray-400">default: –{t.pct}%</span>
                                  {cp>t.pct&&<span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">+{cp-t.pct}% personalizzato</span>}
                                  <span className="ml-auto text-sm font-bold">–{cp}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="range" min={t.pct} max={60} step={1} value={cp} onChange={e=>updateCustom(i,+e.target.value)} className="flex-1 accent-violet-600"/>
                                  <input type="number" value={cp} min={t.pct} max={60} onChange={e=>updateCustom(i,Math.max(t.pct,+e.target.value))} className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-violet-400"/>
                                  <span className="text-sm text-gray-400">%</span>
                                </div>
                              </div>
                            );
                          })}
                          <button className="mt-3 w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2.5 rounded-xl">Salva per {pro.name.split(" ")[0]}</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* CATALOGO */}
          {tab==="catalogo"&&(
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Catalogo Prodotti ({allProducts.length})</h2>
                {isMainAdmin&&(
                  <button onClick={()=>{setProdForm({...EMPTY_PROD});setProdImgPreview('');setProdImgFile(null);setShowProdForm(true);}}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700">
                    <PlusCircle className="w-3.5 h-3.5"/> Aggiungi prodotto
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${catFilter===c?"bg-violet-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}
              </div>
              <div className="space-y-2">
                {visibleProds.map((p:any)=>{
                  const open=expandedProd===p.code;
                  const isCustom = !!(p as any).createdAt;
                  return(
                    <div key={p.code} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <ProductImg img={p.img} code={p.code} color={p.color}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{p.name}</span>
                            <span className="text-[9px] border border-gray-200 px-1.5 py-0.5 rounded-full text-gray-500">{p.cat}</span>
                            {isCustom&&<span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">custom</span>}
                          </div>
                          <div className="text-xs text-gray-500">{p.desc} · {p.zone}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold">€{p.minPrice}{p.maxPrice!==p.minPrice?`–${p.maxPrice}`:""}</div>
                          <div className="text-[10px] text-violet-600">prof. da €{(p.minPrice*(1-tiers[0].pct/100)).toFixed(0)}</div>
                        </div>
                        {isCustom&&isMainAdmin&&(
                          <button onClick={()=>{if(confirm(`Eliminare "${p.name}"?`))deleteProductMutation.mutate(p.code);}}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Elimina prodotto">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        )}
                        <button onClick={()=>setExpandedProd(open?null:p.code)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
                          {open?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
                        </button>
                      </div>
                      {open&&(
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="grid grid-cols-4 gap-2">
                            {tiers.map((t,i)=>{const c=getTierColor(t.pct);return(
                              <div key={i} className="bg-white rounded-lg border border-gray-100 p-2 text-center">
                                <div className={`text-[9px] font-bold border rounded-full px-1.5 mb-1 inline-block ${TIER_RING[c]}`}>{t.label}</div>
                                <div className="text-[10px] text-gray-400 line-through">€{p.minPrice}</div>
                                <div className="text-sm font-bold">€{(p.minPrice*(1-t.pct/100)).toFixed(2)}</div>
                              </div>
                            );})}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal: Aggiungi Prodotto */}
              {showProdForm&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)setShowProdForm(false);}}>
                  <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">Aggiungi prodotto al catalogo</h3>
                      <button onClick={()=>setShowProdForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Immagine */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Immagine prodotto</label>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {prodImgPreview?(
                              <img src={prodImgPreview} className="w-full h-full object-contain"/>
                            ):(
                              <ImageIcon className="w-6 h-6 text-gray-300"/>
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg px-3 py-2 hover:bg-violet-50 w-fit">
                              <Upload className="w-3.5 h-3.5"/> Carica foto
                              <input type="file" accept="image/*" className="hidden" onChange={e=>{
                                const f=e.target.files?.[0];
                                if(f){setProdImgFile(f);const r=new FileReader();r.onload=ev=>setProdImgPreview(ev.target?.result as string);r.readAsDataURL(f);}
                              }}/>
                            </label>
                            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WEBP · max 5MB</p>
                            <p className="text-[10px] text-gray-400">Oppure incolla URL:</p>
                            <input type="text" placeholder="https://..." value={prodImgPreview.startsWith('data:')?'':prodForm.img||''}
                              onChange={e=>{setProdForm((f:any)=>({...f,img:e.target.value}));setProdImgPreview(e.target.value);}}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-full mt-0.5"/>
                          </div>
                        </div>
                      </div>

                      {/* Codice + Nome */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Codice *</label>
                          <input value={prodForm.code} onChange={e=>setProdForm((f:any)=>({...f,code:e.target.value.toUpperCase()}))}
                            placeholder="es. MYPROD" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full uppercase" maxLength={10}/>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Nome *</label>
                          <input value={prodForm.name} onChange={e=>setProdForm((f:any)=>({...f,name:e.target.value}))}
                            placeholder="Nome prodotto" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full"/>
                        </div>
                      </div>

                      {/* Descrizione */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Descrizione</label>
                        <input value={prodForm.desc} onChange={e=>setProdForm((f:any)=>({...f,desc:e.target.value}))}
                          placeholder="es. Idratante · Antiage" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full"/>
                      </div>

                      {/* Categoria + Zona */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria</label>
                          <select value={prodForm.cat} onChange={e=>setProdForm((f:any)=>({...f,cat:e.target.value}))}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full bg-white">
                            <option>Spray</option><option>Oli</option><option>Sieri</option><option>Creme</option><option>Altro</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Zona</label>
                          <input value={prodForm.zone} onChange={e=>setProdForm((f:any)=>({...f,zone:e.target.value}))}
                            placeholder="Viso, Corpo…" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full"/>
                        </div>
                      </div>

                      {/* Prezzi */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Prezzo min (€) *</label>
                          <input type="number" min="0" step="0.01" value={prodForm.minPrice}
                            onChange={e=>setProdForm((f:any)=>({...f,minPrice:e.target.value}))}
                            placeholder="0.00" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full"/>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Prezzo max (€)</label>
                          <input type="number" min="0" step="0.01" value={prodForm.maxPrice}
                            onChange={e=>setProdForm((f:any)=>({...f,maxPrice:e.target.value}))}
                            placeholder="= min se uguale" className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 w-full"/>
                        </div>
                      </div>

                      {/* Colore badge */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Colore badge</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={prodForm.color} onChange={e=>setProdForm((f:any)=>({...f,color:e.target.value}))}
                            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"/>
                          <span className="text-xs text-gray-500">{prodForm.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 p-4 border-t border-gray-100">
                      <button onClick={()=>setShowProdForm(false)}
                        className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50">Annulla</button>
                      <button onClick={handleSaveProduct} disabled={!prodForm.name||!prodForm.code||prodSaving||addProductMutation.isPending}
                        className="flex-1 text-sm font-semibold bg-violet-600 text-white rounded-xl py-2.5 hover:bg-violet-700 disabled:opacity-50">
                        {prodSaving||addProductMutation.isPending?"Salvataggio…":"Salva prodotto"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDINI */}
          {tab==="ordini"&&(
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Ordini Ricevuti</h2>
                  {pendingOrdersCount>0&&<p className="text-xs text-amber-600 mt-0.5 font-medium">{pendingOrdersCount} ordine/i in attesa di conferma</p>}
                </div>
                <button onClick={()=>refetchOrders()} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5">↻ Aggiorna</button>
              </div>
              {ordersLoading&&<div className="text-center py-8 text-gray-400 text-sm">Caricamento ordini...</div>}
              {!ordersLoading&&(evOrders as any[]).length===0&&(
                <div className="text-center py-10 text-gray-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  <div className="text-sm">Nessun ordine ancora ricevuto.</div>
                  <div className="text-xs mt-1">Gli ordini compariranno qui quando i professionisti li invieranno dallo shop.</div>
                </div>
              )}
              {(evOrders as any[]).length>0&&(
                <div className="space-y-3">
                  {(evOrders as any[]).map((o: any)=>{
                    const isPending = o.status==='pending';
                    const isConfirmed = o.status==='confirmed';
                    const isShipped = o.status==='shipped';
                    const isRejected = o.status==='rejected';
                    const dateStr = new Date(o.createdAt).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
                    const statusBadge: Record<string,string> = {
                      pending:'bg-amber-100 text-amber-700',
                      confirmed:'bg-blue-100 text-blue-700',
                      shipped:'bg-purple-100 text-purple-700',
                      delivered:'bg-emerald-100 text-emerald-700',
                      rejected:'bg-red-100 text-red-700',
                    };
                    const statusTxt: Record<string,string> = {
                      pending:'In attesa',confirmed:'Confermato ✓',shipped:'Spedito',delivered:'Consegnato',rejected:'Rifiutato',
                    };
                    return(
                      <div key={o.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isPending?'border-amber-200':isConfirmed?'border-blue-100':'border-gray-100'}`}>
                        {/* Intestazione ordine */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-gray-700">{o.id}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[o.status]||'bg-gray-100 text-gray-600'}`}>{statusTxt[o.status]||o.status}</span>
                              {o.stockLoaded&&<span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">📦 Stock caricato</span>}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{o.professionalName||o.professionalEmail} · {dateStr}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-base font-black text-gray-900">€{(o.totalPro||0).toFixed(2)}</div>
                            <div className="text-[10px] text-gray-400">{o.totalQty} pz · risparmio €{(o.saving||0).toFixed(2)}</div>
                          </div>
                        </div>
                        {/* Righe prodotti */}
                        <div className="px-4 py-2 space-y-1">
                          {(o.items||[]).map((item: any, i: number)=>(
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.code}</span>
                              <span className="flex-1 text-gray-700">{item.name} · {item.format}</span>
                              <span className="text-gray-500">{item.qty}pz</span>
                              <span className="font-semibold text-violet-700">€{(item.proPrice*item.qty).toFixed(2)}</span>
                              <span className="text-[10px] text-emerald-600">–{item.discountPct}%</span>
                            </div>
                          ))}
                        </div>
                        {/* Payment badge */}
                        {o.paymentMethod&&(
                          <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-50 flex items-center gap-2">
                            {o.paymentMethod==='stripe'?(
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                                <CreditCard className="w-2.5 h-2.5"/>Stripe
                                {o.paymentStatus==='paid'&&<span className="text-emerald-600 ml-0.5">· Pagato ✓</span>}
                                {o.paymentStatus==='pending'&&<span className="text-amber-600 ml-0.5">· In attesa</span>}
                              </span>
                            ):(
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <Building2 className="w-2.5 h-2.5"/>Bonifico
                                {o.paymentStatus==='paid'&&<span className="text-emerald-600 ml-0.5">· Pagato ✓</span>}
                                {o.paymentStatus==='pending'&&<span className="text-amber-600 ml-0.5">· In attesa</span>}
                              </span>
                            )}
                            {o.trackingCode&&(
                              <span className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full ml-auto font-mono">
                                <Truck className="w-2.5 h-2.5"/>{o.trackingCode}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Azioni admin */}
                        {(isMainAdmin||isSecondary)&&(
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex-wrap">
                            {isPending&&(
                              <>
                                <button onClick={()=>confirmOrderMutation.mutate(o.id)} disabled={confirmOrderMutation.isPending}
                                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                                  <CheckCircle className="w-3.5 h-3.5"/>Conferma + Carica stock
                                </button>
                                <button onClick={()=>rejectOrderMutation.mutate(o.id)} disabled={rejectOrderMutation.isPending}
                                  className="flex items-center gap-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
                                  <XCircleIcon className="w-3.5 h-3.5"/>Rifiuta
                                </button>
                              </>
                            )}
                            {isConfirmed&&!isShipped&&(
                              <button onClick={()=>setShipModal({orderId:o.id,trackingCode:'',trackingUrl:'',notes:''})}
                                className="flex items-center gap-1.5 text-xs font-semibold border border-purple-200 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg">
                                <Truck className="w-3.5 h-3.5"/>Segna come spedito
                              </button>
                            )}
                            {isShipped&&(
                              <span className="flex items-center gap-1 text-xs text-purple-600 font-medium"><Truck className="w-3 h-3"/>Spedito</span>
                            )}
                            {isRejected&&(
                              <span className="text-xs text-red-400">Ordine rifiutato</span>
                            )}
                            {!isSecondary&&<span className="ml-auto text-xs text-emerald-600 font-medium">Comm. {commRate}%: €{((o.totalPro||0)*commRate/100).toFixed(2)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROFESSIONISTI */}
          {tab==="professionisti"&&!isSecondary&&(
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Account Professionisti ({professionals.length})</h2>
                <span className="text-xs text-gray-400">Dati in tempo reale</span>
              </div>
              {professionals.length===0&&(
                <div className="text-center py-10 text-gray-400">
                  <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  <div className="text-sm">Nessun professionista abilitato.</div>
                  <div className="text-xs mt-1">Vai a <strong>Gestione Admin</strong> per assegnare l'accesso EV Shop.</div>
                </div>
              )}
              <div className="space-y-2">
                {professionals.map(pro=>{
                  const initials = pro.name.split(" ").map((w:string)=>w[0]).join("").substring(0,2);
                  const showEmail = pro.email && pro.email !== pro.name;
                  return (
                    <div key={pro.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                      <Av initials={initials}/>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{pro.name}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          {showEmail&&<span className="flex items-center gap-0.5 truncate max-w-[160px]"><Mail className="w-2.5 h-2.5 flex-shrink-0"/><span className="truncate">{pro.email}</span></span>}
                          <span className="font-mono bg-gray-50 px-1 rounded flex-shrink-0">{pro.code}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-emerald-700">€{pro.revenue.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-400">{pro.orders} ordini</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REPORT */}
          {tab==="report"&&!isSecondary&&(
            <div>
              {/* Header + selettore periodo */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Report & Fatturato EV</h2>
                <button onClick={()=>refetchReports()} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 border border-gray-200 hover:border-violet-300 rounded-lg px-2.5 py-1.5">
                  <RefreshCw className="w-3 h-3"/>Aggiorna
                </button>
              </div>
              {/* Pill selettore periodo */}
              <div className="flex gap-1.5 mb-4">
                {([['day','Giorno'],['week','Settimana'],['month','Mese'],['year','Anno']] as const).map(([p,label])=>(
                  <button key={p} onClick={()=>setReportPeriod(p)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${reportPeriod===p?"bg-violet-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {reportsLoading&&<div className="text-center py-10 text-gray-400 text-sm">Caricamento report...</div>}
              {!reportsLoading&&evReports&&(()=>{
                const r = evReports as any;
                const periodLabel = {day:'Oggi',week:'Ultimi 7 giorni',month:'Questo mese',year:'Quest\'anno'}[reportPeriod];
                const timelineData = r.timeline || r.monthly || [];
                const hasTimeline = timelineData.some((t:any)=>t.revenue>0);
                const PIE_COLORS = ['#7c3aed','#a855f7','#ec4899','#f97316','#22c55e','#06b6d4','#eab308','#6b7280'];

                return (
                <div className="space-y-5">
                  {/* Etichetta periodo attivo */}
                  <div className="text-xs text-violet-600 font-semibold bg-violet-50 rounded-lg px-3 py-1.5 inline-block">{periodLabel}</div>

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {label:'Fatturato',val:`€${(r.totalRevenue||0).toFixed(2)}`,color:'text-emerald-600',bg:'bg-emerald-50'},
                      {label:'Commissioni',val:`€${(r.totalCommission||0).toFixed(2)}`,color:'text-violet-600',bg:'bg-violet-50'},
                      {label:'Ordini',val:r.confirmedOrders||0,color:'text-blue-600',bg:'bg-blue-50'},
                      {label:'Professionisti',val:r.activeProfessionals||0,color:'text-amber-600',bg:'bg-amber-50'},
                    ].map(k=>(
                      <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-white/50`}>
                        <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                        <div className={`text-xl font-black ${k.color}`}>{k.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Grafico andamento temporale */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-violet-500"/>
                      Andamento fatturato — {periodLabel}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={timelineData} margin={{top:5,right:10,left:0,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                        <XAxis dataKey="label" tick={{fontSize:10}} tickLine={false}/>
                        <YAxis tick={{fontSize:11}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`€${v}`}/>
                        <Tooltip formatter={(v:number)=>[`€${Number(v).toFixed(2)}`,'Fatturato']} labelFormatter={(l)=>String(l)}/>
                        <Bar dataKey="revenue" fill="#7c3aed" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    {!hasTimeline&&<div className="text-center text-xs text-gray-400 mt-2">Nessun ordine nel periodo selezionato</div>}
                  </div>

                  {/* Riga: Torta categoria + Top prodotti */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Grafico a torta per categoria */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                        <PieChart className="w-3.5 h-3.5 text-violet-500"/>Fatturato per categoria
                      </div>
                      {r.byCategory&&r.byCategory.length>0?(
                        <>
                          <ResponsiveContainer width="100%" height={180}>
                            <RechartsPie>
                              <Pie data={r.byCategory} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                                label={({name,percent}:any)=>percent>0.05?`${name} ${(percent*100).toFixed(0)}%`:''} labelLine={false}>
                                {r.byCategory.map((_:any,i:number)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                              </Pie>
                              <Tooltip formatter={(v:number,name:string)=>[`€${Number(v).toFixed(2)}`,name]}/>
                            </RechartsPie>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {r.byCategory.map((c:any,i:number)=>(
                              <span key={i} className="flex items-center gap-1 text-[10px] text-gray-600">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </>
                      ):(
                        <div className="text-center text-xs text-gray-400 py-8">Nessun dato</div>
                      )}
                    </div>

                    {/* Top prodotti */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-violet-500"/>Top prodotti
                      </div>
                      {r.topProducts&&r.topProducts.length>0?(
                        <div className="space-y-2">
                          {r.topProducts.slice(0,8).map((p:any,i:number)=>(
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 w-4">{i+1}</span>
                              <span className="flex-1 text-xs text-gray-700 truncate">{p.name}</span>
                              <div className="w-12 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                                <div className="bg-violet-500 h-1.5 rounded-full" style={{width:`${Math.min(100,(p.revenue/r.topProducts[0].revenue)*100)}%`}}/>
                              </div>
                              <span className="text-xs font-bold text-gray-800 w-14 text-right">€{p.revenue.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ):(
                        <div className="text-center text-xs text-gray-400 py-8">Nessun dato</div>
                      )}
                    </div>
                  </div>

                  {/* Top professionisti */}
                  {r.topProfessionals&&r.topProfessionals.length>0&&(
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-violet-500"/>Top professionisti per fatturato</div>
                      <ResponsiveContainer width="100%" height={Math.max(120, r.topProfessionals.slice(0,6).length * 32)}>
                        <BarChart data={r.topProfessionals.slice(0,6)} layout="vertical" margin={{top:0,right:50,left:10,bottom:0}}>
                          <XAxis type="number" tick={{fontSize:10}} tickFormatter={(v:number)=>`€${v}`} tickLine={false}/>
                          <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={90} tickLine={false}/>
                          <Tooltip formatter={(v:number)=>[`€${Number(v).toFixed(2)}`,'Fatturato']}/>
                          <Bar dataKey="revenue" fill="#a855f7" radius={[0,4,4,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                );
              })()}
              {!reportsLoading&&!evReports&&(
                <div className="text-center py-10 text-gray-400"><PieChart className="w-10 h-10 mx-auto mb-2 opacity-30"/><div className="text-sm">Nessun dato disponibile.</div></div>
              )}
            </div>
          )}

          {/* IMPOSTAZIONI PAGAMENTO */}
          {tab==="impostazioni"&&!isSecondary&&(
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">Impostazioni Pagamento EV</h2>
              {settingsLoading&&<div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>}
              {!settingsLoading&&(
                <div className="space-y-4">
                  {/* Stripe */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-indigo-500"/>
                      <div className="font-semibold text-sm text-gray-900">Stripe EV Cosmetics</div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full">Account separato dal gestionale</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Stripe Secret Key (sk_live_... o sk_test_...)</label>
                        <input
                          type="password"
                          defaultValue={(evSettings as any)?.stripeSecretKey||''}
                          onChange={e=>setSettingsForm((f:any)=>({...(f||evSettings||{}),stripeSecretKey:e.target.value}))}
                          placeholder="sk_live_xxxx"
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Stripe Publishable Key (pk_live_... o pk_test_...)</label>
                        <input
                          type="text"
                          defaultValue={(evSettings as any)?.stripePublicKey||''}
                          onChange={e=>setSettingsForm((f:any)=>({...(f||evSettings||{}),stripePublicKey:e.target.value}))}
                          placeholder="pk_live_xxxx"
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Se lasciato vuoto, solo il bonifico sarà disponibile come metodo di pagamento.</p>
                  </div>
                  {/* Bonifico */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-amber-500"/>
                      <div className="font-semibold text-sm text-gray-900">Coordinate Bancarie (Bonifico)</div>
                    </div>
                    <div className="space-y-3">
                      {[
                        {key:'ibanEv',label:'IBAN',placeholder:'IT60 X054 2811 1010 0000 0123 456'},
                        {key:'ibanHolder',label:'Intestatario',placeholder:'EV Cosmetics S.r.l.'},
                        {key:'bankName',label:'Banca',placeholder:'Banca Sella'},
                      ].map(f=>(
                        <div key={f.key}>
                          <label className="text-xs font-medium text-gray-700 block mb-1">{f.label}</label>
                          <input
                            type="text"
                            defaultValue={(evSettings as any)?.[f.key]||''}
                            onChange={e=>setSettingsForm((sf:any)=>({...(sf||evSettings||{}),[f.key]:e.target.value}))}
                            placeholder={f.placeholder}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Commissione piattaforma */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-emerald-500"/>
                        <div className="font-semibold text-sm text-gray-900">Commissione Piattaforma</div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-500">{((settingsForm as any)?.platformCommissionEnabled ?? (evSettings as any)?.platformCommissionEnabled) ? 'Attiva' : 'Disattiva'}</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only"
                            defaultChecked={(evSettings as any)?.platformCommissionEnabled ?? false}
                            onChange={e=>setSettingsForm((f:any)=>({...(f||evSettings||{}),platformCommissionEnabled:e.target.checked}))}
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${((settingsForm as any)?.platformCommissionEnabled ?? (evSettings as any)?.platformCommissionEnabled) ? 'bg-emerald-500' : 'bg-gray-300'}`}/>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${((settingsForm as any)?.platformCommissionEnabled ?? (evSettings as any)?.platformCommissionEnabled) ? 'translate-x-5' : ''}`}/>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <input
                        type="range"
                        min={0} max={30} step={0.5}
                        defaultValue={(evSettings as any)?.platformCommissionPct||0}
                        onChange={e=>setSettingsForm((f:any)=>({...(f||evSettings||{}),platformCommissionPct:+e.target.value}))}
                        className="flex-1 accent-emerald-500"
                      />
                      <div className="w-14 text-center font-bold text-emerald-700 text-sm border border-emerald-200 rounded-lg py-1">
                        {(settingsForm as any)?.platformCommissionPct ?? (evSettings as any)?.platformCommissionPct ?? 0}%
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-800">
                      💡 Quando attiva, ogni ordine EV confermato da qualsiasi staff genera automaticamente una commissione intestata a te (admin). È il corrispettivo per l'uso gratuito della piattaforma.
                    </div>
                  </div>
                  {/* Notifiche email */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4 text-blue-500"/>
                      <div className="font-semibold text-sm text-gray-900">Notifiche Email</div>
                    </div>
                    <div className="space-y-2">
                      {[
                        {key:'orderEmailEnabled',label:'Email di conferma ordine al professionista'},
                        {key:'shipEmailEnabled',label:'Email di spedizione con tracking al professionista'},
                      ].map(f=>(
                        <label key={f.key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={(evSettings as any)?.[f.key]!==false}
                            onChange={e=>setSettingsForm((sf:any)=>({...(sf||evSettings||{}),[f.key]:e.target.checked}))}
                            className="w-4 h-4 accent-blue-500 rounded"
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={()=>saveSettingsMutation.mutate(settingsForm||{})}
                    disabled={saveSettingsMutation.isPending||!settingsForm}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                  >
                    {saveSettingsMutation.isPending?<RefreshCw className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
                    {settingsSaved?'Salvato ✓':'Salva impostazioni'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMMISSIONI SPONSOR */}
          {tab==="commissioni"&&!isSecondary&&(
            <div>
              {/* Modali */}
              {sponsorModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-white"/>
                      <span className="font-bold text-white">Nuovo Link Sponsor</span>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Sponsor (chi guadagna la commissione)</label>
                        <select value={sponsorModal.sponsorId} onChange={e=>setSponsorModal(m=>m?{...m,sponsorId:e.target.value}:m)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300">
                          <option value="">Seleziona sponsor…</option>
                          {(realUsers as any[]).filter((u:any)=>u.role==='ev_staff'||u.role==='ev_admin'||u.type==='admin').map((u:any)=>(
                            <option key={u.id} value={u.id}>{u.firstName&&u.lastName?`${u.firstName} ${u.lastName}`:u.username} ({u.email||u.username})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Sponsorizzato (chi acquista e genera la commissione)</label>
                        <select value={sponsorModal.sponsoredId} onChange={e=>setSponsorModal(m=>m?{...m,sponsoredId:e.target.value}:m)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300">
                          <option value="">Seleziona sponsorizzato…</option>
                          {(realUsers as any[]).filter((u:any)=>(u.role==='ev_staff'||u.role==='ev_admin')&&String(u.id)!==sponsorModal.sponsorId).map((u:any)=>(
                            <option key={u.id} value={u.id}>{u.firstName&&u.lastName?`${u.firstName} ${u.lastName}`:u.username} ({u.email||u.username})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Percentuale commissione (%)</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min={1} max={30} step={0.5} value={+sponsorModal.pct||5}
                            onChange={e=>setSponsorModal(m=>m?{...m,pct:e.target.value}:m)}
                            className="flex-1 accent-violet-600"/>
                          <div className="w-14 text-center font-bold text-violet-700 text-sm border border-violet-200 rounded-lg py-1">{sponsorModal.pct||5}%</div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Note interne <span className="text-gray-400">(opzionale)</span></label>
                        <input type="text" value={sponsorModal.notes} onChange={e=>setSponsorModal(m=>m?{...m,notes:e.target.value}:m)}
                          placeholder="es. Accordo firmato il 01/01/2026"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                        💡 La commissione viene generata automaticamente ad ogni ordine dello sponsorizzato e accumulata per il pagamento mensile.
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={()=>setSponsorModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">Annulla</button>
                        <button
                          onClick={()=>createSponsorLinkMutation.mutate({sponsorId:+sponsorModal.sponsorId,sponsoredId:+sponsorModal.sponsoredId,commissionPct:+sponsorModal.pct||5,notes:sponsorModal.notes})}
                          disabled={!sponsorModal.sponsorId||!sponsorModal.sponsoredId||createSponsorLinkMutation.isPending}
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50">
                          {createSponsorLinkMutation.isPending?'Salvataggio…':'Crea link'}
                        </button>
                      </div>
                      {(createSponsorLinkMutation.error as any)&&<div className="text-xs text-red-500 text-center">{(createSponsorLinkMutation.error as any)?.message||'Errore'}</div>}
                    </div>
                  </div>
                </div>
              )}
              {editLinkModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4"><span className="font-bold text-white">Modifica Link Sponsor</span></div>
                    <div className="p-5 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Percentuale commissione (%)</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min={1} max={30} step={0.5} value={+editLinkModal.pct||5}
                            onChange={e=>setEditLinkModal(m=>m?{...m,pct:e.target.value}:m)} className="flex-1 accent-amber-500"/>
                          <div className="w-14 text-center font-bold text-amber-700 text-sm border border-amber-200 rounded-lg py-1">{editLinkModal.pct||5}%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="linkActive" checked={editLinkModal.active} onChange={e=>setEditLinkModal(m=>m?{...m,active:e.target.checked}:m)} className="accent-violet-600"/>
                        <label htmlFor="linkActive" className="text-xs text-gray-700">Link attivo</label>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Note</label>
                        <input type="text" value={editLinkModal.notes} onChange={e=>setEditLinkModal(m=>m?{...m,notes:e.target.value}:m)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"/>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={()=>setEditLinkModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">Annulla</button>
                        <button onClick={()=>updateSponsorLinkMutation.mutate({id:editLinkModal.id,commissionPct:+editLinkModal.pct,active:editLinkModal.active,notes:editLinkModal.notes})}
                          disabled={updateSponsorLinkMutation.isPending}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50">
                          {updateSponsorLinkMutation.isPending?'Salvataggio…':'Salva'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {payNotesModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4"><span className="font-bold text-white">Segna come pagata</span></div>
                    <div className="p-5 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Note pagamento <span className="text-gray-400">(opzionale)</span></label>
                        <input type="text" value={payNotesModal.notes} onChange={e=>setPayNotesModal(m=>m?{...m,notes:e.target.value}:m)}
                          placeholder="es. Bonifico del 30/06 — rif. EV-COMM-001"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={()=>setPayNotesModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">Annulla</button>
                        <button onClick={()=>payCommissionMutation.mutate({id:payNotesModal.id,notes:payNotesModal.notes})}
                          disabled={payCommissionMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50">
                          {payCommissionMutation.isPending?'Salvataggio…':'Conferma pagamento'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {payMonthModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
                      <span className="font-bold text-white">Paga tutte le commissioni</span>
                      <p className="text-emerald-200 text-xs mt-1">Mese: <span className="font-mono font-bold">{payMonthModal.month}</span></p>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                        ⚠️ Questa azione segnerà come pagate tutte le commissioni in sospeso per il mese selezionato. Verifica di aver effettuato i bonifici prima di procedere.
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Note pagamento batch</label>
                        <input type="text" value={payMonthModal.notes} onChange={e=>setPayMonthModal(m=>m?{...m,notes:e.target.value}:m)}
                          placeholder="es. Pagamenti di luglio 2026 effettuati"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"/>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={()=>setPayMonthModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">Annulla</button>
                        <button onClick={()=>payMonthlyMutation.mutate({month:payMonthModal.month,notes:payMonthModal.notes})}
                          disabled={payMonthlyMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50">
                          {payMonthlyMutation.isPending?'Salvataggio…':'Conferma pagamento batch'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Header + sub-tab */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm">💰</span>
                    Commissioni EV
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5 ml-9">Sponsor individuali + quota piattaforma</p>
                </div>
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                  <button onClick={()=>setCommSubTab('commissioni')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${commSubTab==='commissioni'?'bg-white text-violet-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                    📊 Commissioni
                  </button>
                  <button onClick={()=>setCommSubTab('sponsor')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${commSubTab==='sponsor'?'bg-white text-violet-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                    🔗 Link Sponsor
                  </button>
                </div>
              </div>

              {/* ── SUB-TAB: COMMISSIONI ── */}
              {commSubTab==='commissioni'&&(()=>{
                const commList = evCommissions as any[];
                const pending = commList.filter((c:any)=>c.status==='pending');
                const paid = commList.filter((c:any)=>c.status==='paid');
                const totalPending = pending.reduce((s:number,c:any)=>s+(c.commissionAmount||0),0);
                const totalPaid = paid.reduce((s:number,c:any)=>s+(c.commissionAmount||0),0);
                // Group pending by month for batch pay
                const pendingMonths = [...new Set(pending.map((c:any)=>c.month))].sort().reverse() as string[];
                return (
                  <div>
                    {/* KPI cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-100">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-4 pt-3 pb-2">
                          <div className="text-[10px] text-amber-100 font-medium mb-0.5 uppercase tracking-wide">Da pagare</div>
                          <div className="text-2xl font-black text-white">€{totalPending.toFixed(2)}</div>
                        </div>
                        <div className="bg-white px-4 py-2">
                          <div className="text-[10px] text-amber-600 font-semibold">{pending.length} commissioni in sospeso</div>
                        </div>
                      </div>
                      <div className="rounded-2xl overflow-hidden shadow-sm border border-emerald-100">
                        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-4 pt-3 pb-2">
                          <div className="text-[10px] text-emerald-100 font-medium mb-0.5 uppercase tracking-wide">Già pagate</div>
                          <div className="text-2xl font-black text-white">€{totalPaid.toFixed(2)}</div>
                        </div>
                        <div className="bg-white px-4 py-2">
                          <div className="text-[10px] text-emerald-600 font-semibold">{paid.length} commissioni saldate</div>
                        </div>
                      </div>
                      <div className="rounded-2xl overflow-hidden shadow-sm border border-violet-100">
                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 px-4 pt-3 pb-2">
                          <div className="text-[10px] text-violet-200 font-medium mb-0.5 uppercase tracking-wide">Link attivi</div>
                          <div className="text-2xl font-black text-white">{(sponsorLinks as any[]).filter((l:any)=>l.active).length}</div>
                        </div>
                        <div className="bg-white px-4 py-2">
                          <div className="text-[10px] text-violet-600 font-semibold">relazioni sponsor</div>
                        </div>
                      </div>
                    </div>

                    {/* Batch pay per mese */}
                    {pendingMonths.length>0&&(
                      <div className="rounded-2xl border border-amber-200 overflow-hidden mb-4">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-2.5 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-white"/>
                          <span className="text-xs font-bold text-white uppercase tracking-wide">Pagamenti mensili da effettuare</span>
                        </div>
                        <div className="bg-amber-50 divide-y divide-amber-100">
                          {pendingMonths.map((month:string)=>{
                            const mComms = pending.filter((c:any)=>c.month===month);
                            const mTotal = mComms.reduce((s:number,c:any)=>s+(c.commissionAmount||0),0);
                            const [yr,mn] = month.split('-');
                            const monthLabel = new Date(+yr,+mn-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});
                            const sponsors = [...new Set(mComms.map((c:any)=>c.sponsorName))];
                            return (
                              <div key={month} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-amber-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">📅</div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-800 capitalize">{monthLabel}</div>
                                    <div className="text-[10px] text-gray-500">{mComms.length} commissioni · {sponsors.slice(0,2).join(', ')}{sponsors.length>2?` +${sponsors.length-2}`:''}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-base font-black text-amber-700">€{mTotal.toFixed(2)}</div>
                                    <div className="text-[9px] text-amber-500">da versare</div>
                                  </div>
                                  <button onClick={()=>setPayMonthModal({month,notes:''})}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap">
                                    ✓ Paga tutto
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lista commissioni */}
                    <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block"/>Storico commissioni
                        </span>
                        <button onClick={()=>refetchCommissions()} className="text-[10px] text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium"><RefreshCw className="w-3 h-3"/>Aggiorna</button>
                      </div>
                      {commList.length===0&&(
                        <div className="text-center py-10 bg-white">
                          <div className="text-3xl mb-2">💸</div>
                          <div className="text-sm font-semibold text-gray-500">Nessuna commissione ancora</div>
                          <div className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Le commissioni vengono generate automaticamente quando uno sponsorizzato fa un ordine confermato.</div>
                        </div>
                      )}
                      <div className="divide-y divide-gray-50 bg-white">
                        {commList.map((c:any)=>{
                          const isPlatform = c.commissionType==='platform';
                          const initials = (c.sponsorName||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
                          return (
                            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors group">
                              {/* Avatar + tipo */}
                              <div className="flex-shrink-0 relative">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm ${isPlatform?'bg-gradient-to-br from-emerald-500 to-teal-600':'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
                                  {isPlatform?'🏛️':initials}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 text-[8px] px-1 py-0 rounded-full font-black border border-white ${isPlatform?'bg-emerald-500 text-white':'bg-violet-500 text-white'}`}>
                                  {isPlatform?'P':'S'}
                                </div>
                              </div>
                              {/* Dettagli */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-gray-900 truncate">{c.sponsorName}</span>
                                  {isPlatform
                                    ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">🏛️ Piattaforma</span>
                                    : <><span className="text-[10px] text-gray-300">→</span><span className="text-xs font-medium text-violet-700 truncate">{c.sponsoredName}</span></>
                                  }
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  <span className="font-mono bg-gray-50 px-1 rounded">{String(c.orderId).slice(-8)}</span>
                                  {' · '}{c.commissionPct}% di €{(c.orderAmount||0).toFixed(2)}
                                  {' · '}{new Date(c.createdAt).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}
                                </div>
                                {c.status==='paid'&&c.paidAt&&(
                                  <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">✓ Pagata {new Date(c.paidAt).toLocaleDateString('it-IT')}{c.paymentNotes?` — ${c.paymentNotes}`:''}</div>
                                )}
                                {c.sponsorIban&&c.status==='pending'&&(
                                  <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">IBAN: {c.sponsorIban}</div>
                                )}
                              </div>
                              {/* Importo + azioni */}
                              <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                                <div className="text-base font-black text-emerald-600">€{(c.commissionAmount||0).toFixed(2)}</div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${c.status==='paid'?'bg-emerald-100 text-emerald-700':c.status==='pending'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-400'}`}>
                                  {c.status==='paid'?'✓ Pagata':c.status==='pending'?'⏳ Sospeso':'✕ Annullata'}
                                </span>
                                {c.status==='pending'&&(
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={()=>setPayNotesModal({id:c.id,notes:''})} className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg">Paga</button>
                                    <button onClick={()=>cancelCommissionMutation.mutate(c.id)} className="text-[9px] bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2 py-0.5 rounded-lg">✕</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── SUB-TAB: LINK SPONSOR ── */}
              {commSubTab==='sponsor'&&(
                <div>
                  {/* Spiegazione + nuovo link */}
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4 mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-violet-800 mb-0.5">🔗 Come funzionano i Link Sponsor</div>
                      <div className="text-[10px] text-violet-600 leading-relaxed">Quando uno <span className="font-bold">Sponsor</span> porta una persona a vendere EV, guadagna una commissione automatica su ogni ordine del suo <span className="font-bold">Sponsorizzato</span>.</div>
                    </div>
                    <button onClick={()=>setSponsorModal({sponsorId:'',sponsoredId:'',pct:'5',notes:''})}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm">
                      <PlusCircle className="w-3.5 h-3.5"/>Nuovo link
                    </button>
                  </div>

                  {(sponsorLinks as any[]).length===0&&(
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                      <div className="text-4xl mb-3">🤝</div>
                      <div className="text-sm font-bold text-gray-600">Nessun link sponsor ancora</div>
                      <div className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Clicca "Nuovo link" per collegare uno sponsor al suo sponsorizzato e iniziare a tracciare le commissioni automatiche.</div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(sponsorLinks as any[]).map((l:any)=>{
                      const sponsorInitials = (l.sponsorName||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
                      const sponsoredInitials = (l.sponsoredName||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
                      return (
                        <div key={l.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${l.active?'border-violet-100':'border-gray-100 opacity-60'}`}>
                          {/* Relation row */}
                          <div className="flex items-center gap-3 mb-3">
                            {/* Sponsor chip */}
                            <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{sponsorInitials}</div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-gray-900 truncate">{l.sponsorName}</div>
                                <div className="text-[9px] text-violet-500 font-medium">SPONSOR</div>
                              </div>
                            </div>
                            {/* Arrow + % */}
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="text-base font-black text-violet-600">{l.commissionPct}%</div>
                              <div className="text-gray-300 text-lg">→</div>
                            </div>
                            {/* Sponsorizzato chip */}
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{sponsoredInitials}</div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-gray-900 truncate">{l.sponsoredName}</div>
                                <div className="text-[9px] text-gray-400 font-medium truncate">{l.sponsoredEmail}</div>
                              </div>
                            </div>
                          </div>
                          {/* Footer row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${l.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
                                {l.active?'● Attivo':'○ Inattivo'}
                              </span>
                              {l.sponsorIban&&<span className="text-[9px] text-gray-400 font-mono">IBAN ✓</span>}
                              {l.notes&&<span className="text-[9px] text-gray-400 italic truncate max-w-[120px]">{l.notes}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={()=>setEditLinkModal({id:l.id,pct:String(l.commissionPct),active:l.active,notes:l.notes||''})}
                                className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                                <Sliders className="w-3 h-3"/>Modifica
                              </button>
                              <button onClick={()=>{if(confirm(`Eliminare il link sponsor ${l.sponsorName} → ${l.sponsoredName}?`))deleteSponsorLinkMutation.mutate(l.id)}}
                                className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3 h-3"/>Elimina
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
