export function financeEnvironmentAllowed(url:string|undefined,environment:string|undefined,enabled:string|undefined,productionApproval?:string){
 if(enabled!=="true"||!url)return false;
 if(!environment)return url==="http://127.0.0.1:54321";
 if(environment!=="preview"&&!(environment==="production"&&productionApproval==="true"))return false;
 try{const target=new URL(url);return target.protocol==="https:"&&target.hostname.endsWith(".supabase.co")&&!target.username&&!target.password;}catch{return false;}
}

/** Keep the compiled UI aligned with the server activation gate; demo is a fallback only. */
export function financeBuildMode(url:string|undefined,environment:string|undefined,enabled:string|undefined,review:string|undefined,productionApproval?:string){
 if(financeEnvironmentAllowed(url,environment,enabled,productionApproval))return environment?"connected":"local";
 if(environment!=="production"&&review==="true")return "review";
 return "disabled";
}
