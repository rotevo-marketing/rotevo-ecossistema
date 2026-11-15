"use client";

import {useRouter} from "next/navigation";
import NovoPlanejamentoDialog from "@/Components/admin/NovoPlanejamentoDialog";

export default function NovoPlanejamentoModal(){
 const router=useRouter();
 return <NovoPlanejamentoDialog onClose={()=>router.back()}/>;
}
