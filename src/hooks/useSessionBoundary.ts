"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
type Role="strategist"|"client";
export function useSessionBoundary(userId:string|null,role:Role,redirect:string){
 const router=useRouter();
 const [blocked,setBlocked]=useState(false);
 useEffect(()=>{
  if(!userId)return;
  let active=true,revoked=false;
  const deny=()=>{if(!active||revoked)return;revoked=true;setBlocked(true);router.replace(redirect);};
  const check=async()=>{
   if(!active||revoked)return;
   try{
    const {data,error}=await supabase.auth.getUser();
    if(!active||revoked)return;
    if(error||data.user?.id!==userId){deny();return;}
    const profile=await supabase.from("profiles").select("role").eq("id",userId).single();
    if(!active||revoked)return;
    if(profile.error||profile.data?.role!==role){deny();return;}
    const current=await supabase.auth.getSession();
    if(!active||revoked)return;
    if(current.error||current.data.session?.user.id!==userId)deny();
   }catch{deny();}
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT"||(session?.user&&session.user.id!==userId))deny();
   else if(event==="SIGNED_IN"||event==="USER_UPDATED")void Promise.resolve().then(check);
  });
  const focus=()=>{void check();};
  const visible=()=>{if(document.visibilityState==="visible")void check();};
  window.addEventListener("focus",focus);
  document.addEventListener("visibilitychange",visible);
  void check();
  return()=>{active=false;subscription.unsubscribe();window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",visible);};
 },[userId,role,redirect,router]);
 return blocked;
}
