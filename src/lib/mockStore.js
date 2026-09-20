// In-memory data store used when UI_ONLY=true. Lives for the lifetime of the
// server process (a warm serverless instance, or `next dev`/`next start`) —
// writes are not persisted across restarts, exactly like the sibling
// PowerHouse MIS project's own UI-only mode.
import { DEPARTMENTS, LOCATIONS, NATURES, USERS, NT_SEED, WO_SEED, engineerOf } from "@/lib/seedData";
import { hashPassword } from "@/lib/session";

let DB = null;
let building = null;

function addMinutesStr(dateStr, timeStr, minutes) {
  const d = new Date(`${dateStr}T${timeStr || "00:00"}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16).replace("T", " ");
}
function splitDT(s) {
  if (!s) return [null, null];
  const [d, t] = s.split(" ");
  return [d, t];
}

async function build() {
  const users = USERS.map((u, i) => ({ id: i + 1, ...u, passwordHash: null }));
  for (const u of users) u.passwordHash = await hashPassword(process.env.EJT_SEED_PASSWORD || "Ejt@2026");
  const userByName = Object.fromEntries(users.map((u) => [u.name, u]));

  const notifications = NT_SEED.map((r, i) => {
    const [no, date, time, raisedBy, dept, location, job, description, nature, priority, status, wo] = r;
    const eng = engineerOf(dept);
    const history = [{ at: `${date} ${time}`, who: raisedBy, text: "Notification created and raised to engineering." }];
    if (status !== "Raised") history.push({ at: addMinutesStr(date, time, 33), who: eng, text: "Notification reviewed by engineering." });
    if (status === "Rejected") history.push({ at: addMinutesStr(date, time, 41), who: eng, text: "Notification rejected — handled outside engineering." });
    if (wo) history.push({ at: addMinutesStr(date, time, 48), who: eng, text: `Converted to work order ${wo}.` });
    return {
      id: i + 1, no, date, time, dept, location, job, description, nature, priority, status,
      raisedById: userByName[raisedBy]?.id ?? null, raisedByName: raisedBy,
      workOrderNo: wo || null, attachments: [], history,
    };
  });
  const notifByNo = Object.fromEntries(notifications.map((n) => [n.no, n]));

  const workOrders = WO_SEED.map((r, i) => {
    const [no, notifNo, dept, assignedTo, plannedStart, plannedEnd, actualStart, actualEnd, status, workDone, spares, remarks, completedBy] = r;
    const src = notifByNo[notifNo];
    const [cd, ct] = splitDT(addMinutesStr(src.date, src.time, 48));
    const created = `${cd} ${ct}`;
    const eng = engineerOf(src.dept);
    const history = [{ at: created, who: eng, text: `Work order created from notification ${notifNo}.` }];
    if (assignedTo) history.push({ at: created, who: eng, text: `Assigned to ${assignedTo}.` });
    if (actualStart) history.push({ at: actualStart, who: assignedTo, text: "Work started on site." });
    if (actualEnd) history.push({ at: actualEnd, who: completedBy || assignedTo, text: "Work completed and reported." });
    if (status === "Closed") history.push({ at: actualEnd || created, who: eng, text: "Work order verified and closed." });
    if (status === "Cancelled") history.push({ at: created, who: eng, text: "Work order cancelled." });
    return {
      id: i + 1, no, notificationId: src.id, notificationNo: notifNo,
      dept, location: src.location, job: src.job, description: src.description, nature: src.nature, priority: src.priority,
      assignedToId: userByName[assignedTo]?.id ?? null, assignedToName: assignedTo || null,
      plannedStart, plannedEnd, actualStart: actualStart || null, actualEnd: actualEnd || null,
      status, workDone, spares, remarks, completedAt: actualEnd || null, completedByName: completedBy || null,
      createdById: userByName[eng]?.id ?? null, createdAt: created, attachments: [], history,
    };
  });

  for (const n of notifications) {
    if (n.workOrderNo) n.status = n.status; // no-op, status already carries "Converted to Work Order"
  }

  return {
    seq: { nt: 412, wo: 458, user: users.length, dept: DEPARTMENTS.length, loc: LOCATIONS.length, nat: NATURES.length },
    departments: DEPARTMENTS.map((d, i) => ({ id: i + 1, ...d })),
    locations: LOCATIONS.map((l, i) => ({ id: i + 1, ...l })),
    natures: NATURES.map((n, i) => ({ id: i + 1, ...n })),
    users,
    notifications,
    workOrders,
  };
}

export async function getDB() {
  if (DB) return DB;
  if (!building) building = build();
  DB = await building;
  return DB;
}

export function nextNo(db, kind) {
  if (kind === "nt") { db.seq.nt += 1; return `NT-2026-${String(db.seq.nt).padStart(5, "0")}`; }
  db.seq.wo += 1; return `WO-2026-${String(db.seq.wo).padStart(5, "0")}`;
}

export function nowStamp() {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace("T", " ");
}
