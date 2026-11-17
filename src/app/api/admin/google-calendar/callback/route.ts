import {NextRequest,NextResponse} from "next/server";
import {calendarConfig,oauthCookie,oauthResultCookie,open,seal} from "@/lib/googleCalendar/server";
export const runtime="nodejs";

export function GET(req:NextRequest){
 let config:ReturnType<typeof calendarConfig>;
 try{config=calendarConfig();}catch{return new NextResponse("Conexão indisponível.",{status:503});}
 const destination=new URL("/admin?section=meetings&googleCalendar=error",config.origin);
 const options={httpOnly:true,path:"/api/admin/google-calendar",sameSite:"lax" as const,secure:config.secure};
 let result="";
 try{
  const raw=req.cookies.get(oauthCookie)?.value;
  const code=req.nextUrl.searchParams.get("code");
  const state=req.nextUrl.searchParams.get("state");
  if(raw&&code&&code.length<=2048&&state&&!req.nextUrl.searchParams.has("error")){
   const attempt=JSON.parse(open(config.key,"oauth",raw)) as {userId:string;state:string;verifier:string;expires:number};
   if(attempt.state===state&&attempt.expires>=Date.now()){
    result=seal(config.key,"oauth-result",JSON.stringify({userId:attempt.userId,expires:attempt.expires,verifier:attempt.verifier,code}));
    destination.searchParams.set("googleCalendar","returned");
   }
  }
 }catch{/* Report a generic error without returning provider data. */}
 const reply=NextResponse.redirect(destination);
 reply.headers.set("Cache-Control","no-store");
 reply.headers.set("Referrer-Policy","no-referrer");
 reply.cookies.set(oauthCookie,"",{...options,maxAge:0});
 if(result)reply.cookies.set(oauthResultCookie,result,{...options,maxAge:600});
 return reply;
}
