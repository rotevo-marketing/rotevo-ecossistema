export type PlanningStage={id:string;title:string;dueDate:string;status:"pending"|"in_progress"|"completed";visibleToClient:boolean};
export function validStageDate(value:unknown):value is string {
 if(value==="")return true;
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validPlanningStages(value:unknown):value is PlanningStage[]{
 if(!Array.isArray(value)||value.length>15)return false;
 const ids=new Set<string>();
 return value.every(row=>{
  if(!row||typeof row!=="object"||Array.isArray(row))return false;
  if(typeof row.id!=="string"||!row.id.trim()||row.id.length>100||ids.has(row.id)||typeof row.title!=="string"||row.title.trim().length<3||row.title.length>140||!validStageDate(row.dueDate)||!["pending","in_progress","completed"].includes(row.status)||typeof row.visibleToClient!=="boolean")return false;
  ids.add(row.id);return true;
 });
}
