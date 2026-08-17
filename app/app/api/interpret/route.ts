import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { interpret } from "@/lib/interpret";
import { aiInterpret } from "@/lib/aiInterpret";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = (body?.text || "").toString();
  if (!text.trim()) return NextResponse.json({ error: "Texto vazio." }, { status: 400 });

  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await aiInterpret(text);
      return NextResponse.json({ ...r, engine: "IA (Gemini)" });
    } catch (e: any) {
      const r = interpret(text);
      return NextResponse.json({ ...r, engine: "local (IA indisponível)", aiError: String(e?.message || e) });
    }
  }
  const r = interpret(text);
  return NextResponse.json({ ...r, engine: "local (sem chave de IA)" });
}
