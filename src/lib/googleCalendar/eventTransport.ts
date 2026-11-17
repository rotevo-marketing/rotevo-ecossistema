export function googleEventTransport(token:string,fetcher:typeof fetch=fetch){
 return (url:string,method="GET",data?:unknown,etag?:string)=>fetcher(url,{
  method,cache:"no-store",signal:AbortSignal.timeout(12_000),
  headers:{Authorization:"Bearer "+token,...(data?{"Content-Type":"application/json"}:{}),...(etag?{"If-Match":etag}:{})},
  ...(data?{body:JSON.stringify(data)}:{})
 });
}
export function googleEventMutationQuery(notify:boolean){
 return "?conferenceDataVersion=1&sendUpdates="+(notify?"all":"none");
}
