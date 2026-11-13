"use client";
import dynamic from "next/dynamic";
const Workspace=dynamic(()=>import("./PlanningWorkspacePreview"),{ssr:false,loading:()=> <p role="status" className="p-10">Preparando seu ambiente de planejamento…</p>});
export default function DynamicPlanningWorkspace(){return <Workspace/>;}
