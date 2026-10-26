"use client";
import {useEffect,useState} from "react";
import {useCreateBlockNote} from "@blocknote/react";
import {BlockNoteView} from "@blocknote/mantine";
import {pt} from "@blocknote/core/locales";
import {request} from "@/lib/operations/api";
import {assetReferences,mapAssetLinks,validRichContent,type RichContent} from "@/lib/planning/richContent";
import {strategicSchema,type StrategicPartial} from "./schema";
import "@blocknote/mantine/style.css";
import "./editor.css";
function Reader({content}:{content:RichContent}){const editor=useCreateBlockNote({schema:strategicSchema,initialContent:content.blocks as StrategicPartial[],dictionary:pt});return <div className="se-root se-document-reader"><div className="se-paper"><BlockNoteView editor={editor} editable={false} theme="light" formattingToolbar={false} slashMenu={false} sideMenu={false} filePanel={false} tableHandles={false}/></div></div>;}
export default function StrategicDocumentReader({content}:{content:RichContent}){
 const key=JSON.stringify(content);const [result,setResult]=useState<{key:string;content?:RichContent;error?:string}|null>(null);
 useEffect(()=>{let live=true;const refs=assetReferences(content);if(!refs.length)return;
 const load=()=>request<{links:Record<string,string>}>("/api/assets/resolve","POST",{ids:refs}).then(r=>{if(live)setResult({key,content:mapAssetLinks(content,r.links)});}).catch(()=>{if(live)setResult(previous=>previous?.key===key&&previous.content?previous:{key,error:"Não foi possível carregar as imagens autorizadas. Atualize a página."});});
 void load();const timer=setInterval(()=>void load(),25*60*1000);return()=>{live=false;clearInterval(timer)};
 },[key,content]);
 if(!validRichContent(content))return <p role="alert">Não foi possível apresentar este documento.</p>;
 if(assetReferences(content).length){if(result?.key!==key)return <p role="status">Carregando imagens autorizadas…</p>;if(result.error)return <p role="alert">{result.error}</p>;return <Reader key={key+JSON.stringify(result.content)} content={result.content!}/>;}
 return <Reader key={key} content={content}/>;
}
