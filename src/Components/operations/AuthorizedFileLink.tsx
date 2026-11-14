"use client";
import {useEffect,useState} from "react";
import {request} from "@/lib/operations/api";
import {safeLink} from "@/lib/operations/model";
export default function AuthorizedFileLink({reference,children,download=false,className="text-sm font-semibold text-[#6D35F5]"}:{reference:string;children:React.ReactNode;download?:boolean;className?:string}){
 const asset=/^asset:\/\/([0-9a-f-]{36})$/i.exec(reference)?.[1];
 const [result,setResult]=useState<{id:string;url?:string;error?:string}|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!asset)return;let alive=true;const load=()=>request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids:[asset],download}).then(r=>{if(alive)setResult({id:asset,url:r.links[asset]});}).catch(()=>{if(alive)setResult({id:asset,error:"Arquivo indisponível. Tentar novamente"});});void load();const timer=setInterval(()=>void load(),(download?4:15)*60*1000);return()=>{alive=false;clearInterval(timer)};},[asset,download,retry]);
 const current=result?.id===asset?result:null;
 if(asset&&!current)return <span role="status" className="text-xs text-[#697386]">Preparando arquivo autorizado…</span>;
 if(asset&&current?.error)return <button type="button" className={className} onClick={()=>setRetry(v=>v+1)}>{current.error}</button>;
 const url=asset?current?.url:reference;
 const localAsset=Boolean(asset&&process.env.NEXT_PUBLIC_SUPABASE_URL==="http://127.0.0.1:54321"&&url?.startsWith("http://127.0.0.1:54321/storage/v1/object/sign/rotevo-private/"));
 if(!url||!safeLink(url,false)&&!localAsset)return <span className="text-xs text-[#697386]">Arquivo ainda não vinculado</span>;
 return <a className={className} href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>;
}
