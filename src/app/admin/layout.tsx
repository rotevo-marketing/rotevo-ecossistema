import AccountAppearanceBootstrap from "@/Components/operations/AccountAppearanceBootstrap";

export default function AdminLayout({children,modal}:{children:React.ReactNode;modal:React.ReactNode}) {
 return <>{process.env.NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED==="true"&&<AccountAppearanceBootstrap/>}{children}{modal}</>;
}
