import {ecosystemDocuments} from "../../data/ecosystem2027.ts";
import {validStageDate} from "./stages.ts";
export type PlanningAreaDelivery={area:string;dueDate:string;status:"pending"|"in_progress"|"review"|"completed";visibleToClient:boolean};
export const planningAreas=Array.from(new Set(ecosystemDocuments.filter(d=>/^(0[1-9]|1[0-2]) /.test(d.area)).map(d=>d.area)));
export function validPlanningAreaSchedule(value:unknown):value is PlanningAreaDelivery[]{
 if(!Array.isArray(value)||value.length>planningAreas.length)return false;
 const unique=new Set<string>();
 return value.every(row=>{
  if(!row||typeof row!=="object"||Array.isArray(row))return false;
  const x=row as Record<string,unknown>;
  if(typeof x.area!=="string"||!planningAreas.includes(x.area)||unique.has(x.area)||!validStageDate(x.dueDate)||!["pending","in_progress","review","completed"].includes(String(x.status))||typeof x.visibleToClient!=="boolean")return false;
  unique.add(x.area);return true;
 });
}
export function normalizedPlanningAreaSchedule(value:unknown):PlanningAreaDelivery[]{
 if(!validPlanningAreaSchedule(value))return [];
 return value.map(v=>({...v}));
}
