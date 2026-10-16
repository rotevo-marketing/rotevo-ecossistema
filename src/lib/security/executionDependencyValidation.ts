type ObjectValue=Record<string,unknown>;
const object=(value:unknown):ObjectValue|null=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as ObjectValue:null;

/** Validate the entire execution dependency graph before accepting any project data write.
 * Existing projects without a timeline remain compatible. All existing links must be
 * resolvable within the same project; dangling links and cycles are rejected.
 */
export function validExecutionDependencies(data:unknown):boolean{
 const root=object(data);
 if(!root)return false;
 const timeline=root.executionTimeline;
 if(timeline===undefined||timeline===null)return true;
 if(!Array.isArray(timeline)||timeline.length>2000)return false;
 const dependencies=new Map<string,string[]>();
 for(const entry of timeline){
  const item=object(entry);
  if(!item||typeof item.id!=="string"||!item.id.trim()||item.id.length>128||dependencies.has(item.id))return false;
  const raw=item.dependencies??[];
  if(!Array.isArray(raw)||raw.length>200)return false;
  if(raw.some((id:unknown)=>typeof id!=="string"||!id.trim()||id.length>128))return false;
  const ids=raw as string[];
  if(new Set(ids).size!==ids.length||ids.includes(item.id))return false;
  dependencies.set(item.id,ids);
 }
 // Completion is a server-enforced workflow rule, not merely a disabled UI button.
 for(const entry of timeline){
  const item=object(entry)!;
  if(item.status!=="completed")continue;
  for(const id of dependencies.get(item.id as string)??[]){
   const prerequisite=timeline.find(candidate=>object(candidate)?.id===id);
   if(object(prerequisite)?.status!=="completed")return false;
  }
 }
 const done=new Set<string>(),visiting=new Set<string>();
 const visit=(id:string):boolean=>{
  if(!dependencies.has(id))return false;
  if(visiting.has(id))return false;
  if(done.has(id))return true;
  visiting.add(id);
  for(const prerequisite of dependencies.get(id)??[]){
   if(!visit(prerequisite))return false;
  }
  visiting.delete(id);
  done.add(id);
  return true;
 };
 return [...dependencies.keys()].every(visit);
}
