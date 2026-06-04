import { NextRequest } from "next/server";
import { loginAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await loginAdmin(email, password);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 401 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Admin login error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
