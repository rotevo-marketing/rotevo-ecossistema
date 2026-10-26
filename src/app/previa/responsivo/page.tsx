import {notFound} from "next/navigation";
import {prototypeAllowed} from "@/lib/strategic-editor/prototype";
import ResponsiveReview from "@/Components/ui/ResponsiveReview";
export const dynamic="force-dynamic";
export const metadata={title:"Conferência responsiva · Rotevo",robots:{index:false,follow:false}};
export default function Page(){
 if(!prototypeAllowed(process.env.VERCEL_ENV,process.env.ROTEVO_EDITOR_PREVIEW))notFound();
 return <ResponsiveReview/>;
}
