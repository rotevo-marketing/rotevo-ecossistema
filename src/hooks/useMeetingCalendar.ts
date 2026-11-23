"use client";
import {useState} from "react";
import {todayInBrazil} from "@/lib/finance/model";

export function useMeetingCalendar(){
 const [selectedDay,selectDay]=useState(todayInBrazil);
 const month=selectedDay.slice(0,7);
 const [year,monthNumber]=month.split("-").map(Number);
 const first=new Date(Date.UTC(year,monthNumber-1,1));
 const offset=first.getUTCDay();
 const days=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
 const monthTitle=new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC",month:"long",year:"numeric"}).format(first);
 function shiftMonth(direction:number){
  selectDay(previous=>{
   const [year,month]=previous.split("-").map(Number);
   const next=new Date(Date.UTC(year,month-1+direction,1)).toISOString().slice(0,10);
   const today=todayInBrazil();
   return today.startsWith(next.slice(0,7))?today:next;
  });
 }
 return {month,monthTitle,offset,days,selectedDay,selectDay,shiftMonth,goToToday:()=>selectDay(todayInBrazil())};
}
