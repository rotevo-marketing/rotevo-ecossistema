import {validVisualHtmlProps,visualPlainText,VISUAL_HTML_LIMIT,VISUAL_CSS_LIMIT} from "./visualHtml.ts";
export type RichContent={format:"blocknote-v1";blocks:unknown[]};
const types=new Set(["paragraph","heading","bulletListItem","numberedListItem","checkListItem","table","image","quote","strategic","indicator","strategicChart","visualHtml"]);
function link(value:string){if(/^asset:\/\/[0-9a-f-]{36}$/i.test(value))return true;try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}}
export function validRichContent(value:unknown):value is RichContent{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;const root=value as Record<string,unknown>;
 if(root.format!=="blocknote-v1"||!Array.isArray(root.blocks)||root.blocks.length>2000||JSON.stringify(value).length>1200000)return false;
 let nodes=0,blocks=0;const ids=new Set<string>();
 function visit(v:unknown,depth:number):boolean{
  if(++nodes>60000||depth>18)return false;
  if(v===null||typeof v==="boolean")return true;if(typeof v==="number")return Number.isFinite(v)&&Math.abs(v)<=1e12;
  if(typeof v==="string")return v.length<=200000;if(Array.isArray(v))return v.every(x=>visit(x,depth+1));
  if(!v||typeof v!=="object")return false;
  for(const [key,item] of Object.entries(v)){if(["__proto__","prototype","constructor","html","innerHTML","dangerouslySetInnerHTML"].includes(key)||/^on[A-Z]/.test(key))return false;if((key==="url"||key==="href")&&(typeof item!=="string"||item!==""&&!link(item)))return false;if(!visit(item,depth+1))return false;}
  return true;
 }
 function block(v:unknown,depth=0):boolean{
  if(depth>12)return false;
  if(!v||typeof v!=="object"||Array.isArray(v)||++blocks>2000)return false;const b=v as Record<string,unknown>;
  if(typeof b.id!=="string"||!/^[-_a-zA-Z0-9]{1,100}$/.test(b.id)||ids.has(b.id)||!types.has(String(b.type)))return false;ids.add(b.id);
  if(b.type==="visualHtml"&&(!validVisualHtmlProps(b.props)||b.content!==undefined||Array.isArray(b.children)&&b.children.length>0))return false;
  if(b.children!==undefined&&(!Array.isArray(b.children)||!b.children.every(child=>block(child,depth+1))))return false;
  return true;
 }
 return root.blocks.every(child=>block(child))&&visit(root.blocks,0);
}
export function richText(value:RichContent):string{
 const lines:string[]=[];
 function walk(v:unknown){if(!v||typeof v!=="object")return;if(Array.isArray(v)){for(const x of v)walk(x);return;}const obj=v as Record<string,unknown>;if(typeof obj.text==="string")lines.push(obj.text);if(obj.props&&typeof obj.props==="object"){const p=obj.props as Record<string,unknown>;for(const k of ["title","label","value","context","series","caption","description"])if(typeof p[k]==="string"&&p[k])lines.push(p[k]);if(obj.type==="visualHtml"&&typeof p.markup==="string")lines.push(visualPlainText(p.markup));}for(const k of ["content","children","rows","cells"])if(obj[k])walk(obj[k]);}
 walk(value.blocks);return lines.join("\n").slice(0,200000);
}
export function plainBlocks(content:string,title:string){return [{id:crypto.randomUUID(),type:"heading",props:{level:1},content:title},...content.split(/\n\n+/).filter(Boolean).map(text=>({id:crypto.randomUUID(),type:"paragraph",content:text}))];}
export function assetReferences(value:unknown):string[]{const ids=new Set<string>();function walk(v:unknown){if(typeof v==="string"&&/^asset:\/\/[0-9a-f-]{36}$/i.test(v))ids.add(v.slice(8));else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==="object")Object.values(v).forEach(walk);}walk(value);return [...ids];}
export function mapAssetLinks<T>(value:T,links:Record<string,string>,reverse=false):T{
 const mapping=reverse?Object.fromEntries(Object.entries(links).map(([id,url])=>[url,"asset://"+id])):Object.fromEntries(Object.entries(links).map(([id,url])=>["asset://"+id,url]));
 function walk(v:unknown):unknown{if(typeof v==="string")return mapping[v]??v;if(Array.isArray(v))return v.map(walk);if(v&&typeof v==="object")return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)]));return v;}
 return walk(value) as T;
}

// Return safe, actionable diagnostics without exposing document contents.
export function richContentError(value:unknown):string|null {
 if(!value||typeof value!=="object")return "O documento não contém uma estrutura de blocos válida.";
 const serialized=JSON.stringify(value);
 if(serialized.length>1200000)return "O documento excede o limite de 1.200.000 caracteres serializados.";
 if(hasNullCharacter(value))return "O documento contém um caractere nulo (U+0000), incompatível com o armazenamento. Remova esse caractere antes de salvar.";
 const root=value as Record<string,unknown>;
 if(Array.isArray(root.blocks)) {
  if(root.blocks.length>2000)return "O documento excede o limite de 2.000 blocos.";
  for(const block of root.blocks){
   if(!block||typeof block!=="object")continue;
   const b=block as Record<string,unknown>;
   if(b.type!=="visualHtml")continue;
   const p=b.props as Record<string,unknown>|undefined;
   if(typeof p?.markup==="string"&&p.markup.length>VISUAL_HTML_LIMIT)return "Um elemento HTML excede o limite de 80.000 caracteres. Divida-o em elementos menores.";
   if(typeof p?.stylesheet==="string"&&p.stylesheet.length>VISUAL_CSS_LIMIT)return "O CSS de um elemento excede o limite de 20.000 caracteres.";
   if(!validVisualHtmlProps(p))return "Confira o título, a descrição e a altura (160 a 2400 px) do elemento HTML.";
  }
 }
 return validRichContent(value)?null:"Documento inválido. Confira os tipos, os identificadores e a estrutura dos blocos e imagens.";
}

function hasNullCharacter(value:unknown):boolean {
 if(typeof value==="string")return value.includes("\0");
 if(Array.isArray(value))return value.some(hasNullCharacter);
 return !!value&&typeof value==="object"&&Object.entries(value).some(([key,item])=>key.includes("\0")||hasNullCharacter(item));
}
