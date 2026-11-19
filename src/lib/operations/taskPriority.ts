/** Existing strategist flag palette. Undefined/unknown is not an implicit Normal priority. */
export const taskPriorityFlags={
 urgent:{name:"Urgente",color:"#DA3553"},
 high:{name:"Alta",color:"#E39429"},
 normal:{name:"Normal",color:"#497BD5"},
 low:{name:"Baixa",color:"#8591A3"},
} as const;
export type TaskPriority=keyof typeof taskPriorityFlags;
export function taskPriorityFlag(value:unknown){
 return typeof value==="string"&&Object.hasOwn(taskPriorityFlags,value)?taskPriorityFlags[value as TaskPriority]:null;
}
