// Deliberately allowlisted response, never spread the original project JSON.
type RecordObject = Record<string, unknown>;
const object = (v: unknown): RecordObject | null => v && typeof v === "object" && !Array.isArray(v) ? v as RecordObject : null;
const str = (v: unknown) => typeof v === "string" ? v : undefined;
const https = (v: unknown) => { const s=str(v); if (!s) return undefined; try { return new URL(s).protocol === "https:" ? s : undefined; } catch { return undefined; } };
const strings = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const fields = (o: RecordObject, names: readonly string[]) => Object.fromEntries(
  names.filter(k => typeof o[k] === "string").map(k => [k,o[k]])
);
function publishedArray(v: unknown, names: readonly string[], allowLink=false) {
  if (!Array.isArray(v)) return [];
  return v.flatMap(value => {
    const item=object(value);
    if (!item || item.visibleToClient !== true || typeof item.id !== "string" || typeof item.title !== "string") return [];
    const projected: RecordObject = {...fields(item,names), id:item.id, title:item.title, visibleToClient:true};
    if (allowLink) { const link=https(item.driveUrl ?? item.link); if (link) projected.driveUrl=link; }
    return [projected];
  });
}
export type PrivateProjectRow = {id:string;client_id:string;title:string;slug:string;description:string|null;status:string;updated_at:string;data:unknown};
export function projectForClient(project:PrivateProjectRow) {
  const data=object(project.data) ?? {};
  const schedule=object(data.deliverySchedule);
  const deliverySchedule=Object.fromEntries(Object.entries(schedule??{})
    .filter(([key,value]) => /^[a-z0-9-]{1,80}$/.test(key) && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)));
  return {
    id:project.id,title:project.title,slug:project.slug,description:project.description,
    status:project.status,updated_at:project.updated_at,
    data:{
      coverImageUrl:https(data.coverImageUrl) ?? null,
      deliverySchedule,
      executionTimeline:publishedArray(data.executionTimeline,
        ["phase","status","kind","startDate","dueDate","description"],true),
      editorialCalendar:publishedArray(data.editorialCalendar,
        ["channel","format","publishDate","caption","version","status"],true),
      onboardingChecklist:publishedArray(data.onboardingChecklist,["done"],true)
        .map(item=>({...item,done:false})),
    }
  };
}
