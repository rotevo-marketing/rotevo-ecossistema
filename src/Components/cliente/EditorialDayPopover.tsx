"use client";
import {useEffect,useId,useRef} from "react";
import {ContentTablerIcon} from "@/Components/ContentTablerIcon";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {editorialChannelIcon} from "@/lib/editorial/channels";
import styles from "./EditorialDayPopover.module.css";

type Row={projectId:string;id:string;title:string;channel:string;format:string};

export default function EditorialDayPopover({date,items,hiddenCount,onSelect}:{
 date:string;items:Row[];hiddenCount:number;onSelect:(key:string)=>void;
}){
 const id=useId();
 const trigger=useRef<HTMLButtonElement>(null);
 const panel=useRef<HTMLElement>(null);
 const dismiss=useRef<HTMLButtonElement>(null);

 useEffect(()=>{
  const popup=panel.current;
  const anchor=trigger.current;
  if(!popup||!anchor)return;
  const position=()=>{
   const cell=(anchor.parentElement??anchor).getBoundingClientRect();
   const {clientWidth:width,clientHeight:height}=document.documentElement;
   const gap=8;
   const left=Math.max(gap,Math.min(cell.left,width-popup.offsetWidth-gap));
   const below=cell.bottom+gap;
   const above=cell.top-popup.offsetHeight-gap;
   const top=below+popup.offsetHeight<=height-gap||above<gap?below:above;
   popup.style.left=left+"px";
   popup.style.top=Math.max(gap,Math.min(top,height-popup.offsetHeight-gap))+"px";
  };
  const unlisten=()=>{
   window.removeEventListener("resize",position);
   window.removeEventListener("scroll",position,true);
  };
  const toggle=()=>{
   unlisten();
   if(!popup.matches(":popover-open"))return;
   position();
   window.addEventListener("resize",position);
   window.addEventListener("scroll",position,true);
   dismiss.current?.focus({preventScroll:true});
  };
  popup.addEventListener("toggle",toggle);
  return()=>{popup.removeEventListener("toggle",toggle);unlisten();};
 },[]);

 const close=()=>{
  panel.current?.hidePopover();
  trigger.current?.focus({preventScroll:true});
 };

 return <>
  <button ref={trigger} type="button" popoverTarget={id} aria-controls={id}
   aria-label={`Ver os ${items.length} conteúdos de ${date}`}
   onClick={event=>event.stopPropagation()} className={styles.trigger}>
   +{hiddenCount} · Ver todos
  </button>
  <section ref={panel} id={id} popover="auto" aria-labelledby={id+"-title"} className={styles.panel}>
   <header className={styles.header}>
    <div><h4 id={id+"-title"}>Conteúdos de {date}</h4><p>{items.length} conteúdos</p></div>
    <button ref={dismiss} type="button" aria-label="Fechar conteúdos do dia" onClick={close}><RotevoTablerIcon name="x" size={17}/></button>
   </header>
   <ul className={styles.items}>
    {items.map(item=>{
     const key=item.projectId+":"+item.id;
     return <li key={key}><button type="button" onClick={()=>{close();onSelect(key);}}>
      <strong>{item.title}</strong>
      <span><ContentTablerIcon name={editorialChannelIcon(item.channel)} size={14}/>{item.channel} · {item.format}</span>
     </button></li>;
    })}
   </ul>
  </section>
 </>;
}
