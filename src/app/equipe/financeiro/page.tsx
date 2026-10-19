import {notFound} from "next/navigation";
import Link from "next/link";
import FinanceHub from "@/Components/finance/FinanceHub";
export const dynamic="force-dynamic";
export default function FinanceTeamPage(){if(process.env.VERCEL_ENV==="production")notFound();return <main className="min-h-screen bg-[#F6F7FB] p-5 sm:p-8"><div className="mx-auto max-w-7xl"><Link href="/equipe/meu-acesso" className="text-sm font-semibold text-[#6D35F5]">← Área da equipe</Link><h1 className="mt-5 text-2xl font-bold">Financeiro Rotevo</h1><FinanceHub/></div></main>;}
