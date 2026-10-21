export function financeEnvironmentAllowed(url:string|undefined,environment:string|undefined,enabled:string|undefined,productionApproval?:string){
 if(enabled!=="true"||!url)return false;
 if(!environment)return url==="http://127.0.0.1:54321";
 if(environment!=="preview"&&!(environment==="production"&&productionApproval==="true"))return false;
 try{const target=new URL(url);return target.protocol==="https:"&&target.hostname.endsWith(".supabase.co")&&!target.username&&!target.password;}catch{return false;}
}
