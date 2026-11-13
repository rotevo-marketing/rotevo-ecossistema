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
export function TaskDropdown<T extends string>({label,value,options,onChange,disabled=false,kind="status",avatar}:{
 label:string;value:T;options:Option<T>[];onChange:(value:T)=>void;disabled?:boolean;kind?:"status"|"priority"|"people";avatar?:{name:string;src?:string|null};
}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:0,top:0,width:0});
 const anchor=useRef<HTMLButtonElement>(null);
 const selected=options.find(o=>o.value===value)??options[0];
 useEffect(()=>{if(!open)return;const close=()=>setOpen(false);window.addEventListener("scroll",close,true);window.addEventListener("resize",close);return()=>{window.removeEventListener("scroll",close,true);window.removeEventListener("resize",close);};},[open]);
 function toggle(){if(disabled)return;const r=anchor.current?.getBoundingClientRect();if(r){setPosition({left:Math.max(8,Math.min(r.left,window.innerWidth-224)),top:Math.min(r.bottom+5,window.innerHeight-270),width:r.width});setOpen(v=>!v);}}
 return <div className="min-w-0">
  <button ref={anchor} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={toggle}
   title={selected?.label??""}
   className={"group flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs font-semibold transition disabled:cursor-default disabled:opacity-60 "+(kind==="people"?"border border-[#E1E5EE] bg-white text-[#344056] hover:bg-[#F8F7FF]":"text-white hover:brightness-95")}
   style={kind==="people"?undefined:{backgroundColor:selected?.color??"#8994A7"}}>
   <span className="flex min-w-0 items-center gap-2">{kind==="people"&&avatar&&<TaskAvatar name={avatar.name} src={avatar.src} size={25}/>}
    {kind==="priority"&&<RotevoTablerIcon name="flag" size={14}/>}<span className="truncate">{selected?.label??"Selecionar"}</span></span>
   <RotevoTablerIcon name="chevron-down" size={14}/>
  </button>
  {open&&typeof document!=="undefined"&&createPortal(<>
   <button type="button" aria-label="Fechar opções" onClick={()=>setOpen(false)} className="fixed inset-0 z-[140] cursor-default"/>
   <div role="listbox" aria-label={label} className="fixed z-[141] max-h-64 w-[216px] overflow-y-auto rounded-xl border border-[#DDE2EC] bg-white p-1.5 shadow-xl"
    style={{left:position.left,top:Math.max(8,position.top),minWidth:Math.min(216,Math.max(position.width,160))}}>
    {options.map(opt=><button type="button" role="option" aria-selected={opt.value===value} key={opt.value} onClick={()=>{setOpen(false);if(opt.value!==value)onChange(opt.value);}}
     className={"flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-[#F4F0FF] "+(opt.value===value?"bg-[#F4F0FF] font-semibold":"")}>
     {kind==="people"?<TaskAvatar name={opt.label} src={opt.photo} size={22}/>:<span aria-hidden="true" className="h-3.5 w-3.5 rounded" style={{backgroundColor:opt.color??"#8793A5"}}/>}
     <span className="flex-1 truncate text-[#26314A]">{opt.label}</span>{opt.value===value&&<RotevoTablerIcon name="check" size={15}/>}
    </button>)}
   </div>
  </>,document.body)}
 </div>;
}
