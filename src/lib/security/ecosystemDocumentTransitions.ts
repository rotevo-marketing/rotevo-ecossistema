import {validRichContent} from "../planning/richContent.ts";
type O=Record<string,unknown>;
const obj=(v:unknown):O|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as O:null;
const validDate=(v:unknown)=>typeof v==="string"&&v.length<80&&Number.isFinite(Date.parse(v));
const status=(d:O)=>d.reviewStatus??"draft";
/**
 * Validate every document transition on the strategist server API, not only in the UI.
 * Renders and old-project metadata may be edited separately; existing releases stay immutable.
 */
export function validEcosystemDocumentTransition(previous:unknown,next:unknown):boolean{
 const oldRoot=obj(previous)??{},newRoot=obj(next)??{};
 const oldEco=obj(oldRoot.ecosystem2027),newEco=obj(newRoot.ecosystem2027);
 if(!oldEco&&!newEco)return true; // legacy data can still be inspected in development
 if(!oldEco||!newEco)return false;
 const hidden=newEco.hiddenExecutiveDocumentCodes;if(hidden!==undefined&&(!Array.isArray(hidden)||!hidden.every(code=>typeof code==="string"&&/^00\.0[1-7]$/.test(code))||new Set(hidden).size!==hidden.length))return false;
 const prior=obj(oldEco.documents)??{},following=obj(newEco.documents)??{};
 for(const [code,raw] of Object.entries(following)){
  if(!/^\d{2}\.\d{2}$/.test(code))return false;
  const nextDoc=obj(raw);if(!nextDoc||typeof nextDoc.content!=="string"||nextDoc.content.length>200000||!validDate(nextDoc.updatedAt))return false;
  if(!["draft","review","approved"].includes(String(status(nextDoc))))return false;
  if(nextDoc.publishedContent!==undefined&&(typeof nextDoc.publishedContent!=="string"||nextDoc.publishedContent.length>200000||!validDate(nextDoc.publishedAt)))return false;
  if(nextDoc.richContent!==undefined&&!validRichContent(nextDoc.richContent))return false;
  if(nextDoc.publishedRichContent!==undefined&&!validRichContent(nextDoc.publishedRichContent))return false;
  const oldDoc=obj(prior[code]);
  if(!oldDoc){
   if(status(nextDoc)!=="draft"||nextDoc.publishedContent!==undefined||nextDoc.publishedAt!==undefined||nextDoc.publishedRichContent!==undefined)return false;
   continue;
  }
  const contentChanged=oldDoc.content!==nextDoc.content||JSON.stringify(oldDoc.richContent)!==JSON.stringify(nextDoc.richContent);
  const releaseChanged=oldDoc.publishedContent!==nextDoc.publishedContent||JSON.stringify(oldDoc.publishedRichContent)!==JSON.stringify(nextDoc.publishedRichContent);
  const dateChanged=oldDoc.publishedAt!==nextDoc.publishedAt;
  const stateChanged=status(oldDoc)!==status(nextDoc);
  if(contentChanged){
   if(status(nextDoc)!=="draft"||releaseChanged||dateChanged)return false;
  }else if(stateChanged){
   if(!((status(oldDoc)==="draft"&&status(nextDoc)==="review")||(status(oldDoc)==="review"&&status(nextDoc)==="approved")))return false;
   if(releaseChanged||dateChanged)return false;
  }
  if(releaseChanged||dateChanged){
   if(status(oldDoc)!=="approved"||status(nextDoc)!=="approved"||contentChanged||stateChanged)return false;
   if(nextDoc.publishedContent!==oldDoc.content||JSON.stringify(nextDoc.publishedRichContent)!==JSON.stringify(oldDoc.richContent)||!validDate(nextDoc.publishedAt))return false;
  }
 }
 for(const code of Object.keys(prior))if(!(code in following))return false;
 return true;
}
