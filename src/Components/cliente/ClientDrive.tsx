"use client";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {driveFolders,type DriveFolder} from "@/lib/operations/model";

/** Only render folders explicitly shared with the authenticated client. */
export default function ClientDrive({folders}:{folders:DriveFolder[]}){
 const visible=driveFolders.filter(folder=>folders.some(item=>item.id===folder.id&&item.visibleToClient===true));
 return <section className="rv-ui2-module rv-ui2-client-drive space-y-3" aria-label="Materiais compartilhados">
  {visible.length===0?<div className="border-t border-[#E3E6ED] py-8 text-sm text-[#687487]">A Rotevo ainda não compartilhou pastas com esta conta.</div>:
   <div className="overflow-hidden border-y border-[#E3E6ED] bg-white">
    <div className="hidden grid-cols-[minmax(0,1fr)_180px] border-b border-[#E3E6ED] bg-[#F8F9FB] px-4 py-2 text-[11px] font-semibold text-[#687487] sm:grid">
     <span>Pasta</span><span>Acesso</span>
    </div>
    <ul className="divide-y divide-[#E3E6ED]">
     {visible.map(folder=>{
      const link=folders.find(item=>item.id===folder.id)?.url;
      return <li key={folder.id} className="grid gap-3 px-3 py-3 hover:bg-[#FAFBFE] sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:px-4">
       <div className="flex min-w-0 items-start gap-3">
        <RotevoTablerIcon name={folder.id==="access"?"folder-lock":"folder-open"} size={18} stroke={1.55} className="mt-0.5 shrink-0 text-[#687487]"/>
        <div className="min-w-0">
         <h3 className="text-[13px] font-semibold text-[#323647]">{folder.title}</h3>
         <p className="mt-0.5 text-xs leading-5 text-[#687487]">{folder.description}</p>
         {folder.id==="content"&&<p className="mt-1 text-[11px] text-[#687487]">Arquivos originais · Conteúdos editados · Arquivos de edição</p>}
        </div>
       </div>
       {link?<a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex w-fit min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5949D1] hover:bg-[#EDEAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C5CE7]">
         Abrir pasta <ContentTablerIcon name="external-link" size={15} stroke={1.55}/>
       </a>:<span className="text-xs text-[#687487]">Link ainda não disponível</span>}
      </li>;
     })}
    </ul>
   </div>}
 </section>;
}
