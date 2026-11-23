import type {ExecutionItem} from "../../Components/cliente/ProjectTimeline";

export function taskPrerequisites(timeline: ExecutionItem[], currentId?: string) {
 const byId = new Map(timeline.filter(task => task?.id && task.title).map(task => [task.id, task]));
 return [...byId.values()].filter(task => {
  if (task.deletedAt || task.archivedAt || task.status === "cancelled" || task.id === currentId) return false;
  const visiting = new Set<string>();
  const checked = new Set<string>();
  function acyclic(id: string): boolean {
   if (id === currentId || visiting.has(id)) return false;
   if (checked.has(id)) return true;
   const node = byId.get(id);
   if (!node) return true;
   visiting.add(id);
   const valid = (node.dependencies ?? []).every(acyclic);
   visiting.delete(id);
   checked.add(id);
   return valid;
  }
  return acyclic(task.id);
 });
}
