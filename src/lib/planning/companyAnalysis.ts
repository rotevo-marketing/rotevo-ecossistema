export type NamedNote = { id: string; title: string; description: string; evidence?: string };
export type HistoricalMilestone = NamedNote & { period: string };
export type OrganizationalEntry = NamedNote & { kind: "department" | "workstream" | "person" | "external"; parentId?: string };
export type DecisionEntry = NamedNote & { responsible: string };
export type ConditionEntry = NamedNote & { caveat?: string };
export type CompanyAnalysis = {
  identity: { displayName: string; mainActivity: string; businessNature: string; sector: string; specialty: string; niche: string; founded: string; referenceLocation: string; geographicScope: string; operatingMode: string; deliveryProfile: string; summary: string; traits: NamedNote[] };
  history: { milestones: HistoricalMilestone[]; reading: string };
  organization: { organizationName: string; lead: string; leadRole: string; description: string; entries: OrganizationalEntry[] };
  governance: { summary: string; decisionMakers: string; responsibilities: DecisionEntry[]; conclusion: string };
  conditions: { stage: string; description: string; items: ConditionEntry[] };
  synthesis: { conclusion: string; explanation: string; findings: NamedNote[]; caveats: string };
};
export const EMPTY_COMPANY_ANALYSIS: CompanyAnalysis = {
  identity:{displayName:"",mainActivity:"",businessNature:"",sector:"",specialty:"",niche:"",founded:"",referenceLocation:"",geographicScope:"",operatingMode:"",deliveryProfile:"",summary:"",traits:[]},
  history:{milestones:[],reading:""},
  organization:{organizationName:"",lead:"",leadRole:"",description:"",entries:[]},
  governance:{summary:"",decisionMakers:"",responsibilities:[],conclusion:""},
  conditions:{stage:"",description:"",items:[]},
  synthesis:{conclusion:"",explanation:"",findings:[],caveats:""}
};
export function parseCompanyAnalysis(value: unknown): CompanyAnalysis {
  if(!value || typeof value!=="object" || Array.isArray(value))return structuredClone(EMPTY_COMPANY_ANALYSIS);
  const v=value as Record<string,unknown>;
  const result=structuredClone(EMPTY_COMPANY_ANALYSIS);
  const text=(x:unknown)=>typeof x==="string"?x.slice(0,12000):"";
  for(const section of Object.keys(result) as (keyof CompanyAnalysis)[]){
    const original=v[section];
    if(!original || typeof original!=="object" || Array.isArray(original))continue;
    const incoming=original as Record<string,unknown>;
    const target=result[section] as unknown as Record<string,unknown>;
    for(const key of Object.keys(target)){
      if(Array.isArray(target[key])){
        target[key]=Array.isArray(incoming[key])?(incoming[key] as unknown[]).slice(0,100).filter(e=>!!e && typeof e==="object" && !Array.isArray(e)).map(e=>{
          const item=e as Record<string,unknown>;
          return {id:text(item.id),title:text(item.title),description:text(item.description),evidence:text(item.evidence),period:text(item.period),kind:["department","workstream","person","external"].includes(text(item.kind))?text(item.kind):"workstream",parentId:text(item.parentId),responsible:text(item.responsible),caveat:text(item.caveat)};
        }):[];
      }else target[key]=text(incoming[key]);
    }
  }
  return result;
}

const stringKeys={
 identity:["displayName","mainActivity","businessNature","sector","specialty","niche","founded","referenceLocation","geographicScope","operatingMode","deliveryProfile","summary"],
 history:["reading"],
 organization:["organizationName","lead","leadRole","description"],
 governance:["summary","decisionMakers","conclusion"],
 conditions:["stage","description"],
 synthesis:["conclusion","explanation","caveats"]
} as const;
const listKeys={identity:"traits",history:"milestones",organization:"entries",governance:"responsibilities",conditions:"items",synthesis:"findings"} as const;
export function validCompanyAnalysis(value:unknown):value is CompanyAnalysis{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 if(JSON.stringify(value).length>250000)return false;
 const record=value as Record<string,unknown>;
 for(const section of Object.keys(stringKeys) as (keyof typeof stringKeys)[]){
  const raw=record[section];
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
  const data=raw as Record<string,unknown>;
  if(!stringKeys[section].every(key=>typeof data[key]==="string"&&(data[key] as string).length<=12000))return false;
  const items=data[listKeys[section]];
  if(!Array.isArray(items)||items.length>100)return false;
  const ids=new Set<string>();
  for(const item of items){
   if(!item||typeof item!=="object"||Array.isArray(item))return false;
   const v=item as Record<string,unknown>;
   if(typeof v.id!=="string"||!v.id||v.id.length>100||ids.has(v.id))return false;
   ids.add(v.id);
   if(typeof v.title!=="string"||v.title.length>12000||typeof v.description!=="string"||v.description.length>12000)return false;
   for(const key of ["evidence","period","parentId","responsible","caveat"]){
    if(v[key]!==undefined&&(typeof v[key]!=="string"||(v[key] as string).length>12000))return false;
   }
   if(section==="organization"&&!["department","workstream","person","external"].includes(String(v.kind)))return false;
  }
 }
 return true;
}
export function publicCompanyAnalysis(value:unknown):CompanyAnalysis|null{
 if(!validCompanyAnalysis(value))return null;
 const copy=parseCompanyAnalysis(value);
 // Explicit allowlist for every public collection; internal evidences never leave the strategist context.
 copy.identity.traits=copy.identity.traits.map(({id,title,description})=>({id,title,description}));
 copy.history.milestones=copy.history.milestones.map(({id,title,description,period})=>({id,title,description,period}));
 copy.organization.entries=copy.organization.entries.map(({id,title,description,kind,parentId})=>({id,title,description,kind,parentId}));
 copy.governance.responsibilities=copy.governance.responsibilities.map(({id,title,description,responsible})=>({id,title,description,responsible}));
 copy.conditions.items=copy.conditions.items.map(({id,title,description,caveat})=>({id,title,description,caveat}));
 copy.synthesis.findings=copy.synthesis.findings.map(({id,title,description})=>({id,title,description}));
 return Object.values(copy).some(section=>Object.values(section).some(value=>
  typeof value==="string"?value.trim():Array.isArray(value)&&value.some(item=>item.title.trim())
 ))?copy:null;
}
