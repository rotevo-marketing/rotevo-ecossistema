import {notFound} from "next/navigation";
import DynamicStrategicEditor from "@/Components/strategic-editor/DynamicStrategicEditor";
import {prototypeAllowed} from "@/lib/strategic-editor/prototype";
export const dynamic="force-dynamic";
export const metadata={title:"Editor Estratégico · Protótipo Rotevo V2",robots:{index:false,follow:false}};
export default function StrategicEditorPreviewPage(){
 if(!prototypeAllowed(process.env.VERCEL_ENV,process.env.ROTEVO_EDITOR_PREVIEW))notFound();
 return <DynamicStrategicEditor/>;
}
