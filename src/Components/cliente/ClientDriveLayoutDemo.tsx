"use client";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
type Folder={id:string;title:string;description:string;url?:string};
const folders:Folder[]=[
{id:"identity",title:"Identidade visual",description:"Logotipos, manual da marca, cores e fontes."},
{id:"content",title:"Conteúdos",description:"Arquivos originais, conteúdos editados e arquivos de edição."},
{id:"graphics",title:"Materiais gráficos",description:"Artes institucionais, banners, apresentações e impressos."},
{id:"rich",title:"Materiais ricos",description:"E-books, guias, PDFs e materiais educativos."},
{id:"campaigns",title:"Campanhas e anúncios",description:"Criativos publicitários e materiais de ações online e offline."},
{id:"documents",title:"Documentos do projeto",description:"Arquivos e entregas gerais compartilhadas."},
{id:"minutes",title:"Atas das reuniões",description:"Registros, decisões e encaminhamentos."},
{id:"reports",title:"Relatórios e resultados",description:"Relatórios periódicos e análises de desempenho."},
{id:"access",title:"Acessos e plataformas",description:"Links, instruções e recursos autorizados do projeto. Não armazenar senhas nesta pasta."}
];
export default function ClientDriveLayoutDemo(){
return <section className="space-y-5">
 <p className="text-sm leading-6 text-[#525B70]">Acesse os materiais e documentos do seu projeto, organizados em pastas.</p>
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{folders.map(folder=><article key={folder.id} className="flex min-h-48 flex-col rounded-2xl border border-[#E3E7F0] bg-white p-5 transition-colors hover:border-[#D6C7FA]"><div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEE8FF] text-[#6D35F5]"><RotevoTablerIcon name={folder.id==="access"?"folder-lock":"folder-open"} size={26}/></span><RotevoTablerIcon name="link" size={20} className="text-[#768095]"/></div><h3 className="mt-4 text-base font-bold text-[#090D1C]">{folder.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#525B70]">{folder.description}</p>{folder.id==="content"&&<p className="mt-3 text-xs leading-5 text-[#697386]">No Drive: 01 — Arquivos originais · 02 — Conteúdos editados · 03 — Arquivos de edição</p>}{folder.url?.startsWith("https://")?<a href={folder.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-[#6D35F5] px-3 py-2 text-xs font-semibold text-white"><RotevoTablerIcon name="folder-open" size={16}/>Abrir pasta do Drive</a>:<span className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-[#F6F7FB] px-3 py-2 text-xs font-medium text-[#697386]"><RotevoTablerIcon name="link" size={16}/>Link ainda não disponível</span>}</article>)}</div>
 <p className="text-xs leading-5 text-[#697386]">Layout demonstrativo: nenhum link real foi configurado. Na etapa de integração, cada pasta receberá a URL autorizada do Google Drive do cliente. Os arquivos permanecerão armazenados no Drive.</p>
</section>;
}
