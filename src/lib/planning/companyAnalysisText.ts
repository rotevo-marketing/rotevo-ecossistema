import DOMPurify from "isomorphic-dompurify";
const tags=["p","br","strong","b","em","i","u","s","ul","ol","li","a"];
export function safeCompanyRichText(value:string):string{
 return DOMPurify.sanitize(value,{ALLOWED_TAGS:tags,ALLOWED_ATTR:["href","rel"],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,FORBID_TAGS:["script","style","iframe","object","svg","math","form","input","img"],ADD_ATTR:[],RETURN_TRUSTED_TYPE:false});
}
export function companyText(value:string):string{
 return DOMPurify.sanitize(value,{ALLOWED_TAGS:[],ALLOWED_ATTR:[]}).replace(/&nbsp;|&#160;|&#x0*a0;/gi," ").trim();
}
export function plainCompanyRichText(value:string):string{
 return value?value.split(/\r?\n/).map(line=>"<p>"+line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")+"</p>").join(""):"";
}
