type O=Record<string,unknown>;
const object=(v:unknown):O|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as O:null;
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&x.length>0):[];
const safeHttps=(v:unknown):string|null=>{if(typeof v!=="string")return null;try{return new URL(v).protocol==="https:"?v:null;}catch{return null;}};
// Legacy forms contain arbitrary nested keys. Fail closed for metadata and secrets:
 // clients receive only an explicit set of presentation-oriented fields.
const legacyFields=new Set([
 "fields","sections","blocks","items","content","text","html","title","subtitle","description",
 "body","label","value","name","type","order","position","icon","image","imageUrl","photo",
 "coverImageUrl","characteristics","traits","pillars","values","mission","vision","purpose",
 "tone","keywords","objectives","goals","metrics","channels","personas","journeys",
 "steps","phases","strategies","actions","recommendations","strengths","weaknesses",
 "opportunities","threats","analysis","summary","observations","notesForClient",
 "links","url","href","caption","format","status","date","startDate","dueDate",
 "color","category","slug","id","primary","secondary","enabled","active","visible",
 "rows","columns","cards","groups","subsections","entries","examples","references",
 "competitors","targetAudience","audience","profile","expert","business",
 "secondaryIdeas","strategicDirection","positioning","differentials"
]);
const allowedLegacyFieldsByModule:Record<string,Set<string>>={
 "dna-da-empresa":new Set(["quemEAEmpresa","oQueFaz","historia","posicionamento","diferenciais","publico","problemasQueResolve","transformacao","propostaDeValor","missao","visao","valores","autoridade","percepcaoDesejada"]),
 "dna-do-especialista":new Set(["quemEoQueFaz","especialidadesExpertise","trajetoriaProfissional","historiaPessoal","marcosConquistas","bandeirasCausas","propositoDigital","autodefinicao","comoGostariaDeSerVisto"])
};
function scrubLegacy(value:unknown,depth=0,moduleSlug="",parentKey=""):unknown{
 if(depth>14)return null;
 if(value===null||typeof value==="boolean"||typeof value==="number")return value;
 if(typeof value==="string")return value.slice(0,150000);
 if(Array.isArray(value))return value.slice(0,1000).map(item=>scrubLegacy(item,depth+1,moduleSlug,parentKey));
 const obj=object(value);
 if(!obj)return null;
 const allowed=parentKey==="fields"?(allowedLegacyFieldsByModule[moduleSlug]??new Set<string>()):legacyFields;
 return Object.fromEntries(Object.entries(obj)
  .filter(([key])=>allowed.has(key))
  .map(([key,item])=>[key,scrubLegacy(item,depth+1,moduleSlug,key)]));
}
export type PresentationProjectRow={
 id:string;client_id:string;title:string;slug:string;description:string|null;status:string;
 data:unknown;clients:unknown
};
// Client-facing projection. A legacy module listed in selectedModules is considered a
// presentation-approved document; every unrelated module and root property is withheld.
// Unknown legacy keys are removed recursively. Human review is still needed for text inside approved keys.
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
  .map(key=>[key,scrubLegacy(rawContent[key],0,key)]));
 const eco=object(d.ecosystem2027);
 const presented=strings(eco?.presentedDocumentCodes).filter(v=>/^\d{2}\.\d{2}$/.test(v)).slice(0,57);
 const data={...base,selectedModules:selected,moduleContent,
  ...(eco?{ecosystem2027:{version:eco.version===1?1:undefined,selectedDocumentCodes:presented,presentedDocumentCodes:presented}}:{})};
 return {...row,data};
}
