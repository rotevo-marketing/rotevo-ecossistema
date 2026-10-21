"use client";
import {useState} from "react";
import {request} from "@/lib/operations/api";
import ProfilePhotoField from "@/Components/operations/ProfilePhotoField";

export type EditableTeamMember={user_id:string;display_name:string;avatar_ref:string;avatar_url:string|null;profile_updated_at:string|null};
export default function TeamMemberProfileEditor({member,onSaved,onCancel}:{member:EditableTeamMember;onSaved:()=>void;onCancel:()=>void}){
 const [name,setName]=useState(member.display_name),[photo,setPhoto]=useState(member.avatar_ref),[uploading,setUploading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const dirty=name!==member.display_name||photo!==member.avatar_ref;
 function cancel(){if(!saving&&!uploading&&(!dirty||window.confirm("Descartar as alterações deste usuário?")))onCancel();}
 async function save(event:React.FormEvent){event.preventDefault();if(saving||uploading)return;setSaving(true);setError("");try{await request("/api/team/members/profile","PATCH",{userId:member.user_id,displayName:name,avatarRef:photo,expectedUpdatedAt:member.profile_updated_at});window.dispatchEvent(new Event("rotevo-profile-updated"));onSaved();}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível salvar o usuário.");}finally{setSaving(false);}}
 return <form onSubmit={event=>void save(event)} aria-label={`Editar usuário ${member.display_name}`} className="mt-4 space-y-4 rounded-xl border border-[#E3E7F0] bg-[#F8F9FC] p-4">
  <h3 className="text-sm font-bold">Editar usuário</h3>
  <fieldset disabled={saving||uploading} className="space-y-4"><label className="block text-xs font-semibold">Nome completo<input required minLength={2} maxLength={180} value={name} onChange={event=>setName(event.target.value)} className="mt-1 w-full rounded-lg border border-[#D5D9E6] bg-white px-3 py-2 text-sm"/></label>
  <ProfilePhotoField avatarRef={photo} initialUrl={member.avatar_url??""} disabled={saving||uploading} onChange={setPhoto} onUploading={setUploading}/></fieldset>
  <p className="text-xs text-[#697386]">Nome e foto serão atualizados no perfil e na lista da equipe. A edição não altera as permissões de acesso.</p>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving||uploading||!dirty} className="rounded-lg bg-[#6D35F5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving?"Salvando…":uploading?"Enviando foto…":"Salvar usuário"}</button><button type="button" disabled={saving||uploading} onClick={cancel} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Cancelar</button></div>
 </form>;
}
