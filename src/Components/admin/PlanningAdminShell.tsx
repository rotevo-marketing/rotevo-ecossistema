"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {RotevoLogo} from "@/Components/RotevoLogo";
import {RotevoTablerIcon,type RotevoIconName} from "@/Components/RotevoTablerIcon";
import AdminUserMenu from "./AdminUserMenu";
import {supabase} from "@/lib/supabase";
import "@/Components/strategic-editor/workspace-preview.css";
const items:{id:string;label:string;icon:RotevoIconName}[]=[{id:"overview",label:"Visão geral",icon:"layout-dashboard"},{id:"clients",label:"Clientes",icon:"users"},{id:"projects",label:"Projetos",icon:"report"},{id:"onboarding",label:"Onboarding",icon:"lifebuoy"},{id:"tasks",label:"Tarefas",icon:"list-check"},{id:"meetings",label:"Reuniões",icon:"calendar"},{id:"content",label:"Conteúdo",icon:"brand-instagram"},{id:"campaigns",label:"Campanhas",icon:"rocket"},{id:"team",label:"Equipe",icon:"users-group"},{id:"finance",label:"Financeiro",icon:"currency-dollar"}];
export default function PlanningAdminShell({children}:{children:React.ReactNode}){
 const [compact,setCompact]=useState(true),[mobile,setMobile]=useState(false),[email,setEmail]=useState("");
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setEmail(data.user?.email??"");});return()=>{active=false};},[]);
 return <div className={`pw-app workspace-production ${compact?"is-compact":""} ${mobile?"workspace-mobile-nav":""}`}><header className="pw-topbar"><div><button className="workspace-mobile-menu" aria-label="Abrir menu do estrategista" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}>☰</button><Link href="/admin"><RotevoLogo variant="white" size={27}/></Link><span className="pw-panel-name">Painel do Estrategista</span></div><AdminUserMenu email={email} name="" onLogout={async()=>{await supabase.auth.signOut();window.localStorage.removeItem("metodo-epc-strategist-auth");window.location.assign("/estrategista/login");}}/></header><div className="pw-app-body"><aside className="pw-global-nav"><div className="pw-global-caption">ESPAÇO DE TRABALHO</div><nav aria-label="Menu do estrategista">{items.map(item=><Link key={item.id} href={`/admin?section=${item.id}`} title={item.label} aria-label={item.label} aria-current={item.id==="projects"?"page":undefined}><RotevoTablerIcon name={item.icon} size={21}/><span>{item.label}</span></Link>)}</nav><button className="pw-collapse" aria-label={compact?"Expandir menu do estrategista":"Recolher menu do estrategista"} onClick={()=>setCompact(!compact)}>{compact?"›":"‹"}<span>Recolher menu</span></button></aside><div className="pw-main">{children}</div></div></div>;
}
