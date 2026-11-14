"use client";
import {useEffect,useEffectEvent,useRef} from "react";
/** Keyboard behavior for existing drawers; native dialog components keep native focus. */
export default function DialogFocus({onClose}:{onClose:()=>void}){
 const anchor=useRef<HTMLSpanElement>(null);
 const close=useEffectEvent(onClose);
 useEffect(()=>{
  const root=anchor.current?.closest<HTMLElement>('[role="dialog"]');if(!root)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const elements=()=>Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  const initial=elements()[0];initial?.focus();
  function keyboard(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();return;}
   if(event.key!=="Tab")return;
   const nodes=elements(),first=nodes[0],last=nodes.at(-1);
   if(!first){event.preventDefault();return;}
   if(event.shiftKey&&(document.activeElement===first||!root!.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  root.addEventListener("keydown",keyboard);
  return()=>{root.removeEventListener("keydown",keyboard);if(previous?.isConnected)previous.focus();};
 },[]);
 return <span ref={anchor} hidden/>;
}
