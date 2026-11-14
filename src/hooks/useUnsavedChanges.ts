"use client";
import {useEffect} from "react";
const drafts=new Set<symbol>();
export function confirmDiscardChanges(){return drafts.size===0||window.confirm("Há alterações não salvas. Sair desta página e descartá-las?");}
function warn(event:BeforeUnloadEvent){event.preventDefault();event.returnValue="";}
function follow(event:MouseEvent){
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const anchor=event.target instanceof Element?event.target.closest("a"):null;
 if(!anchor||anchor.hasAttribute("download")||(anchor.target&&anchor.target!=="_self"))return;
 const next=new URL(anchor.href,window.location.href);
 if(next.pathname===window.location.pathname&&next.search===window.location.search)return;
 if(!window.confirm("Há alterações não salvas. Sair desta página e descartá-las?")){event.preventDefault();event.stopPropagation();}
}
/** One shared guard for all mounted panels, without storing customer content. */
export function useUnsavedChanges(dirty:boolean){
 useEffect(()=>{
  if(!dirty)return;
  const id=Symbol();drafts.add(id);
  if(drafts.size===1){window.addEventListener("beforeunload",warn);document.addEventListener("click",follow,true);}
  return()=>{drafts.delete(id);if(!drafts.size){window.removeEventListener("beforeunload",warn);document.removeEventListener("click",follow,true);}};
 },[dirty]);
}
