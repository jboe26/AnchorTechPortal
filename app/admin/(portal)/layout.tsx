import { requireAdmin } from "@/lib/auth";
import AdminSidebar from "./sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar adminName={session.name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
