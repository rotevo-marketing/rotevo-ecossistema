import {notFound} from "next/navigation";
import FinancePreview from "@/Components/finance/FinancePreview";
export const dynamic="force-dynamic";
export const metadata={title:"Financeiro · Prévia Rotevo V2",robots:{index:false,follow:false}};
export default function FinancePreviewPage(){
 if(process.env.ROTEVO_FINANCE_PREVIEW!=="true"||process.env.VERCEL_ENV==="production")notFound();
 return <FinancePreview/>;
}
