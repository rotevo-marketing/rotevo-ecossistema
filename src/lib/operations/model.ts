export const portalModules=["planning","execution","content","campaigns","meetings","contract","drive","finance"] as const;
export type PortalModule=(typeof portalModules)[number];
export type ContractRecord={id:string;title:string;status:"pending"|"active"|"ended"|"cancelled";service:string;summary:string;scope:string[];startDate:string;endDate:string;signedDate:string;documentUrl:string;visibleToClient:boolean;history:{id:string;title:string;date:string;url?:string}[]};
export const driveFolders=[{id:"identity",title:"Identidade visual",description:"Logotipos, manual da marca, cores e fontes."},{id:"content",title:"Conteúdos",description:"Arquivos originais, conteúdos editados e arquivos de edição."},{id:"graphics",title:"Materiais gráficos",description:"Artes institucionais, apresentações e impressos."},{id:"rich",title:"Materiais ricos",description:"E-books, guias e materiais educativos."},{id:"campaigns",title:"Campanhas e anúncios",description:"Materiais de ações online, offline e híbridas."},{id:"documents",title:"Documentos do projeto",description:"Arquivos e entregas compartilhados."},{id:"minutes",title:"Atas das reuniões",description:"Registros, decisões e encaminhamentos."},{id:"reports",title:"Relatórios e resultados",description:"Análises e relatórios de desempenho."},{id:"access",title:"Acessos e plataformas",description:"Links e instruções autorizados. Não armazene senhas."}] as const;
export type DriveFolder={id:string;url:string;visibleToClient:boolean};
export type ClientWorkspace={contracts:ContractRecord[];folders:DriveFolder[];modules:PortalModule[]};
export const emptyWorkspace=():ClientWorkspace=>({contracts:[],folders:[],modules:[...portalModules]});
export const record=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
export function safeLink(value:unknown,empty=true):value is string{
 if(value==="")return empty;if(typeof value!=="string"||value.length>2048)return false;
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password;}catch{return false;}
}
export function documentLink(value:unknown):value is string{return typeof value==="string"&&(/^asset:\/\/[0-9a-f-]{36}$/i.test(value)||safeLink(value));}
export function validDay(value:unknown):value is string{
 if(value==="")return true;if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
const text=(value:unknown,max:number,min=0)=>typeof value==="string"&&value.length<=max&&value.trim().length>=min;
export function validWorkspace(value:unknown):value is ClientWorkspace{
 const root=record(value);if(!root||!Array.isArray(root.modules)||!root.modules.every(m=>portalModules.includes(m))||new Set(root.modules).size!==root.modules.length||!Array.isArray(root.contracts)||root.contracts.length>100||!Array.isArray(root.folders)||root.folders.length>9)return false;
 const ids=new Set<string>();
 for(const raw of root.contracts){const c=record(raw);if(!c||!text(c.id,80,1)||ids.has(c.id as string)||!text(c.title,180,3)||!["pending","active","ended","cancelled"].includes(String(c.status))||!text(c.service,160)||!text(c.summary,5000)||!Array.isArray(c.scope)||c.scope.length>100||!c.scope.every(s=>text(s,1000,1))||![c.startDate,c.endDate,c.signedDate].every(validDay)||Boolean(c.startDate&&c.endDate&&String(c.startDate)>String(c.endDate))||!documentLink(c.documentUrl)||typeof c.visibleToClient!=="boolean"||!Array.isArray(c.history)||c.history.length>200)return false;ids.add(c.id as string);
  const events=new Set<string>();for(const event of c.history){const h=record(event);if(!h||!text(h.id,80,1)||events.has(String(h.id))||!text(h.title,180,3)||!validDay(h.date)||!h.date||(h.url!==undefined&&!documentLink(h.url)))return false;events.add(String(h.id));}
 }
 const folderIds=new Set<string>();for(const raw of root.folders){const f=record(raw);if(!f||!driveFolders.some(v=>v.id===f.id)||folderIds.has(String(f.id))||!safeLink(f.url)||typeof f.visibleToClient!=="boolean")return false;folderIds.add(String(f.id));}
 return true;
}
export function workspaceForClient(value:unknown):ClientWorkspace{
 if(!validWorkspace(value))return {contracts:[],folders:[],modules:[]};
 return {modules:[...value.modules],contracts:value.modules.includes("contract")?value.contracts.filter(c=>c.visibleToClient).map(c=>({id:c.id,title:c.title,status:c.status,service:c.service,summary:c.summary,scope:[...c.scope],startDate:c.startDate,endDate:c.endDate,signedDate:c.signedDate,documentUrl:c.documentUrl,visibleToClient:true,history:c.history.map(h=>({id:h.id,title:h.title,date:h.date,...(h.url?{url:h.url}:{})}))})):[],folders:value.modules.includes("drive")?value.folders.filter(f=>f.visibleToClient).map(f=>({id:f.id,url:f.url,visibleToClient:true})):[]};
}
export function projectModules(data:unknown):PortalModule[]{
 const d=record(data)??{};
 if(Array.isArray(d.portalModules))return portalModules.filter(m=>(d.portalModules as unknown[]).includes(m));
 const result:PortalModule[]=[];
 if(d.ecosystem2027)result.push("planning");
 for(const [key,module] of [["executionTimeline","execution"],["editorialCalendar","content"],["marketingCampaigns","campaigns"],["operationalAgenda","meetings"]] as const)if(Array.isArray(d[key])&&(d[key] as unknown[]).length)result.push(module);
 return result;
}
