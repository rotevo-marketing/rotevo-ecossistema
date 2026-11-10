// Pure presentation grouping. Does not change tasks, filters, or database records.
export type GroupedTaskRow<T extends {project:{id:string}}> =
 | {kind:"header";project:T["project"];count:number}
 | {kind:"item";item:T};
export function groupTaskRows<T extends {project:{id:string}}>(
 items:readonly T[], collapsed:Readonly<Record<string,boolean>>, mode:"project"|"flat"="project"
):GroupedTaskRow<T>[] {
 if(mode==="flat")return items.map(item=>({kind:"item" as const,item}));
 const buckets=new Map<string,T[]>();
 for(const item of items){const found=buckets.get(item.project.id);if(found)found.push(item);else buckets.set(item.project.id,[item]);}
 const rows:GroupedTaskRow<T>[]=[];
 for(const [id,bucket] of buckets){
  rows.push({kind:"header",project:bucket[0].project,count:bucket.length});
  if(!collapsed[id])for(const item of bucket)rows.push({kind:"item",item});
 }
 return rows;
}
