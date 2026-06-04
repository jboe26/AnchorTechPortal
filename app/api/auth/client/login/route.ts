import { NextRequest } from "next/server";
import { loginClient } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await loginClient(email, password);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 401 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Client login error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
