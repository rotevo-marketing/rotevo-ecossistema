import {EMPTY_LEGACY_COMPANY_ANALYSIS,parseLegacyCompanyAnalysis,validLegacyCompanyAnalysis,publicLegacyCompanyAnalysis,type LegacyCompanyAnalysis} from "./companyAnalysisLegacy.ts";
import {safeCompanyRichText,companyText,plainCompanyRichText} from "./companyAnalysisText.ts";
export type {NamedNote,HistoricalMilestone,LegacyCompanyAnalysis} from "./companyAnalysisLegacy.ts";
export type AnalysisNote={id:string;title:string;description:string};
export type CompanyAnalysisV2={
 formatVersion:2;
 identity:{displayName:string;description:string;founded:string;referenceLocation:string;geographicScope:string;operatingMode:string};
 history:{milestones:(AnalysisNote&{period:string})[]};
 organization:{leadership:{name:string;role:string;description:string};workstreams:AnalysisNote[];responsibilities:(AnalysisNote&{responsible:string})[];externalSupports:(AnalysisNote&{supportType:string})[]};
 governance:{summary:string};
 conditions:{stage:string;capacities:AnalysisNote[];constraints:AnalysisNote[];limitations:AnalysisNote[]};
 synthesis:{conclusion:string;findings:AnalysisNote[];implication:string};
 /** Internal compatibility archive. Never included in a published projection. */
 legacySnapshot?:LegacyCompanyAnalysis;
};
export type CompanyAnalysis=LegacyCompanyAnalysis|CompanyAnalysisV2;
export const EMPTY_COMPANY_ANALYSIS=EMPTY_LEGACY_COMPANY_ANALYSIS;
export const EMPTY_COMPANY_ANALYSIS_V2:CompanyAnalysisV2={
 formatVersion:2,
 identity:{displayName:"",description:"",founded:"",referenceLocation:"",geographicScope:"",operatingMode:""},
 history:{milestones:[]},organization:{leadership:{name:"",role:"",description:""},workstreams:[],responsibilities:[],externalSupports:[]},
 governance:{summary:""},conditions:{stage:"",capacities:[],constraints:[],limitations:[]},synthesis:{conclusion:"",findings:[],implication:""}
};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
export const isCompanyAnalysisV2=(v:unknown):v is CompanyAnalysisV2=>object(v)&&v.formatVersion===2;
const strings=(v:unknown,keys:string[])=>object(v)&&Object.keys(v).every(key=>keys.includes(key))&&keys.every(key=>typeof v[key]==="string"&&(v[key] as string).length<=48000&&!(v[key] as string).includes("\0"));
function notes(v:unknown,extra:string[]=[]):boolean{
 if(!Array.isArray(v)||v.length>500)return false;
 const ids=new Set<string>();
 return v.every(item=>strings(item,["id","title","description",...extra])&&item.id.length>0&&item.id.length<=100&&!ids.has(item.id)&&!!ids.add(item.id));
}
export function validCompanyAnalysis(value:unknown):value is CompanyAnalysis{
 if(!isCompanyAnalysisV2(value))return !object(value)||value.formatVersion===undefined?validLegacyCompanyAnalysis(value):false;
 if(JSON.stringify(value).length>750000)return false;
 const r=value as unknown as Record<string,unknown>;
 if(Object.keys(r).some(key=>!["formatVersion","identity","history","organization","governance","conditions","synthesis","legacySnapshot"].includes(key)))return false;
 return strings(r.identity,["displayName","description","founded","referenceLocation","geographicScope","operatingMode"])&&
 object(r.history)&&Object.keys(r.history).length===1&&notes(r.history.milestones,["period"])&&
 object(r.organization)&&Object.keys(r.organization).length===4&&strings(r.organization.leadership,["name","role","description"])&&notes(r.organization.workstreams)&&notes(r.organization.responsibilities,["responsible"])&&notes(r.organization.externalSupports,["supportType"])&&
 strings(r.governance,["summary"])&&object(r.conditions)&&Object.keys(r.conditions).length===4&&typeof r.conditions.stage==="string"&&r.conditions.stage.length<=48000&&!r.conditions.stage.includes("\0")&&notes(r.conditions.capacities)&&notes(r.conditions.constraints)&&notes(r.conditions.limitations)&&
 object(r.synthesis)&&Object.keys(r.synthesis).length===3&&typeof r.synthesis.conclusion==="string"&&r.synthesis.conclusion.length<=48000&&typeof r.synthesis.implication==="string"&&r.synthesis.implication.length<=48000&&!r.synthesis.conclusion.includes("\0")&&!r.synthesis.implication.includes("\0")&&notes(r.synthesis.findings)&&
 (r.legacySnapshot===undefined||validLegacyCompanyAnalysis(r.legacySnapshot));
}
export function parseCompanyAnalysis(value:unknown):CompanyAnalysis{
 return isCompanyAnalysisV2(value)?validCompanyAnalysis(value)?structuredClone(value):structuredClone(EMPTY_COMPANY_ANALYSIS_V2):parseLegacyCompanyAnalysis(value);
}
export function companyAnalysisForEditing(value:unknown):CompanyAnalysisV2{
 if(isCompanyAnalysisV2(value))return parseCompanyAnalysis(value) as CompanyAnalysisV2;
 if(!validLegacyCompanyAnalysis(value))return structuredClone(EMPTY_COMPANY_ANALYSIS_V2);
 const old=parseLegacyCompanyAnalysis(value),v=structuredClone(EMPTY_COMPANY_ANALYSIS_V2);
 const note=(n:{id:string;title:string;description:string})=>({id:n.id,title:n.title,description:plainCompanyRichText(n.description)});
 v.identity={displayName:old.identity.displayName,description:plainCompanyRichText(old.identity.summary||old.identity.mainActivity),founded:old.identity.founded,referenceLocation:old.identity.referenceLocation,geographicScope:old.identity.geographicScope,operatingMode:old.identity.operatingMode};
 v.history.milestones=old.history.milestones.map(m=>({...note(m),period:m.period}));
 v.organization.leadership={name:old.organization.lead,role:old.organization.leadRole,description:plainCompanyRichText(old.organization.description)};
 v.organization.workstreams=old.organization.entries.filter(e=>e.kind==="workstream").map(note);
 v.organization.responsibilities=old.governance.responsibilities.map(r=>({...note(r),responsible:r.responsible}));
 v.organization.externalSupports=old.organization.entries.filter(e=>e.kind==="external").map(e=>({...note(e),supportType:""}));
 v.governance.summary=plainCompanyRichText(old.governance.summary);
 v.conditions.stage=plainCompanyRichText([old.conditions.stage,old.conditions.description].filter(Boolean).join("\n"));
 v.conditions.constraints=old.conditions.items.map(item=>({...note(item),description:plainCompanyRichText([item.description,item.caveat].filter(Boolean).join("\n"))}));
 v.synthesis.conclusion=plainCompanyRichText(old.synthesis.conclusion);v.synthesis.findings=old.synthesis.findings.map(note);
 // No inference of a strategic implication. Complete original data stays recoverable.
 v.legacySnapshot=structuredClone(value);
 return v;
}
export function companyAnalysisPublicationErrors(value:unknown):string[]{
 if(!validCompanyAnalysis(value))return ["Confira a estrutura da análise antes de disponibilizar."];
 const errors:string[]=[];
 const description=isCompanyAnalysisV2(value)?value.identity.description:value.identity.summary||value.identity.mainActivity;
 if(!value.identity.displayName.trim())errors.push("Preencha o nome de apresentação.");
 if(!companyText(description))errors.push("Preencha a descrição do negócio.");
 return errors;
}
export function publicCompanyAnalysis(value:unknown):CompanyAnalysis|null{
 if(!isCompanyAnalysisV2(value))return publicLegacyCompanyAnalysis(value);
 if(!validCompanyAnalysis(value)||companyAnalysisPublicationErrors(value).length)return null;
 const rich=safeCompanyRichText,note=(n:AnalysisNote)=>({id:n.id,title:n.title,description:rich(n.description)});
 // Deliberate public allowlist; excludes compatibility archive and any evidence.
 return {
  formatVersion:2,identity:{displayName:value.identity.displayName,description:rich(value.identity.description),founded:value.identity.founded,referenceLocation:value.identity.referenceLocation,geographicScope:value.identity.geographicScope,operatingMode:value.identity.operatingMode},
  history:{milestones:value.history.milestones.map(m=>({...note(m),period:m.period}))},
  organization:{leadership:{name:value.organization.leadership.name,role:value.organization.leadership.role,description:rich(value.organization.leadership.description)},workstreams:value.organization.workstreams.map(note),responsibilities:value.organization.responsibilities.map(r=>({...note(r),responsible:r.responsible})),externalSupports:value.organization.externalSupports.map(e=>({...note(e),supportType:e.supportType}))},
  governance:{summary:rich(value.governance.summary)},conditions:{stage:rich(value.conditions.stage),capacities:value.conditions.capacities.map(note),constraints:value.conditions.constraints.map(note),limitations:value.conditions.limitations.map(note)},
  synthesis:{conclusion:rich(value.synthesis.conclusion),findings:value.synthesis.findings.map(note),implication:rich(value.synthesis.implication)}
 };
}
