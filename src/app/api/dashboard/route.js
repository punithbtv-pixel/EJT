import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { permsFor } from "@/lib/roles";
import { getDashboardData, findUserByUsername } from "@/lib/store";
import { isUiOnlyMode } from "@/lib/mode";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = isUiOnlyMode() ? { name: auth.session.name, dept: "Admin" } : await findUserByUsername(auth.session.username);
  const scope = permsFor(auth.session.role).scope;
  const data = await getDashboardData({ scope, userDept: user.dept, userName: user.name });
  return NextResponse.json(data);
}
