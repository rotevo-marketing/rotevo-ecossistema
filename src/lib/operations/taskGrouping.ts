// Pure visual grouping. Filters, task data and database are untouched.
export type GroupMode="client"|"project"|"flat";
type Client={id:string;name:string};
export type GroupedTaskRow<T extends {project:{id:string;title?:string};client?:Client|null}> =
 | {kind:"header";key:string;label:string;count:number;project?:T["project"];client?:Client|null}
 | {kind:"item";item:T};
export function groupTaskRows<T extends {project:{id:string;title?:string};client?:Client|null}>(
 items:readonly T[],collapsed:Readonly<Record<string,boolean>>,mode:GroupMode="client"
):GroupedTaskRow<T>[] {
 if(mode==="flat")return items.map(item=>({kind:"item" as const,item}));
 const groups=new Map<string,T[]>();
 for(const item of items){
  // Orphan projects receive separate groups instead of accidentally combining unrelated clients.
  const key=mode==="project"?"project:"+item.project.id:item.client?.id?"client:"+item.client.id:"unlinked:"+item.project.id;
  const bucket=groups.get(key);
  if(bucket)bucket.push(item);else groups.set(key,[item]);
 }
 const rows:GroupedTaskRow<T>[]=[];
 for(const [key,bucket] of groups){
  const first=bucket[0];
  if(mode==="client")rows.push({kind:"header",key,label:first.client?.name??"Cliente não vinculado",client:first.client,count:bucket.length});
  else rows.push({kind:"header",key,label:first.client?.name??"Cliente",project:first.project,count:bucket.length});
  if(!collapsed[key])for(const item of bucket)rows.push({kind:"item",item});
 }
 return rows;
}
