import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";
import {taskPriorityFlag} from "@/lib/operations/taskPriority";
export default function TaskPriorityFlag({priority}:{priority:unknown}){
 const flag=taskPriorityFlag(priority);if(!flag)return null;
 return <span className="rv-ui3-priority-flag shrink-0" role="img" aria-label={"Prioridade "+flag.name} title={"Prioridade "+flag.name} style={{color:flag.color}}><RotevoTablerIcon name="flag" size={16} stroke={1.8}/></span>;
}
