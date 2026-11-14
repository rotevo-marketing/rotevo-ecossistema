import type {ContentIconName} from "@/Components/ContentTablerIcon";

export const editorialChannels:ReadonlyArray<{value:string;label:string;icon:ContentIconName}>=[
 {value:"Instagram",label:"Instagram",icon:"brand-instagram"},
 {value:"Facebook",label:"Facebook",icon:"brand-facebook"},
 {value:"LinkedIn",label:"LinkedIn",icon:"brand-linkedin"},
 {value:"YouTube",label:"YouTube",icon:"brand-youtube"},
 {value:"TikTok",label:"TikTok",icon:"brand-tiktok"},
 {value:"Pinterest",label:"Pinterest",icon:"brand-pinterest"},
 {value:"Threads",label:"Threads",icon:"brand-threads"},
 {value:"X",label:"X (Twitter)",icon:"brand-x"},
 {value:"WhatsApp",label:"WhatsApp",icon:"brand-whatsapp"},
 {value:"Telegram",label:"Telegram",icon:"brand-telegram"},
 {value:"Bluesky",label:"Bluesky",icon:"brand-bluesky"},
 {value:"Snapchat",label:"Snapchat",icon:"brand-snapchat"},
 {value:"Twitch",label:"Twitch",icon:"brand-twitch"},
 {value:"Reddit",label:"Reddit",icon:"brand-reddit"},
 {value:"Spotify",label:"Spotify",icon:"brand-spotify"},
 {value:"Site/Blog",label:"Site ou blog",icon:"link"},
 {value:"E-mail",label:"E-mail",icon:"link"},
];
export function editorialChannelIcon(value:string):ContentIconName{
 return editorialChannels.find(channel=>channel.value.toLocaleLowerCase("pt-BR")===value.trim().toLocaleLowerCase("pt-BR"))?.icon??"link";
}
