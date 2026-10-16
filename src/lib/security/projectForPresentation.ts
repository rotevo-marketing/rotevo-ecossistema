// Projection exclusively for the Ecossistema de Crescimento 2027.
// Never forward unapproved planning JSON to customers.
type O=Record<string,unknown>;
const object=(v:unknown):O|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as O:null;
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];

export type PresentationProjectRow={
 id:string;client_id:string;title:string;slug:string;description:string|null;status:string;
 data:unknown;clients:unknown
};

export function projectForPresentation(row:PresentationProjectRow,strategist:boolean){
 const data=object(row.data)??{};
 const ecosystem=object(data.ecosystem2027);
 if(!ecosystem)return null;
 if(strategist)return row;
 const schedule=object(data.deliverySchedule);
 const deliverySchedule=Object.fromEntries(Object.entries(schedule??{})
  .filter(([key,value])=>/^[a-z0-9-]{1,80}$/.test(key)&&typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)));
 const coverImageUrl=typeof data.coverImageUrl==="string"&&data.coverImageUrl.startsWith("https://")?data.coverImageUrl:null;
 const selected=strings(ecosystem.selectedDocumentCodes).filter(code=>/^\d{2}\.\d{2}$/.test(code));
 const presented=new Set(strings(ecosystem.presentedDocumentCodes).filter(code=>/^\d{2}\.\d{2}$/.test(code)));
 const visible=row.status==="published"?selected.filter(code=>presented.has(code)):[];
 const storedDocuments=object(ecosystem.documents)??{};
 const documents=Object.fromEntries(visible.flatMap(code=>{
  const doc=object(storedDocuments[code]);
  if(!doc||typeof doc.content!=="string"||doc.content.length>200000)return [];
  return [[code,{content:doc.content}]];
 }));
 return {
  id:row.id,client_id:row.client_id,title:row.title,slug:row.slug,
  description:row.description,status:row.status,clients:row.clients,
  data:{coverImageUrl,deliverySchedule,
   ecosystem2027:{version:ecosystem.version===1?1:undefined,
    selectedDocumentCodes:visible,presentedDocumentCodes:visible,documents}}
 };
}
