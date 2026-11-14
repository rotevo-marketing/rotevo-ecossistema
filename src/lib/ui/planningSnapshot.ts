import type {RichContent} from "../planning/richContent.ts";
import {projectForPresentation} from "../security/projectForPresentation.ts";
type PublishedSnapshot={selectedDocumentCodes:string[];presentedDocumentCodes:string[];documents:Record<string,{content:string;richContent?:RichContent}>;executiveDocuments:Record<string,{content:string;richContent?:RichContent}>};
/** The administrative preview uses the same projection as the customer endpoint. */
export function planningSnapshot(data:unknown,status:string){
 const row=projectForPresentation({id:"preview",client_id:"preview",title:"",slug:"",description:null,status,data,clients:null},false);
 const projected=row?.data as {ecosystem2027?:PublishedSnapshot}|undefined;
 return projected?.ecosystem2027??null;
}
export function clientDocumentCode(code:string){return !code.startsWith("00.")&&code!=="01.01";}
