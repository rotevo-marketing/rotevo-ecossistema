/** Keep project identity when a customer has several concurrent plans. */
export function planningHref(clientSlug:string,projectId?:string){
 const base=`/admin/planejamentos/${encodeURIComponent(clientSlug)}`;
 return projectId?`${base}?projectId=${encodeURIComponent(projectId)}`:base;
}
export function portalTarget<T extends {id:string}>(projects:T[],currentId:string,requestedId?:string){
 return projects.some(project=>project.id===requestedId)?requestedId!:projects.some(project=>project.id===currentId)?currentId:projects[0]?.id??"";
}
