export type ReviewState<T>={draft:T;saved:T;review:T|null;approved:T|null;published:T|null;visible:boolean};
export const copy=<T,>(value:T):T=>structuredClone(value);
export const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function initialReview<T>(draft:T):ReviewState<T>{return {draft:copy(draft),saved:copy(draft),review:null,approved:null,published:null,visible:true};}
export function reviewAction<T>(state:ReviewState<T>,action:"save"|"review"|"approve"|"release"):ReviewState<T>{
 if(action==="save")return {...state,saved:copy(state.draft),review:null,approved:null};
 if(!same(state.draft,state.saved))throw Error("Salve a versão atual antes de continuar.");
 if(action==="review")return {...state,review:copy(state.saved),approved:null};
 if(action==="approve"){
  if(!state.review||!same(state.review,state.saved))throw Error("Envie a versão salva para revisão antes de aprovar.");
  return {...state,approved:copy(state.saved)};
 }
 if(!state.approved||!same(state.approved,state.saved))throw Error("Aprove a versão atual antes de simular a liberação.");
 if(!state.visible)throw Error("Marque o documento como visível nesta simulação.");
 return {...state,published:copy(state.approved)};
}
export function visibleSnapshot<T>(state:ReviewState<T>):T|null{return state.visible&&state.published?copy(state.published):null;}
export type ChartPoint={label:string;value:number};
export function chartPoints(source:string):ChartPoint[]{
 const rows=source.split(';').map(x=>x.trim()).filter(Boolean);
 if(!rows.length||rows.length>8)return [];
 const result:ChartPoint[]=[];
 for(const row of rows){const match=/^([^:]{1,40}):\s*(\d+(?:[.,]\d+)?)$/.exec(row);if(!match)return [];const value=Number(match[2].replace(',','.'));if(!Number.isFinite(value)||value>1000000)return [];result.push({label:match[1].trim(),value});}
 return result;
}
export function imageAllowed(file:{type:string;size:number}){return ['image/png','image/jpeg','image/webp'].includes(file.type)&&file.size>0&&file.size<=4*1024*1024;}
export function prototypeAllowed(environment:string|undefined,localFlag:string|undefined){return environment!=="production"&&(environment==="preview"||localFlag==="true");}
