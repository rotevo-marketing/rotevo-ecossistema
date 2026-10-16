type O=Record<string,unknown>;
const object=(v:unknown):O|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as O:null;
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&x.length>0):[];
const safeHttps=(v:unknown):string|null=>{if(typeof v!=="string")return null;try{return new URL(v).protocol==="https:"?v:null;}catch{return null;}};
export type PresentationProjectRow={
 id:string;client_id:string;title:string;slug:string;description:string|null;status:string;
 data:unknown;clients:unknown
};
// Client-facing projection. A legacy module listed in selectedModules is considered a
// presentation-approved document; every unrelated module and root property is withheld.
// Field-level legacy content review is still required before production hardening.
export function projectForPresentation(row:PresentationProjectRow,strategist:boolean){
 if(strategist)return row;
 const d=object(row.data)??{};
 const schedule=object(d.deliverySchedule);
 const deliverySchedule=Object.fromEntries(Object.entries(schedule??{}).filter(([k,v])=>/^[a-z0-9-]{1,80}$/.test(k)&&typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)));
 const base={coverImageUrl:safeHttps(d.coverImageUrl),deliverySchedule};
 if(row.status==="draft")return {...row,data:base};
 const selected=strings(d.selectedModules).filter(v=>/^[a-z0-9-]{1,100}$/.test(v)).slice(0,80);
 const rawContent=object(d.moduleContent)??{};
 const moduleContent=Object.fromEntries(selected.filter(key=>Object.hasOwn(rawContent,key))
  .map(key=>[key,rawContent[key]]));
 const eco=object(d.ecosystem2027);
 const presented=strings(eco?.presentedDocumentCodes).filter(v=>/^\d{2}\.\d{2}$/.test(v)).slice(0,57);
 const data={...base,selectedModules:selected,moduleContent,
  ...(eco?{ecosystem2027:{version:eco.version===1?1:undefined,selectedDocumentCodes:presented,presentedDocumentCodes:presented}}:{})};
 return {...row,data};
}
