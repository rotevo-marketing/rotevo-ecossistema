import {notFound} from "next/navigation";
import CompanyAnalysisPreview from "./CompanyAnalysisPreview";
export const dynamic="force-dynamic";
export const metadata={title:"Homologação isolada | Análise da Empresa",robots:{index:false,follow:false}};
export default function Page(){
 if(process.env.ROTEVO_COMPANY_ANALYSIS_PREVIEW!=="true"||process.env.VERCEL_ENV==="production")notFound();
 return <CompanyAnalysisPreview/>;
}
