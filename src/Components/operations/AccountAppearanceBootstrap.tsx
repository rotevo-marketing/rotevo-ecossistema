"use client";
import {useEffect} from "react";
import {supabase} from "@/lib/supabase";
import {request} from "@/lib/operations/api";

type Appearance="light"|"dark"|"system";
const allowed=(v:unknown):v is Appearance=>v==="light"||v==="dark"||v==="system";
/**
 * Persistent appearance owner for the authenticated shell.
 * No localStorage and no changes outside the gated UI3 shells.
 */
export default function AccountAppearanceBootstrap(){
 useEffect(()=>{
  let live=true,userId="",current:Appearance="system",seq=0;
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  const apply=()=>{if(live&&userId){
   document.documentElement.dataset.rotevoAppearance=current==="system"?(media.matches?"dark":"light"):current;
  }};
  const clear=()=>{userId="";current="system";seq++;document.documentElement.removeAttribute("data-rotevo-appearance");};
  const load=async()=>{
   const revision=++seq;
   const {data,error}=await supabase.auth.getUser();
   if(!live||revision!==seq)return;
   if(error||!data.user){clear();return;}
   const id=data.user.id;userId=id;
   try{
    const q=new URLSearchParams({expectedAuthorUserId:id});
    const result=await request<{appearance:Appearance}>("/api/account/appearance?"+q.toString());
    if(!live||revision!==seq||userId!==id)return;
    current=allowed(result.appearance)?result.appearance:"system";apply();
   }catch{if(live&&revision===seq){clear();}}
  };
  const mediaChange=()=>apply();
  media.addEventListener("change",mediaChange);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||!session?.user){clear();}
   else if(userId!==session.user.id){clear();void load();}
  });
  const onPreference=(event:Event)=>{
   const detail=(event as CustomEvent<{userId:string;appearance:Appearance}>).detail;
   if(detail?.userId===userId&&allowed(detail.appearance)){current=detail.appearance;apply();}
  };
  window.addEventListener("rotevo-appearance-updated",onPreference);
  void load();
  return()=>{live=false;clear();media.removeEventListener("change",mediaChange);
   window.removeEventListener("rotevo-appearance-updated",onPreference);subscription.unsubscribe();};
 },[]);
 return null;
}
