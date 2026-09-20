import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { listLocations, addLocation, updateLocation, deleteLocation } from "@/lib/store";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ locations: await listLocations() });
}

export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const location = await addLocation({ name });
  return NextResponse.json({ location });
}

export async function PATCH(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const { id, ...patch } = body || {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const location = await updateLocation(id, patch);
    return NextResponse.json({ location });
  } catch {
    return NextResponse.json({ error: "Could not update location" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await deleteLocation(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete location" }, { status: 500 });
  }
}
