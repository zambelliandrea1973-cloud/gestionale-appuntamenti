// @ts-nocheck
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { useLocation } from "wouter";
import { ShoppingCart, Plus, Minus, X, ChevronDown, Tag, Package, Info, Search, CheckCircle2, AlertTriangle, Clock, ChevronRight, FlaskConical, CreditCard, Building2 } from "lucide-react";

const F = "https://cdn.shopify.com/s/files/1/0657/6259/0955/files/";
const P = "https://cdn.shopify.com/s/files/1/0657/6259/0955/products/";

type Product = {
  code:string; name:string; desc:string; zone:string; color:string;
  cat:string; formats:string[]; prices:Record<string,number>; images:Record<string,string>;
};

const CATALOG: Product[] = [
  {code:"EL",name:"Elisir",desc:"Antiaging · Idratante",zone:"Viso e Corpo",color:"#c9a5d4",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Set 5 Maschere"],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Set 5 Maschere":75},
    images:{"Spray 50ml":F+"IMG-5304.jpg","Spray 150ml":F+"IMG-5290.jpg","Set 5 Maschere":F+"Untitled_design-5_02822db3-1b8d-4810-ae41-6b08f39c9982.png"}},
  {code:"RE",name:"Repair",desc:"Seboequilibrante · Antiacne",zone:"Viso e Corpo",color:"#7ab8cc",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Set 5 Maschere"],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Set 5 Maschere":75},
    images:{"Spray 50ml":F+"IMG-5298.jpg","Spray 150ml":F+"IMG-5286.jpg","Set 5 Maschere":F+"Untitled_design-7.png"}},
  {code:"DE",name:"Detox",desc:"Detossinante",zone:"Viso e Corpo",color:"#9ab87a",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Pantaloncini","Ricarica Pant."],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Pantaloncini":36,"Ricarica Pant.":75},
    images:{"Spray 50ml":F+"IMG-5299.jpg","Spray 150ml":F+"IMG-5291.jpg","Pantaloncini":F+"Untitled_design-8.png","Ricarica Pant.":F+"Progettosenzatitolo_25_90cd858e-287b-4893-a715-e660e558bd9f.png"}},
  {code:"EA",name:"Energy Activator",desc:"Idratante · Elasticizzante",zone:"Viso e Corpo",color:"#d4b87a",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Olio 100ml"],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Olio 100ml":37},
    images:{"Spray 50ml":F+"IMG-5307.jpg","Spray 150ml":F+"IMG-5288.jpg","Olio 100ml":F+"IMG-5317.jpg"}},
  {code:"LL",name:"Lift Lotion",desc:"Liftante · Tonificante",zone:"Viso e Corpo",color:"#7a8ec9",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Olio 100ml","Pantaloncini","Set 5 Maschere"],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Olio 100ml":37,"Pantaloncini":36,"Set 5 Maschere":75},
    images:{"Spray 50ml":F+"IMG-5301.jpg","Spray 150ml":F+"IMG-5293.jpg","Olio 100ml":F+"IMG-5318.jpg","Pantaloncini":F+"Progettosenzatitolo_25_copia_75b3ff0c-548c-47ad-bfb3-14b5e2cc6432.png","Set 5 Maschere":F+"Untitled_design-6.png"}},
  {code:"RM",name:"Remove",desc:"Struccante · Riequilibrante",zone:"Viso",color:"#cc7a9a",cat:"Spray",
    formats:["Spray unico"],prices:{"Spray unico":26},images:{"Spray unico":F+"IMG-5297.jpg"}},
  {code:"SH",name:"Shine",desc:"Antiage · Illuminante",zone:"Viso e Corpo",color:"#d4b030",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Set 5 Maschere"],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Set 5 Maschere":75},
    images:{"Spray 50ml":F+"IMG-5289.jpg","Spray 150ml":F+"IMG-5289.jpg","Set 5 Maschere":F+"Untitled_design-4.png"}},
  {code:"BF",name:"Body Flow",desc:"Drenante · Anticellulite",zone:"Corpo",color:"#7accc0",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Olio 100ml","Pantaloncini","Ricarica Pant."],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Olio 100ml":37,"Pantaloncini":36,"Ricarica Pant.":75},
    images:{"Spray 50ml":F+"IMG-5303.jpg","Spray 150ml":F+"IMG-5294.jpg","Olio 100ml":F+"IMG-5320.jpg","Pantaloncini":F+"Untitled_design-9.png","Ricarica Pant.":F+"Progettosenzatitolo_25.png"}},
  {code:"BS",name:"Body Slim",desc:"Anticellulite · Rimodellante",zone:"Corpo",color:"#cc8a7a",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Olio 100ml","Pantaloncini","Ricarica Pant."],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Olio 100ml":37,"Pantaloncini":36,"Ricarica Pant.":75},
    images:{"Spray 50ml":F+"IMG-5305.jpg","Spray 150ml":F+"IMG-5295.jpg","Olio 100ml":F+"IMG-5321.jpg","Pantaloncini":F+"Untitled_design-11.png","Ricarica Pant.":F+"Progettosenzatitolo_25_b079261f-3fcc-40e3-be2d-ab0a49292532.png"}},
  {code:"LB",name:"Lipo Burner",desc:"Snellente · Bruciagrassi",zone:"Corpo",color:"#a07acc",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml","Olio 100ml","Pantaloncini","Ricarica Pant."],
    prices:{"Spray 50ml":22,"Spray 150ml":56,"Olio 100ml":37,"Pantaloncini":36,"Ricarica Pant.":75},
    images:{"Spray 50ml":F+"IMG-5306.jpg","Spray 150ml":F+"IMG-5296.jpg","Olio 100ml":F+"IMG-5319.jpg","Pantaloncini":F+"Untitled_design-10.png","Ricarica Pant.":F+"Progettosenzatitolo_25_copia_a7909b3b-a98c-46d3-9378-6bdc6ce6d594.png"}},
  {code:"PC",name:"Piede Curato",desc:"Defaticante · Emolliente",zone:"Piedi",color:"#7acc8a",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml"],prices:{"Spray 50ml":22,"Spray 150ml":56},
    images:{"Spray 50ml":F+"IMG-5308.jpg","Spray 150ml":F+"IMG-5292.jpg"}},
  {code:"HG",name:"Hair Genesis",desc:"Ridensificante · Anticaduta",zone:"Capelli",color:"#cca07a",cat:"Spray",
    formats:["Spray 50ml","Spray 150ml"],prices:{"Spray 50ml":22,"Spray 150ml":56},
    images:{"Spray 50ml":F+"IMG-5302.jpg","Spray 150ml":F+"IMG-5287.jpg"}},
  // Oli
  {code:"OEL",name:"Olio Elisir",desc:"Olio da massaggio antiaging",zone:"Corpo",color:"#c9a5d4",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5316.jpg"}},
  {code:"OLL",name:"Olio Lift Lotion",desc:"Olio liftante",zone:"Corpo",color:"#7a8ec9",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5318.jpg"}},
  {code:"OEA",name:"Olio Energy Activator",desc:"Olio idratante",zone:"Corpo",color:"#d4b87a",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5317.jpg"}},
  {code:"OBF",name:"Olio Body Flow",desc:"Olio drenante",zone:"Corpo",color:"#7accc0",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5320.jpg"}},
  {code:"OBS",name:"Olio Body Slim",desc:"Olio rassodante",zone:"Corpo",color:"#cc8a7a",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5321.jpg"}},
  {code:"OLB",name:"Olio Lipo Burner",desc:"Olio snellente",zone:"Corpo",color:"#a07acc",cat:"Oli",
    formats:["100ml"],prices:{"100ml":37},images:{"100ml":F+"IMG-5319.jpg"}},
  // Sieri
  {code:"SVA",name:"Siero Vitamina A",desc:"Rigenerante · Anti-rughe",zone:"Viso",color:"#f4a261",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5309.jpg"}},
  {code:"SVB",name:"Siero Vitamina B",desc:"Energizzante",zone:"Viso",color:"#e9c46a",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5310.jpg"}},
  {code:"SVC",name:"Siero Vitamina C",desc:"Antiossidante",zone:"Viso",color:"#f4e285",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5311.jpg"}},
  {code:"SVD",name:"Siero Vitamina D",desc:"Nutriente",zone:"Viso",color:"#a8c5da",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5312.jpg"}},
  {code:"SVE",name:"Siero Vitamina E",desc:"Antiossidante",zone:"Viso",color:"#b5e48c",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5313.jpg"}},
  {code:"SVF",name:"Siero Vitamina F",desc:"Lenitivo",zone:"Viso",color:"#d4a5c9",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5314.jpg"}},
  {code:"SVK",name:"Siero Vitamina K",desc:"Anti-rossori",zone:"Viso",color:"#90e0ef",cat:"Sieri",
    formats:["Flacone"],prices:{"Flacone":49},images:{"Flacone":F+"IMG-5315.jpg"}},
  // Creme
  {code:"CCI",name:"Crema Corpo Idratante",desc:"Idratante · Setificante",zone:"Corpo",color:"#d4c5a9",cat:"Creme",
    formats:["200ml"],prices:{"200ml":36},images:{"200ml":F+"Untitleddesign-6_f31568cd-65c3-4cd7-a144-03fb0c486fc7.png"}},
  {code:"CCR",name:"Crema Corpo Rimodellante",desc:"Anticellulite · Rassodante",zone:"Corpo",color:"#c9b8a8",cat:"Creme",
    formats:["200ml"],prices:{"200ml":46},images:{"200ml":F+"Untitleddesign-6_14545a03-51c2-4359-907d-dfc8a865b33e.png"}},
  {code:"CRE",name:"Crema Rigenera",desc:"Rigenerante · Antiage",zone:"Viso",color:"#e8c4b8",cat:"Creme",
    formats:["50ml"],prices:{"50ml":47},images:{"50ml":F+"Untitleddesign-6_aa91481e-4d23-4e87-8bb6-eacfc3f41edb.png"}},
  {code:"CVT",name:"Crema + Vitamine",desc:"Nutriente · Antiossidante",zone:"Viso",color:"#f0e6b2",cat:"Creme",
    formats:["50ml"],prices:{"50ml":45},images:{"50ml":F+"Untitleddesign-14.png"}},
  {code:"FGE",name:"Fango Gel",desc:"Detossinante · Rassodante",zone:"Corpo",color:"#b5c4b1",cat:"Creme",
    formats:["200ml"],prices:{"200ml":38},images:{"200ml":F+"Untitleddesign-6_d626cc21-afed-4ff2-a0ce-dcc4cfe88ede.png"}},
  {code:"CDO",name:"Crema Doccia",desc:"Idratante",zone:"Corpo",color:"#c8e6f5",cat:"Creme",
    formats:["200ml"],prices:{"200ml":25},images:{"200ml":F+"Untitleddesign-6_1b55e265-88f9-46a6-a82a-fbc9f9b8971b.png"}},
  // Viso
  {code:"COC",name:"Contorno Occhi",desc:"Anti-gonfiore",zone:"Viso",color:"#a8d8ea",cat:"Viso",
    formats:["15ml"],prices:{"15ml":23},images:{"15ml":F+"IMG-5334.jpg"}},
  {code:"VLA",name:"Volume Labbra",desc:"Volumizzante",zone:"Viso",color:"#ffb3ba",cat:"Viso",
    formats:["10ml"],prices:{"10ml":19},images:{"10ml":F+"IMG-5336.jpg"}},
  // Benessere/Intimo
  {code:"ANI",name:"Anima",desc:"Trattamento benessere",zone:"Corpo",color:"#c3b1e1",cat:"Benessere",
    formats:["Flacone"],prices:{"Flacone":56},images:{"Flacone":F+"IMG-5332.jpg"}},
  {code:"PAS",name:"Passione",desc:"Olio sensoriale",zone:"Corpo",color:"#f4a0a0",cat:"Benessere",
    formats:["Flacone"],prices:{"Flacone":52},images:{"Flacone":F+"IMG-5335.jpg"}},
  {code:"AAI",name:"Antiage Intimo",desc:"Antiage zona intima",zone:"Intimo",color:"#ffcad4",cat:"Intimo",
    formats:["Flacone"],prices:{"Flacone":26},images:{"Flacone":P+"3.jpg"}},
  {code:"PLI",name:"Plump Intimo",desc:"Volume zona intima",zone:"Intimo",color:"#ffd6e7",cat:"Intimo",
    formats:["Flacone"],prices:{"Flacone":26},images:{"Flacone":P+"2.jpg"}},
];

const TIERS = [
  {label:"1–4 pz",min:1,pct:20},
  {label:"5–9 pz",min:5,pct:22},
  {label:"10–19 pz",min:10,pct:25},
  {label:"20+ pz",min:20,pct:30},
];
const CATS = ["Tutti","Spray","Oli","Sieri","Creme","Viso","Benessere","Intimo"];

function getTierColor(pct:number){return pct>=30?"violet":pct>=25?"emerald":pct>=22?"blue":"gray";}
function getTier(qty:number){return [...TIERS].reverse().find(t=>qty>=t.min)||TIERS[0];}
const TC: Record<string,string> = {gray:"border-gray-200 text-gray-600 bg-gray-100",blue:"border-blue-200 text-blue-700 bg-blue-50",emerald:"border-emerald-200 text-emerald-700 bg-emerald-50",violet:"border-violet-200 text-violet-700 bg-violet-50"};
const TB: Record<string,string> = {gray:"bg-gray-300",blue:"bg-blue-400",emerald:"bg-emerald-400",violet:"bg-violet-500"};
const TT: Record<string,string> = {gray:"text-gray-600",blue:"text-blue-700",emerald:"text-emerald-700",violet:"text-violet-700"};

type CartEntry = {code:string;format:string;qty:number;unitPrice:number};

function getProdQty(cart:Record<string,CartEntry>,code:string){
  return Object.entries(cart).filter(([k])=>k.startsWith(code+"__")).reduce((s,[,v])=>s+v.qty,0);
}

function TierBar({qty}:{qty:number}){
  const cur=getTier(qty); const next=TIERS.find(t=>qty<t.min&&t.min>1); const c=getTierColor(cur.pct);
  return(
    <div className="mt-1.5">
      <div className="flex gap-0.5 mb-1">
        {TIERS.map((t,i)=>{const ac=qty>=t.min;const col=getTierColor(t.pct);return<div key={i} className={`flex-1 h-1.5 rounded-sm transition-all ${ac?TB[col]:"bg-gray-200"}`}/>;} )}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${TT[c]}`}>{qty>0?`–${cur.pct}% attivo`:`–${TIERS[0].pct}% base`}</span>
        {next&&qty>0&&<span className="text-[9px] text-gray-400">+{next.min-qty}pz→<span className="font-semibold">–{next.pct}%</span></span>}
        {!next&&qty>0&&<span className="text-[9px] text-violet-600 font-semibold">Sconto max!</span>}
      </div>
    </div>
  );
}

export default function EVWarehousePage() {
  const { t } = useTranslation();
  const { user } = useUserWithLicense();
  const [cart,setCart] = useState<Record<string,CartEntry>>({});
  const [fmts,setFmts] = useState<Record<string,string>>(Object.fromEntries(CATALOG.map(p=>[p.code,p.formats[0]])));
  const [cartOpen,setCartOpen] = useState(false);
  const [showTiers,setShowTiers] = useState(false);
  const [cat,setCat] = useState("Tutti");
  const [search,setSearch] = useState("");
  const [imgErr,setImgErr] = useState<Record<string,boolean>>({});
  const [confirmedOrder,setConfirmedOrder] = useState<{id:string;totalPro:number;totalQty:number;mode?:string;iban?:string;ibanHolder?:string;bankName?:string;reference?:string}|null>(null);
  const [showHistory,setShowHistory] = useState(false);
  const [, setLocation] = useLocation();

  const userRole = (user as any)?.role;
  const hasAccess = userRole === 'ev_staff' || userRole === 'ev_admin' || (user as any)?.type === 'admin';

  if (user && !hasAccess) {
    return(
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
          <FlaskConical className="w-8 h-8 text-violet-400"/>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Accesso non autorizzato</h2>
        <p className="text-sm text-gray-500 max-w-xs">Per accedere al catalogo EV Cosmetics è necessario che l'amministratore ti abiliti come <strong>EV Shop</strong>.</p>
        <p className="text-xs text-gray-400 mt-3">Contatta il tuo admin per richiedere l'accesso.</p>
      </div>
    );
  }

  // Carica i miei ordini precedenti
  const { data: myOrders = [] } = useQuery({
    queryKey: ['/api/inventory/ev-orders'],
    refetchInterval: 60000,
  });

  // Controlla se i pagamenti sono attivi — solo all'apertura della pagina
  const { data: paymentStatus } = useQuery({
    queryKey: ['/api/inventory/ev-payment-status'],
    staleTime: Infinity,
  });
  const paymentsActive = (paymentStatus as any)?.active ?? true; // default true = non bloccare finché non sappiamo

  // Mutation: checkout (Stripe o bonifico)
  const submitOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest('POST', '/api/inventory/ev-orders/create-checkout', payload);
      return res.json();
    },
    onSuccess: (data) => {
      setCart({});
      setCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/ev-orders'] });
      if (data.mode === 'stripe' && data.url) {
        // Redirect to Stripe hosted checkout
        window.location.href = data.url;
      } else {
        // Bonifico manuale — show instructions
        setConfirmedOrder({
          id: data.orderId,
          totalPro: data.amount || 0,
          totalQty: 0,
          mode: 'transfer',
          iban: data.iban,
          ibanHolder: data.ibanHolder,
          bankName: data.bankName,
          reference: data.reference,
        });
      }
    },
  });

  const key=(code:string,fmt:string)=>`${code}__${fmt}`;
  const addOne=(code:string)=>{const fmt=fmts[code];const k=key(code,fmt);const price=(CATALOG.find(p=>p.code===code)!.prices)[fmt]??0;setCart(c=>({...c,[k]:{code,format:fmt,qty:(c[k]?.qty??0)+1,unitPrice:price}}));};
  const remOne=(code:string,fmt?:string)=>{const f=fmt??fmts[code];const k=key(code,f);setCart(c=>{const n={...c};if(!n[k])return n;if(n[k].qty<=1)delete n[k];else n[k]={...n[k],qty:n[k].qty-1};return n;});};
  const remAll=(k:string)=>setCart(c=>{const n={...c};delete n[k];return n;});

  const visible=CATALOG.filter(p=>(cat==="Tutti"||p.cat===cat)&&(p.name.toLowerCase().includes(search.toLowerCase())||p.desc.toLowerCase().includes(search.toLowerCase())));
  const totalQty=Object.values(cart).reduce((s,v)=>s+v.qty,0);
  const cartTotal=Object.values(cart).reduce((sum,item)=>{const pq=getProdQty(cart,item.code);const ti=getTier(pq);return sum+item.unitPrice*(1-ti.pct/100)*item.qty;},0);
  const saving=Object.values(cart).reduce((sum,item)=>{const pq=getProdQty(cart,item.code);const ti=getTier(pq);return sum+item.unitPrice*(ti.pct/100)*item.qty;},0);

  return(
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"Inter, sans-serif"}}>

      {/* Modal conferma ordine — bonifico */}
      {confirmedOrder&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                {confirmedOrder.mode==='transfer'?<Building2 className="w-6 h-6 text-white"/>:<CheckCircle2 className="w-6 h-6 text-white"/>}
              </div>
              <h3 className="font-bold text-white text-base">Ordine inviato!</h3>
              <p className="text-violet-200 text-xs mt-0.5">N° <span className="font-mono font-bold">{confirmedOrder.id}</span></p>
            </div>
            <div className="p-5">
              {confirmedOrder.mode==='transfer'&&confirmedOrder.iban?(
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="font-semibold text-amber-800 text-xs mb-2 flex items-center gap-1">🏦 Completa il pagamento con bonifico</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Beneficiario</span><span className="font-bold">{confirmedOrder.ibanHolder||'EV Cosmetics'}</span></div>
                      {confirmedOrder.bankName&&<div className="flex justify-between"><span className="text-gray-500">Banca</span><span className="font-semibold">{confirmedOrder.bankName}</span></div>}
                      <div className="flex justify-between items-start"><span className="text-gray-500">IBAN</span><span className="font-mono font-bold text-[10px] text-right max-w-[160px] break-all">{confirmedOrder.iban}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Importo</span><span className="font-bold text-violet-700">€{confirmedOrder.totalPro.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Causale</span><span className="font-mono font-bold text-violet-700">{confirmedOrder.reference||confirmedOrder.id}</span></div>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-2 bg-amber-100 rounded-lg px-2 py-1.5">Usa esattamente il numero ordine come causale. La conferma arriverà dopo la ricezione del pagamento.</p>
                  </div>
                  <button onClick={()=>setConfirmedOrder(null)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-xs">
                    Continua lo shopping
                  </button>
                </div>
              ):(
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-amber-800">L'ordine è in attesa di conferma. Il magazzino verrà aggiornato automaticamente.</p>
                  </div>
                  <button onClick={()=>setConfirmedOrder(null)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm">
                    Continua lo shopping
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pannello storico ordini */}
      {showHistory&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">I miei ordini EV</h3>
              <button onClick={()=>setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500"/></button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {(myOrders as any[]).length===0&&(
                <div className="text-center py-8 text-gray-400 text-sm">Nessun ordine ancora inviato.</div>
              )}
              {(myOrders as any[]).map((o: any)=>{
                const statusBadge: Record<string,string> = {pending:'bg-amber-100 text-amber-700',confirmed:'bg-blue-100 text-blue-700',shipped:'bg-purple-100 text-purple-700',delivered:'bg-emerald-100 text-emerald-700',rejected:'bg-red-100 text-red-700'};
                const statusTxt: Record<string,string> = {pending:'In attesa',confirmed:'Confermato ✓',shipped:'Spedito 🚚',delivered:'Consegnato ✅',rejected:'Rifiutato ✗'};
                const dateStr = new Date(o.createdAt).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'});
                return(
                  <div key={o.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-gray-700">{o.id}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadge[o.status]||'bg-gray-100 text-gray-600'}`}>{statusTxt[o.status]||o.status}</span>
                      <span className="ml-auto text-xs font-bold text-gray-800">€{(o.totalPro||0).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">{dateStr} · {o.totalQty} pz · risparmio €{(o.saving||0).toFixed(2)}</div>
                    {o.stockLoaded&&<div className="mt-1 text-[10px] text-emerald-600 font-medium">📦 Stock caricato nel tuo magazzino</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-20 shadow-sm gap-3">
        <div className="flex-shrink-0">
          <div className="font-bold text-gray-900 text-sm"><span style={{color:"#7b52d3"}}>EV</span> Cosmetics</div>
          <div className="text-[9px] text-gray-400">Magazzino Professionale</div>
        </div>
        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca prodotto..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-violet-400"/>
        </div>
        <button onClick={()=>setShowHistory(true)}
          className="relative flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-[10px] hover:bg-gray-100 flex-shrink-0">
          <Clock className="w-3 h-3 text-gray-500"/>
          <span className="font-semibold text-gray-700 hidden sm:inline">Ordini</span>
          {(myOrders as any[]).filter((o:any)=>o.status==='pending').length>0&&(
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] rounded-full flex items-center justify-center font-black">
              {(myOrders as any[]).filter((o:any)=>o.status==='pending').length}
            </span>
          )}
        </button>
        <button onClick={()=>setShowTiers(v=>!v)}
          className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-[10px] hover:bg-gray-100 flex-shrink-0">
          <Tag className="w-3 h-3 text-violet-600"/><span className="font-semibold text-gray-700">Sconti</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showTiers?"rotate-180":""}`}/>
        </button>
        <button onClick={()=>setCartOpen(o=>!o)}
          className="relative flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl flex-shrink-0">
          <ShoppingCart className="w-4 h-4"/>
          {totalQty>0?<span>{totalQty}·€{cartTotal.toFixed(0)}</span>:<span>Carrello</span>}
          {totalQty>0&&<span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[9px] rounded-full flex items-center justify-center font-black">{totalQty}</span>}
        </button>
      </div>

      {/* Fasce sconto */}
      {showTiers&&(
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {TIERS.map((t,i)=>{const c=getTierColor(t.pct);return(
              <div key={i} className={`rounded-xl border p-2.5 text-center ${TC[c]}`}>
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-xl font-black">–{t.pct}%</div>
                <div className="text-[9px] opacity-75">€56→€{(56*(1-t.pct/100)).toFixed(0)}</div>
                {i===0&&<div className="text-[9px] font-semibold opacity-80">sempre</div>}
              </div>
            );})}
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3 flex-shrink-0"/>Lo sconto aumenta per quantità dello stesso prodotto. Il cliente paga il prezzo pubblico — la differenza è il tuo margine.
          </div>
        </div>
      )}

      {/* Categorie */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-1.5 overflow-x-auto" style={{scrollbarWidth:"none"}}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all ${cat===c?"bg-violet-600 text-white shadow-sm":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {c}{c==="Tutti"?` (${CATALOG.length})`:c!=="Tutti"?` (${CATALOG.filter(p=>p.cat===c).length})`:""}
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Griglia prodotti */}
        <div className="flex-1 p-3">
          {visible.length===0&&(
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Package className="w-8 h-8 mb-2"/><div className="text-sm">Nessun prodotto trovato</div>
            </div>
          )}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map(p=>{
              const fmt=fmts[p.code];
              const pubPrice=p.prices[fmt]??0;
              const qtyTot=getProdQty(cart,p.code);
              const qtyFmt=cart[key(p.code,fmt)]?.qty??0;
              const tier=getTier(qtyTot);
              const proPrice=pubPrice*(1-tier.pct/100);
              const c=getTierColor(tier.pct);
              const imgSrc=p.images[fmt]??p.images[p.formats[0]];
              const imgKey=`${p.code}__${fmt}`;
              return(
                <div key={p.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                  <div className="relative flex items-center justify-center bg-gradient-to-b from-gray-50 to-white" style={{height:160,padding:"10px 12px"}}>
                    {!imgErr[imgKey]?(
                      <img key={imgKey} src={imgSrc} alt={`${p.name} ${fmt}`}
                        style={{maxHeight:140,maxWidth:"100%",objectFit:"contain",display:"block"}}
                        onError={()=>setImgErr(e=>({...e,[imgKey]:true}))}/>
                    ):(
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-base text-white"
                        style={{background:`linear-gradient(135deg,${p.color}dd,${p.color}88)`}}>{p.code}</div>
                    )}
                    <div className={`absolute top-1.5 right-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${TC[c]}`}>–{tier.pct}%</div>
                    <div className="absolute top-1.5 left-1.5 text-[9px] bg-white/80 text-gray-600 font-semibold px-1.5 py-0.5 rounded-full border border-gray-100">{p.zone}</div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="font-bold text-gray-900 text-sm leading-tight">{p.name}</div>
                    <div className="text-[10px] text-gray-500 mb-2">{p.desc}</div>
                    {p.formats.length>1?(
                      <div className="relative mb-2">
                        <select value={fmt} onChange={e=>setFmts(s=>({...s,[p.code]:e.target.value}))}
                          className="w-full text-[11px] font-medium border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-violet-400 appearance-none pr-6 cursor-pointer">
                          {p.formats.map(f=><option key={f} value={f}>{f} — €{p.prices[f]?.toFixed(0)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                      </div>
                    ):(
                      <div className="text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-xl mb-2 border border-gray-100">{p.formats[0]}</div>
                    )}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[9px] text-gray-400 line-through">€{pubPrice.toFixed(2)}</div>
                        <div className="text-xl font-black text-gray-900">€{proPrice.toFixed(2)}</div>
                      </div>
                      {qtyTot>0&&<div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TC[c]}`}>{qtyTot}pz</div>}
                    </div>
                    <TierBar qty={qtyTot}/>
                    <div className="mt-2.5 flex-1 flex items-end">
                      {qtyFmt>0?(
                        <div className="flex items-center gap-2 w-full">
                          <button onClick={()=>remOne(p.code)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"><Minus className="w-3.5 h-3.5 text-gray-700"/></button>
                          <div className="flex-1 text-center"><div className="font-black text-gray-900">{qtyFmt}</div><div className="text-[9px] text-gray-400">pz</div></div>
                          <button onClick={()=>addOne(p.code)} className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 flex items-center justify-center flex-shrink-0"><Plus className="w-3.5 h-3.5 text-white"/></button>
                        </div>
                      ):(
                        <button onClick={()=>addOne(p.code)} className="w-full flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 rounded-xl">
                          <Plus className="w-3.5 h-3.5"/>Aggiungi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrello */}
        {cartOpen&&(
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col sticky top-[49px] h-[calc(100vh-49px)] shadow-2xl z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><ShoppingCart className="w-4 h-4 text-violet-600"/>Ordine</div>
              <button onClick={()=>setCartOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
            </div>
            {totalQty===0?(
              <div className="flex-1 flex flex-col items-center justify-center px-4 gap-2 text-center">
                <Package className="w-8 h-8 text-gray-300"/>
                <div className="text-sm text-gray-500">Carrello vuoto</div>
                <div className="text-[10px] text-gray-400">Parti da –{TIERS[0].pct}% garantito</div>
              </div>
            ):(
              <>
                <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
                  {Object.entries(cart).map(([k,item])=>{
                    const pq=getProdQty(cart,item.code);const ti=getTier(pq);const disc=item.unitPrice*(1-ti.pct/100);const c=getTierColor(ti.pct);
                    const prod=CATALOG.find(p=>p.code===item.code)!;const iSrc=prod.images[item.format]??prod.images[prod.formats[0]];
                    return(
                      <div key={k} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5">
                        <div className="flex items-start gap-2">
                          <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                            <img src={iSrc} alt={item.code} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";}}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[11px] text-gray-900 truncate">{prod.name}</div>
                            <div className="text-[9px] text-gray-500 truncate">{item.format}</div>
                            <div className={`text-[9px] font-semibold ${TT[c]}`}>–{ti.pct}%</div>
                          </div>
                          <button onClick={()=>remAll(k)} className="text-gray-300 hover:text-gray-500"><X className="w-3 h-3"/></button>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1">
                            <button onClick={()=>remOne(item.code,item.format)} className="w-5 h-5 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus className="w-2.5 h-2.5 text-gray-600"/></button>
                            <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                            <button onClick={()=>{setFmts(s=>({...s,[item.code]:item.format}));addOne(item.code);}} className="w-5 h-5 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-200"><Plus className="w-2.5 h-2.5 text-violet-700"/></button>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-gray-400 line-through">€{(item.unitPrice*item.qty).toFixed(2)}</div>
                            <div className="text-xs font-bold text-gray-900">€{(disc*item.qty).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-100 px-3 py-3 space-y-2 bg-gray-50">
                  {saving>0&&<div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg"><span>💰 Risparmio</span><span>–€{saving.toFixed(2)}</span></div>}
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500">Totale ({totalQty}pz)</span>
                    <span className="text-lg font-black text-gray-900">€{cartTotal.toFixed(2)}</span>
                  </div>
                  {/* Avviso pagamenti non attivi */}
                  {!paymentsActive&&(
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-2">
                      <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                      <div>
                        <div className="text-[10px] font-bold text-amber-800">Pagamenti non attivi</div>
                        <div className="text-[9px] text-amber-700 mt-0.5 leading-relaxed">Funzione momentaneamente non disponibile. Contatta l'amministratore.</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={()=>{
                      if(!paymentsActive) return;
                      const items = Object.values(cart).map(item=>{
                        const pq=getProdQty(cart,item.code); const ti=getTier(pq);
                        const prod=CATALOG.find(p=>p.code===item.code)!;
                        return {code:item.code,name:prod.name,cat:prod.cat||'Altro',format:item.format,qty:item.qty,unitPrice:item.unitPrice,proPrice:item.unitPrice*(1-ti.pct/100),discountPct:ti.pct};
                      });
                      submitOrderMutation.mutate({items,totalQty,totalPublic:Object.values(cart).reduce((s,i)=>s+i.unitPrice*i.qty,0),totalPro:cartTotal,saving});
                    }}
                    disabled={submitOrderMutation.isPending||!paymentsActive}
                    className={`w-full font-bold text-xs py-2.5 rounded-xl transition-colors ${!paymentsActive?'bg-gray-200 text-gray-400 cursor-not-allowed':'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60'}`}>
                    {submitOrderMutation.isPending?'Invio in corso...':!paymentsActive?'Pagamenti non disponibili':'Invia ordine →'}
                  </button>
                  {submitOrderMutation.isError&&<div className="text-[9px] text-red-500 text-center">Errore nell'invio. Riprova.</div>}
                  <div className="text-[9px] text-gray-400 text-center">Il tuo margine: <span className="text-emerald-600 font-bold">€{saving.toFixed(2)}</span></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
