"use client";
import Link from "next/link";
import {RotevoLogo} from "@/Components/RotevoLogo";
export default function ApplicationError({retry}:{error:unknown;retry:()=>void}){
 return <main className="grid min-h-[80svh] place-items-center px-5 py-12"><section className="w-full max-w-lg rounded-2xl border border-[#E3E7F0] bg-white p-7 shadow-sm"><RotevoLogo size={28}/><p className="rv-page-kicker mt-8">Não foi possível abrir esta tela</p><h1 className="text-2xl font-bold">Vamos tentar novamente?</h1><p className="mt-4 text-sm leading-7 text-[#525B70]">Ocorreu uma falha ao carregar o ambiente. Se você estava editando, confira a última versão salva antes de continuar.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={retry} className="rounded-xl bg-[#6D35F5] px-5 py-3 text-sm font-semibold text-white">Tentar novamente</button><Link href="/" className="rounded-xl border border-[#E3E7F0] px-5 py-3 text-sm font-semibold">Voltar ao acesso</Link></div></section></main>;
}
