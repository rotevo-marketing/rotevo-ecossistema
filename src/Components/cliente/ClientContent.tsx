"use client";
import {useEffect,useMemo} from "react";
import EditorialCalendar,{type EditorialProject} from "./EditorialCalendar";

export default function ClientContent({
  projects,focusContentId,onFocusHandled
}:{
  projects:EditorialProject[];
  focusContentId?:string|null;
  onFocusHandled?:()=>void;
}){
  const focusItem=useMemo(()=>{
    if(!focusContentId)return undefined;
    for(const project of projects){
      const item=(project.data?.editorialCalendar??[]).find(
        row=>row.id===focusContentId&&row.visibleToClient===true&&!row.archivedAt&&!row.deletedAt
      );
      if(item)return {
        projectId:project.id,contentId:item.id,channel:item.channel,
        publishDate:item.publishDate,nonce:1
      };
    }
    return undefined;
  },[projects,focusContentId]);
  useEffect(()=>{
    if(focusItem)onFocusHandled?.();
  },[focusItem,onFocusHandled]);
  return <EditorialCalendar projects={projects} clientView focusItem={focusItem}/>;
}
