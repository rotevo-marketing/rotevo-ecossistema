"use client";
import {useState} from "react";
import AssetUpload from "./AssetUpload";

export default function ProfilePhotoField({avatarRef,initialUrl="",disabled=false,onChange,onUploading}:{avatarRef:string;initialUrl?:string;disabled?:boolean;onChange:(reference:string)=>void;onUploading:(busy:boolean)=>void}){
 const [uploaded,setUploaded]=useState<{reference:string;url:string}|null>(null);
 const preview=avatarRef?(uploaded?.reference===avatarRef?uploaded.url:initialUrl):"";
 return <div className="space-y-2">
  <div className="flex flex-wrap items-center gap-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] text-xs text-[#6D35F5]">{preview?<img src={preview} alt="Fotografia do usuário" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:<span>Sem foto</span>}</div><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><AssetUpload purpose="avatar" hasPhoto={!!avatarRef} disabled={disabled} onBusyChange={onUploading} onUploaded={(reference,_name,url)=>{setUploaded({reference,url});onChange(reference);}}/>{avatarRef&&<button type="button" disabled={disabled} onClick={()=>onChange("")} className="min-h-9 cursor-pointer rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">Remover</button>}</div><p className="text-xs text-[#697386]">PNG, JPG ou WebP · Até 4 MB</p></div></div>
 </div>;
}
