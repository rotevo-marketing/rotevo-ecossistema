import type {SupabaseClient} from "@supabase/supabase-js";
import {editorialCandidates,type OperationsProject,type OverviewDecision} from "./model.ts";

/** Only consult the caller's RLS-filtered decision records for already authorized projects. */
export async function loadOverviewDecisions(db:SupabaseClient,projects:OperationsProject[]):Promise<OverviewDecision[]>{
 const candidates=editorialCandidates(projects);
 const rows:OverviewDecision[]=[];
 for(const [phase,ids] of [["final",[...new Set(candidates.filter(x=>x.item.status==="awaiting_client").map(x=>x.project.id))]],["idea",[...new Set(candidates.filter(x=>x.item.status==="idea_pending").map(x=>x.project.id))]]] as const){
 for(let offset=0;offset<ids.length;offset+=100){
  let complete=false;
  for(let start=0;start<10000;start+=1000){
   const {data,error}=await db.from(phase==="final"?"editorial_approvals":"editorial_idea_approvals").select("id,project_id,content_id,content_version,decision,decided_at").in("project_id",ids.slice(offset,offset+100)).order("decided_at",{ascending:false}).order("id").range(start,start+999);
   if(error)throw Object.assign(new Error("A fonte de decisões editoriais está indisponível."),{code:error.code});
   if(!Array.isArray(data))throw Error("Resposta de decisões inválida.");rows.push(...(data as OverviewDecision[]).map(x=>({...x,phase})));
   if(data.length<1000){complete=true;break;}
  }
  if(!complete)throw Error("A consulta de decisões excedeu a janela segura; o total não será presumido.");
 }
 }
 return rows;
}
