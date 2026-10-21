const allowedStatus=new Set(["draft","active","paused","finished"]);
const allowedPlatforms=new Set(["Google Ads","Meta Ads","Outro"]);
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const monthPattern=/^\d{4}-(0[1-9]|1[0-2])$/;
const finite=(v:unknown,integer=false)=>v===null||v===undefined||(typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=1e12&&(!integer||Number.isInteger(v)));
const str=(v:unknown,max:number,required=false)=>typeof v==="string"&&v.length<=max&&(!required||v.trim().length>=3);
const day=(s:unknown)=>s===""||(typeof s==="string"&&datePattern.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+"T12:00:00").toISOString().slice(0,10)===s);
const safeUrl=(s:unknown)=>{if(s==="")return true;if(typeof s!=="string"||s.length>2048)return false;try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}};

export function validCampaignRecords(value:unknown):boolean{
 if(!Array.isArray(value)||value.length>150)return false;
 const ids=new Set<string>();
 for(const c of value){
  if(!c||typeof c!=="object"||Array.isArray(c))return false;
  const x=c as Record<string,unknown>;
  if(typeof x.id!=="string"||x.id.length>80||ids.has(x.id)||!str(x.title,140,true)||
   !allowedStatus.has(String(x.status))||!allowedPlatforms.has(String(x.platform))||
   !str(x.objective,220)||!str(x.notes,1200)||!str(x.resultLabel,60)||
   !day(x.startDate)||!day(x.endDate)||!!x.endDate&&!!x.startDate&&String(x.endDate)<String(x.startDate)||
   !finite(x.budget)||!finite(x.spent)||!finite(x.results,true)||!safeUrl(x.dashboardUrl))return false;
  if(x.kind!==undefined&&!["online","offline","hybrid"].includes(String(x.kind)))return false;
  if(x.visibleToClient!==undefined&&typeof x.visibleToClient!=="boolean")return false;
  for(const [key,max] of [["channels",600],["resultSummary",2000],["nextStep",1000]] as const)if(x[key]!==undefined&&!str(x[key],max))return false;
  if(x.actions!==undefined&&(!Array.isArray(x.actions)||x.actions.length>100||!x.actions.every(a=>str(a,1000))))return false;
  ids.add(x.id);
  if(x.snapshots!==undefined){
   if(!Array.isArray(x.snapshots)||x.snapshots.length>120)return false;
   const months=new Set<string>();
   for(const report of x.snapshots){
    if(!report||typeof report!=="object"||Array.isArray(report))return false;
    const r=report as Record<string,unknown>;
    if(typeof r.id!=="string"||r.id.length>80||
     typeof r.month!=="string"||!monthPattern.test(r.month)||months.has(r.month)||
     !str(r.notes??"",1000)||!finite(r.spent)||!finite(r.revenue)||
     !["impressions","clicks","results","leads","appointments","sales"].every(k=>finite(r[k],true)))return false;
    months.add(r.month);
   }
  }
 }
 return true;
}
