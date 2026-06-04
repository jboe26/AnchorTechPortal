import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  const [
    { count: totalClients },
    { count: activeProjects },
    { count: totalInvoices },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase.from("Client").select("*", { count: "exact", head: true }),
    supabase.from("Project").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("Invoice").select("*", { count: "exact", head: true }),
    supabase.from("Invoice").select("amount").in("status", ["unpaid", "overdue"]),
  ]);

  const unpaidAmount = (unpaidInvoices ?? []).reduce((sum: number, inv: any) => sum + inv.amount, 0);

  return Response.json({ totalClients, activeProjects, totalInvoices, unpaidAmount });
}
