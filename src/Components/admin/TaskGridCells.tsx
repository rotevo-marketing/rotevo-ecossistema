"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

export function TaskAvatar({name,src,size=30}:{name:string;src?:string|null;size?:number}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x.slice(0,1)).join("").toUpperCase()||"?";
 const safe=src&&/^https:\/\//i.test(src)&&!failed;
 return <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE8FF] text-[10px] font-bold text-[#6034B7]" style={{width:size,height:size}}>
  {safe?<img src={src!} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="h-full w-full object-cover"/>:initials}
 </span>;
}
type Option<T extends string>={value:T;label:string;color?:string;photo?:string|null};
export function TaskDropdown<T extends string>({label,value,options,onChange,disabled=false,kind="status",avatar,presentation="cell"}:{
 label:string;value:T;options:Option<T>[];onChange:(value:T)=>void;disabled?:boolean;kind?:"status"|"priority"|"people";avatar?:{name:string;src?:string|null};presentation?:"cell"|"detail"|"board";
}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:0,top:0,width:0});
 const anchor=useRef<HTMLButtonElement>(null);
 const isColorCell=kind!=="people";
 const isDetail=presentation==="detail";
 const isBoard=presentation==="board";
 const selected=options.find(o=>o.value===value)??options[0];
 useEffect(()=>{if(!open)return;const close=()=>setOpen(false);window.addEventListener("scroll",close,true);window.addEventListener("resize",close);return()=>{window.removeEventListener("scroll",close,true);window.removeEventListener("resize",close);};},[open]);
 function toggle(){if(disabled)return;const r=anchor.current?.getBoundingClientRect();if(r){setPosition({left:Math.max(8,Math.min(r.left,window.innerWidth-224)),top:Math.min(r.bottom+5,window.innerHeight-270),width:r.width});setOpen(v=>!v);}}
 return <div className="min-w-0">
  <button ref={anchor} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={toggle}
   title={selected?.label??""}
   className={"group flex w-full cursor-pointer items-center text-xs font-semibold transition focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#3B2C72] disabled:cursor-default disabled:opacity-60 "+(isBoard?"min-h-8 justify-between gap-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[#525B70] hover:border-[#E4E8F0] hover:bg-white":isDetail?"min-h-10 justify-between gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-[#323647] hover:border-[#E1E5EE] hover:bg-[#F7F8FB]":kind==="people"?"min-h-9 justify-center rounded-md bg-transparent px-1 py-1 text-[#344056] hover:bg-[#F8F7FF]":"min-h-9 justify-between gap-2 rounded-none px-3 py-2 text-white hover:brightness-95")}
   style={kind==="people"||isDetail||isBoard?undefined:{backgroundColor:selected?.color??"#8994A7"}}>
   <span className="flex min-w-0 items-center justify-center gap-2">{kind==="people"?<><TaskAvatar name={avatar?.name??selected?.label??"Não atribuído"} src={avatar?.src} size={26}/>{isDetail&&<span className="truncate font-medium">{selected?.label??"Não atribuído"}</span>}</>:<>{kind==="priority"&&<span style={{color:selected?.color??"#8994A7"}}><RotevoTablerIcon name="flag" size={isBoard||isDetail?15:13} stroke={1.75}/></span>}{kind==="status"&&(isDetail||isBoard)&&<span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:selected?.color??"#8994A7"}}/>}<span className="truncate">{selected?.label??"Selecionar"}</span></>}</span>
   {(isDetail||isColorCell)&&<span className={isDetail||isBoard?"text-[#788398] opacity-70 transition-opacity group-hover:opacity-100":"opacity-0 transition-opacity group-hover:opacity-90 group-focus-visible:opacity-90"}><RotevoTablerIcon name="chevron-down" size={14}/></span>}
  </button>
  {open&&typeof document!=="undefined"&&createPortal(<>
   <button type="button" aria-label="Fechar opções" onClick={()=>setOpen(false)} className="fixed inset-0 z-[140] cursor-default"/>
   <div role="listbox" aria-label={label} className="fixed z-[141] max-h-64 w-[216px] overflow-y-auto rounded-xl border border-[#DDE2EC] bg-white p-1.5 shadow-xl"
    style={{left:position.left,top:Math.max(8,position.top),minWidth:Math.min(216,Math.max(position.width,160))}}>
    {options.map(opt=><button type="button" role="option" aria-selected={opt.value===value} key={opt.value} onClick={()=>{setOpen(false);if(opt.value!==value)onChange(opt.value);}}
     className={"flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs focus-visible:outline-2 focus-visible:outline-[#6C5CE7] "+(kind==="people"?"hover:bg-[#F4F0FF] ":"hover:bg-[#F6F7FA] ")+(opt.value===value?"bg-[#F4F0FF] font-semibold":"")}>
     {kind==="people"?<><TaskAvatar name={opt.label} src={opt.photo} size={22}/><span className="flex-1 truncate text-[#26314A]">{opt.label}</span></>:<><span className="flex h-5 w-5 shrink-0 items-center justify-center" style={{color:opt.color??"#8793A5"}}>{kind==="priority"?<RotevoTablerIcon name="flag" size={17} stroke={1.8}/>:<span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:"currentColor"}}/>}</span><span className="flex-1 truncate font-medium text-[#323647]">{opt.label}</span>{opt.value===value&&<span className="text-[#6D35F5]"><RotevoTablerIcon name="check" size={15}/></span>}</>}{kind==="people"&&opt.value===value&&<RotevoTablerIcon name="check" size={15}/>}
    </button>)}
   </div>
  </>,document.body)}
 </div>;
}

/** Inline due-date editor: local draft until confirmed, uses existing authorized task update callback. */
export function TaskDueDateCell({label,value,onChange,disabled=false,overdue=false}:{label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;overdue?:boolean}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value);
 const [position,setPosition]=useState({left:8,top:8});
 const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)setDraft(value);},[value,open]);
 useEffect(()=>{if(!open)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}};const onScroll=()=>setOpen(false);document.addEventListener("keydown",onKey);window.addEventListener("resize",onScroll);window.addEventListener("scroll",onScroll,true);return()=>{document.removeEventListener("keydown",onKey);window.removeEventListener("resize",onScroll);window.removeEventListener("scroll",onScroll,true);};},[open]);
 const display=(date:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return "Definir data";const [y,m,d]=date.split("-").map(Number);const parsed=new Date(y,m-1,d);return Number.isNaN(parsed.getTime())?"Definir data":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(parsed).replace(".","");};
 function toggle(){if(disabled)return;if(open){setOpen(false);return;}const rect=trigger.current?.getBoundingClientRect();if(rect)setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-280)),top:Math.max(8,Math.min(rect.bottom+4,window.innerHeight-255))});setDraft(value);setOpen(true);}
 function save(next:string){if(next&&!/^\d{4}-\d{2}-\d{2}$/.test(next))return;setOpen(false);if(next!==value)onChange(next);trigger.current?.focus();}
 return <div className="min-w-0">
  <button ref={trigger} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={toggle} title={value?display(value):"Definir prazo"} className={"flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 px-2 text-xs transition hover:bg-[#F2F6FC] focus-visible:outline-2 focus-visible:outline-[#6C5CE7] disabled:cursor-default disabled:opacity-60 "+(overdue?"font-semibold text-[#C2384C]":"text-[#525B70]")}>
   {overdue&&<RotevoTablerIcon name="alert-circle" size={15}/>}<span className="whitespace-nowrap">{display(value)}</span>{!value&&<RotevoTablerIcon name="calendar-week" size={14}/>}
  </button>
  {open&&typeof document!=="undefined"&&createPortal(<>
   <button type="button" aria-label="Fechar calendário" className="fixed inset-0 z-[140] cursor-default" onClick={()=>{setOpen(false);trigger.current?.focus();}}/>
   <div role="dialog" aria-label={`Editar prazo: ${label}`} className="fixed z-[141] w-[270px] rounded-lg border border-[#DCE2EC] bg-white p-3 shadow-2xl" style={position}>
    <p className="mb-2 text-xs font-semibold text-[#323647]">Definir prazo</p>
    <label className="block text-[11px] text-[#697386]">Data da tarefa<input autoFocus type="date" value={draft} onChange={e=>setDraft(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-[#CDD6E6] bg-white px-2 text-sm text-[#323647] outline-none focus:border-[#6C5CE7]"/></label>
    <div className="mt-3 flex items-center justify-between gap-2"><button type="button" onClick={()=>save("")} className="cursor-pointer rounded-md px-2 py-2 text-xs text-[#697386] hover:bg-[#F6F7FB]">Limpar data</button><button type="button" onClick={()=>save(draft)} className="cursor-pointer rounded-md bg-[#6C5CE7] px-3 py-2 text-xs font-semibold text-white">Aplicar</button></div>
   </div>
  </>,document.body)}
 </div>;
}
