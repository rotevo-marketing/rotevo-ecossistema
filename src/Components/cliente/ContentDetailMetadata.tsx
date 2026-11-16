import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {editorialChannelIcon} from "@/lib/editorial/channels";
import styles from "./ContentDetailMetadata.module.css";

const channelColors:Record<string,number>={
 instagram:0, facebook:1, linkedin:2, youtube:3, tiktok:4, pinterest:3,
 threads:4, x:4, whatsapp:5, telegram:2, bluesky:1, snapchat:6, twitch:7,
 reddit:8, spotify:5, "site/blog":9, "e-mail":7,
};
const formatColors:Record<string,number>={
 reels:7, carrossel:2, stories:8, video:11, "post estatico":5, live:1, artigo:9, audio:6,
};
const colorIndex=(values:Record<string,number>,label:string)=>{
 const key=label.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu,"");
 return Object.hasOwn(values,key)?values[key]:10;
};

export function ContentDetailBadges({channel,format,version}:{channel:string;format:string;version?:string}){
 return <ul aria-label="Canal, formato e versão" className={styles.badges}>
  {channel.trim()&&<li className={styles.chip} data-tone={colorIndex(channelColors,channel)}><ContentTablerIcon name={editorialChannelIcon(channel)} size={15}/>{channel}</li>}
  {format.trim()&&<li className={styles.chip} data-tone={colorIndex(formatColors,format)}>{format}</li>}
  <li className={styles.chip} data-tone="version">Versão {version||"Não informada"}</li>
 </ul>;
}

type Reference={url:string;note:string};
export function ContentDetailMaterials({briefUrl,driveUrl,references,safeLink}:{
 briefUrl?:string;driveUrl?:string;references?:Reference[];safeLink:(url?:string)=>string|null;
}){
 const briefing=safeLink(briefUrl), material=safeLink(driveUrl);
 const creative=(references??[]).flatMap(reference=>{
  const url=safeLink(reference.url);
  return url?[{url,note:reference.note?.trim(),hostname:new URL(url).hostname}]:[];
 });
 if(!briefing&&!material&&!creative.length)return null;
 return <section className="mt-5" aria-label="Materiais e referências">
  <h4 className="text-sm font-semibold">Materiais e referências</h4>
  <div className="mt-3 space-y-3">
   {briefing&&<div className={styles.material}><h5>Roteiro ou briefing</h5><a href={briefing} target="_blank" rel="noopener noreferrer"><RotevoTablerIcon name="link" size={15}/>Abrir roteiro ou briefing ↗</a></div>}
   {material&&<div className={styles.material}><h5>Material da publicação</h5><a href={material} target="_blank" rel="noopener noreferrer"><RotevoTablerIcon name="link" size={15}/>Abrir material da publicação ↗</a></div>}
   {creative.length>0&&<div>
    <h5 className="mb-2 text-xs font-semibold">Referências criativas</h5>
    <ul className="space-y-2">{creative.map(({url,note,hostname},index)=><li key={`${url}:${index}`} className={styles.material}>
     <h6>Referência {index+1} · {hostname}</h6>
     <a href={url} target="_blank" rel="noopener noreferrer"><RotevoTablerIcon name="link" size={15}/>Abrir referência ↗</a>
     {note&&<p className="whitespace-pre-wrap break-words text-xs">{note}</p>}
    </li>)}</ul>
   </div>}
  </div>
 </section>;
}

export function ContentDetailText({title,children}:{title:string;children:React.ReactNode}){
 return <section aria-label={title} className={styles.detailContent}>
  <h4 className="text-sm font-semibold">{title}</h4>
  <div className={styles.detailSurface}>{children}</div>
 </section>;
}
