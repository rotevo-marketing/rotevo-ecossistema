"use client";
import {useEffect,useRef} from "react";
/** One in-flight read per panel; focus bursts coalesce and hidden tabs do not poll. */
export function usePortalRefresh(refresh:()=>void|Promise<void>,enabled=true,interval=30000){
 const latest=useRef(refresh);useEffect(()=>{latest.current=refresh;},[refresh]);
 useEffect(()=>{
  if(!enabled)return;
  let alive=true,busy=false,queued=false,last=0;
  const run=async()=>{
   if(!alive||document.visibilityState==="hidden")return;
   if(busy){queued=true;return;}
   if(Date.now()-last<1000)return;
   busy=true;last=Date.now();
   try{await latest.current();}finally{busy=false;if(queued&&alive){queued=false;last=0;void run();}}
  };
  const changed=(event:Event)=>{if(event.type==="rotevo:operational-change")last=0;void run();};
  const timer=window.setInterval(()=>void run(),interval);
  window.addEventListener("focus",changed);document.addEventListener("visibilitychange",changed);window.addEventListener("rotevo:operational-change",changed);
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener("focus",changed);document.removeEventListener("visibilitychange",changed);window.removeEventListener("rotevo:operational-change",changed);};
 },[enabled,interval]);
}
export function announceOperationalChange(){if(typeof window!=="undefined")window.dispatchEvent(new Event("rotevo:operational-change"));}
