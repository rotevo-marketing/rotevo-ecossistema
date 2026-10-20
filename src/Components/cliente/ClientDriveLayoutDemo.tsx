"use client";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
type Folder={id:string;title:string;description:string;url?:string};
const folders:Folder[]=[
{id:"identity",title:"Identidade visual",description:"Logotipos, paleta de cores, fontes e materiais de marca."},
{id:"recordings",title:"Conteúdo gravado",description:"Vídeos, gravações e arquivos originais de conteúdo."},
{id:"rich",title:"Materiais ricos",description:"E-books, apresentações, guias e materiais para download."},
{id:"ads",title:"Criativos para anúncios",description:"Peças gráficas, vídeos e variações para campanhas."},
{id:"documents",title:"Documentos do projeto",description:"Arquivos, apresentações e entregas compartilhadas."},
{id:"minutes",title:"Atas das reuniões",description:"Registros, decisões e encaminhamentos dos encontros."}
];
export default function ClientDriveLayoutDemo(){
return <section className="space-y-5">
 <div className="rounded-2xl border border-[#E3E7F0] bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#090D1C]">Pastas compartilhadas</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#525B70]">Acesse os materiais e documentos do seu projeto, organizados por categoria.</p></div><span className="rounded-full bg-[#EEE8FF] px-3 py-1.5 text-xs font-semibold text-[#6034B7]">Prévia demonstrativa</span></div></div>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{folders.map(folder=><article key={folder.id} className="flex min-h-48 flex-col rounded-2xl border border-[#E3E7F0] bg-white p-5 transition-colors hover:border-[#D6C7FA]"><div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEE8FF] text-[#6D35F5]"><RotevoTablerIcon name="folder-open" size={26}/></span><RotevoTablerIcon name="link" size={20} className="text-[#768095]"/></div><h3 className="mt-4 text-base font-bold text-[#090D1C]">{folder.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#525B70]">{folder.description}</p>{folder.url?.startsWith("https://")?<a href={folder.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-[#6D35F5] px-3 py-2 text-xs font-semibold text-white"><RotevoTablerIcon name="folder-open" size={16}/>Abrir pasta do Drive</a>:<span className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-[#F6F7FB] px-3 py-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="link" size={16}/>Link ainda não disponível</span>}</article>)}</div>
 <p className="text-xs leading-5 text-[#697386]">Layout demonstrativo: nenhum link real foi configurado. Na etapa de integração, cada pasta receberá a URL autorizada do Google Drive do cliente. Os arquivos permanecerão armazenados no Drive.</p>
</section>;
}
