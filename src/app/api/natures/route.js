import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { listNatures, addNature, updateNature } from "@/lib/store";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ natures: await listNatures() });
}

export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const nature = await addNature({ name });
  return NextResponse.json({ nature });
}

export async function PATCH(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const { id, ...patch } = body || {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const nature = await updateNature(id, patch);
    return NextResponse.json({ nature });
  } catch {
    return NextResponse.json({ error: "Could not update nature" }, { status: 500 });
  }
}
