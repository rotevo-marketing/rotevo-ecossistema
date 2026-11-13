import {authorizeProject,body,failure,identity,response,uuid} from "@/lib/operations/server";
import {validRichContent,richText,assetReferences,richContentError} from "@/lib/planning/richContent";
import {validEcosystemDocumentTransition} from "@/lib/security/ecosystemDocumentTransitions";
import {ecosystemDocuments} from "@/data/ecosystem2027";
export const runtime="nodejs";
export async function PATCH(request:Request){
 try{return await saveDocument(request);}catch(error){
  const reference=crypto.randomUUID();
  console.error("planning.document.unexpected",{reference,name:error instanceof Error?error.name:"UnknownError"});
  return failure(500,`Falha interna ao salvar o documento. Seu rascunho continua nesta página. Referência: ${reference}`);
 }
}
function storageFailure(error:{code?:string}){
 const reference=crypto.randomUUID();
 console.error("planning.document.storage",{reference,code:error.code??"unknown"});
 const reason=error.code==="22P05"?"Há um caractere incompatível com o armazenamento.":error.code==="23514"?"O documento não atende a uma regra de integridade do armazenamento.":"O armazenamento não confirmou a gravação.";
 return failure(503,`${reason} Seu rascunho continua nesta página. Referência: ${reference}`);
}
async function saveDocument(request:Request){
 const a=await identity(request);if(a.error)return a.error;let b;try{b=await body(request,1400000);}catch(error){return failure(error instanceof Error&&error.message==="Solicitação muito grande."?413:400,error instanceof Error?error.message:"Solicitação inválida.");}
 if(!uuid(b.projectId)||typeof b.expectedUpdatedAt!=="string"||typeof b.code!=="string"||!ecosystemDocuments.some(d=>d.code===b.code)||!["save","review","approve","publish","hide","show"].includes(String(b.action)))return failure(400);
 if(!await authorizeProject(a.identity,b.projectId,true))return failure(403);
 const r=await a.identity.db.from("planning_projects").select("id,data,updated_at").eq("id",b.projectId).maybeSingle();if(r.error)return failure(503);if(!r.data)return failure(404);if(r.data.updated_at!==b.expectedUpdatedAt)return failure(409,"O projeto mudou em outra sessão. Recarregue antes de salvar.");
 const root=r.data.data??{},eco=root.ecosystem2027;const executive=/^00\.0[1-7]$/.test(b.code);if(!eco||!executive&&!eco.selectedDocumentCodes?.includes(b.code))return failure(400);
 const old=eco.documents?.[b.code],now=new Date().toISOString();let doc;
 if(b.action==="hide"||b.action==="show"){if(!executive)return failure(400);const hidden=Array.isArray(eco.hiddenExecutiveDocumentCodes)?eco.hiddenExecutiveDocumentCodes.filter((code:unknown)=>typeof code==="string"&&/^00\.0[1-7]$/.test(code)):[];const next={...root,ecosystem2027:{...eco,hiddenExecutiveDocumentCodes:b.action==="hide"?[...new Set([...hidden,b.code])]:hidden.filter((code:string)=>code!==b.code)}};const saved=await a.identity.db.from("planning_projects").update({data:next,updated_at:now}).eq("id",b.projectId).eq("updated_at",b.expectedUpdatedAt).select("id,data,updated_at").maybeSingle();return saved.error?storageFailure(saved.error):saved.data?response({project:saved.data}):failure(409); }
 if(b.action==="save"){
  const invalid=richContentError(b.richContent);if(invalid)return failure(400,invalid);if(!validRichContent(b.richContent))return failure(400);
  const assets=assetReferences(b.richContent);if(assets.length){const rows=await a.identity.db.from("project_assets").select("id").eq("project_id",b.projectId).eq("purpose","planning").in("id",assets);if(rows.error)return failure(503);if(rows.data?.length!==assets.length)return failure(403,"A imagem precisa pertencer a este planejamento.");}
  doc={...old,content:richText(b.richContent),richContent:b.richContent,updatedAt:now,reviewStatus:"draft"};
 }else{
  if(!old?.richContent||!validRichContent(old.richContent)||!old.content?.trim())return failure(400,"Salve o documento antes de continuar.");
  if(b.action==="review"&&old.reviewStatus==="draft")doc={...old,reviewStatus:"review"};
  else if(b.action==="approve"&&old.reviewStatus==="review")doc={...old,reviewStatus:"approved"};
  else if(b.action==="publish"&&old.reviewStatus==="approved")doc={...old,publishedContent:old.content,publishedRichContent:old.richContent,publishedAt:now};
  else return failure(400,"Confira a sequência de revisão, aprovação e publicação.");
 }
 const next={...root,ecosystem2027:{...eco,documents:{...eco.documents,[b.code]:doc}}};if(!validEcosystemDocumentTransition(root,next))return failure(400,"A versão publicada precisa ser preservada.");
 const saved=await a.identity.db.from("planning_projects").update({data:next,updated_at:now}).eq("id",b.projectId).eq("updated_at",b.expectedUpdatedAt).select("id,data,updated_at").maybeSingle();return saved.error?storageFailure(saved.error):saved.data?response({project:saved.data}):failure(409,"O projeto mudou durante a gravação. Seu rascunho continua na página.");
}
