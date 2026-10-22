import {failure,identity,response} from "@/lib/operations/server";
import {emptyWorkspace,workspaceForClient} from "@/lib/operations/model";
export const runtime="nodejs";
export async function GET(request:Request){const a=await identity(request);if(a.error)return a.error;const p=a.identity.profile;if(p.role!=="client"||!p.client_id)return failure(403);const [client,r]=await Promise.all([a.identity.db.from("clients").select("cover_image_url").eq("id",p.client_id).maybeSingle(),a.identity.db.from("client_workspaces").select("data").eq("client_id",p.client_id).maybeSingle()]);return r.error||client.error?failure(503):response({workspace:workspaceForClient(r.data?.data??emptyWorkspace()),clientAvatarRef:client.data?.cover_image_url??""});}
