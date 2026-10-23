import {notFound} from "next/navigation";
import DynamicPlanningWorkspace from "@/Components/strategic-editor/DynamicPlanningWorkspace";
import {prototypeAllowed} from "@/lib/strategic-editor/prototype";
export const dynamic="force-dynamic";
export const metadata={title:"Planejamento · Prévia Rotevo",robots:{index:false,follow:false}};
export default function Page(){
 if(!prototypeAllowed(process.env.VERCEL_ENV,process.env.ROTEVO_EDITOR_PREVIEW))notFound();
 return <DynamicPlanningWorkspace/>;
}
