// Official Tabler Icons, MIT license; local vector artwork (no runtime CDN).
import {contentBrandShapes} from "./content-icons/brandShapes";
import {contentActionShapes} from "./content-icons/actionShapes";
export type ContentIconName = "brand-instagram"|"brand-youtube"|"brand-facebook"|"brand-tiktok"|"brand-linkedin"|"brand-pinterest"|"brand-whatsapp"|"brand-telegram"|"brand-x"|"brand-threads"|"brand-bluesky"|"brand-snapchat"|"brand-twitch"|"brand-reddit"|"brand-spotify"|"brand-google"|"calendar-month"|"eye"|"link"|"external-link"|"circle-check"|"message-circle"|"clock"|"pencil"|"send"|"photo"|"video"|"layers-intersect"|"file-text"|"filter"|"search";
export function ContentTablerIcon({name,size=20,stroke=2,className=""}:{name:ContentIconName;size?:number;stroke?:number;className?:string}){
 return <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}>{contentBrandShapes[name]??contentActionShapes[name]}</svg>;
}
