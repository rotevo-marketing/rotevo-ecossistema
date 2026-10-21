import {safeLink,projectModules,type PortalModule} from "../operations/model.ts";
// Deliberately allowlisted response, never spread the original project JSON.
type RecordObject = Record<string, unknown>;
const object = (v: unknown): RecordObject | null => v && typeof v === "object" && !Array.isArray(v) ? v as RecordObject : null;
const str = (v: unknown) => typeof v === "string" ? v : undefined;
const https = (v: unknown) => { const s=str(v);return s&&safeLink(s,false)?s:undefined; };
const fields = (o: RecordObject, names: readonly string[]) => Object.fromEntries(
  names.filter(k => typeof o[k] === "string").map(k => [k,o[k]])
);
function publishedArray(v: unknown, names: readonly string[], allowLink=false) {
  if (!Array.isArray(v)) return [];
  return v.flatMap(value => {
    const item=object(value);
    if (!item || item.visibleToClient !== true || typeof item.id !== "string" || typeof item.title !== "string") return [];
    const projected: RecordObject = {...fields(item,names), id:item.id, title:item.title, visibleToClient:true};
    for(const key of ["meetingUrl","materialUrl"]){if(names.includes(key)){const link=https(item[key]);if(link)projected[key]=link;else delete projected[key];}}
    if (allowLink) { const link=https(item.driveUrl ?? item.link); if (link) { projected.driveUrl=link; projected.link=link; } }
    if (names.includes("done")) projected.done=item.done === true;
    return [projected];
  });
}
export type PrivateProjectRow = {id:string;client_id:string;title:string;slug:string;description:string|null;status:string;updated_at:string;data:unknown};
export function projectForClient(project:PrivateProjectRow,allowedModules?:readonly PortalModule[]) {
  const data=object(project.data) ?? {};
  const modules=projectModules(data).filter(m=>!allowedModules||allowedModules.includes(m));
  const schedule=modules.includes("planning")?object(data.deliverySchedule):null;
  const deliverySchedule=Object.fromEntries(Object.entries(schedule??{})
    .filter(([key,value]) => /^[a-z0-9-]{1,80}$/.test(key) && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)));
  return {
    id:project.id,title:project.title,slug:project.slug,description:project.description,
    status:project.status,updated_at:project.updated_at,
    data:{
      portalModules:modules,
      coverImageUrl:https(data.coverImageUrl) ?? null,
      deliverySchedule,
      planningStages:modules.includes("planning")&&Array.isArray(data.planningStages)?data.planningStages.flatMap(value=>{
        const v=object(value);
        if(!v||v.visibleToClient!==true||typeof v.id!=="string"||typeof v.title!=="string"||v.title.length>140||typeof v.dueDate!=="string"||!(v.dueDate===""||/^\d{4}-\d{2}-\d{2}$/.test(v.dueDate))||!["pending","in_progress","completed"].includes(String(v.status)))return [];
        return [{id:v.id,title:v.title,dueDate:v.dueDate,status:v.status,visibleToClient:true}];
      }).slice(0,15):[],
      executionTimeline:publishedArray(modules.includes("execution")?data.executionTimeline:[],
        ["phase","status","kind","startDate","dueDate","description"],true),
      editorialCalendar:publishedArray(modules.includes("content")?data.editorialCalendar:[],
        ["channel","format","publishDate","caption","version","status"],true),
      operationalAgenda:publishedArray(modules.includes("meetings")?data.operationalAgenda:[],["kind","date","time","status","notes","modality","location","duration","minutes","meetingUrl","materialUrl"]),
      marketingCampaigns:Array.isArray(data.marketingCampaigns)&&modules.includes("campaigns")?data.marketingCampaigns.flatMap(value=>{
        const c=object(value);if(!c||c.visibleToClient!==true||typeof c.id!=="string"||typeof c.title!=="string")return [];
        const projected:RecordObject={...fields(c,["id","title","kind","platform","objective","status","startDate","endDate","resultLabel","channels","resultSummary","nextStep"]),visibleToClient:true};
        for(const key of ["budget","spent","results"])projected[key]=typeof c[key]==="number"&&Number.isFinite(c[key])?c[key]:null;
        const link=https(c.dashboardUrl);if(link)projected.dashboardUrl=link;
        projected.actions=Array.isArray(c.actions)?c.actions.filter(v=>typeof v==="string"):[];
        projected.snapshots=Array.isArray(c.snapshots)?c.snapshots.flatMap(v=>{const r=object(v);if(!r||typeof r.month!=="string")return [];const row:RecordObject={month:r.month};for(const key of ["spent","impressions","clicks","results","leads","appointments","sales","revenue"])row[key]=typeof r[key]==="number"&&Number.isFinite(r[key])?r[key]:null;return [row];}):[];
        return [projected];
      }):[],
      onboardingChecklist:publishedArray(data.onboardingChecklist,["done"],true),
    }
  };
}
