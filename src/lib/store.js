// Unified data-access layer. Every function branches on UI_ONLY mode so API
// routes never need to know which backend (Postgres via Prisma, or the
// in-memory mock store) is actually serving the request.
import { isUiOnlyMode } from "@/lib/mode";
import { prisma } from "@/lib/prisma";
import { getDB, nextNo, nowStamp } from "@/lib/mockStore";
import { engineerOf } from "@/lib/seedData";
import { WO_OPEN } from "@/lib/constants";
import { balanceOf, stockStatus, nameKey, importChanges, slipKey, MOVEMENT } from "@/lib/inventory";

function nowISO() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

// ── Departments / Job Natures (simple master lists) ────────────────────────
export async function listDepartments() {
  if (isUiOnlyMode()) {
    const db = await getDB();
    return db.departments.map((d) => ({
      ...d,
      inUse: db.notifications.filter((n) => n.dept === d.name).length + db.workOrders.filter((w) => w.dept === d.name).length,
    }));
  }
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const counts = await Promise.all(
    departments.map((d) =>
      Promise.all([prisma.notification.count({ where: { dept: d.name } }), prisma.workOrder.count({ where: { dept: d.name } })])
    )
  );
  return departments.map((d, i) => ({ ...d, inUse: counts[i][0] + counts[i][1] }));
}
export async function addDepartment({ name, notif = true, work = true }) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = { id: ++db.seq.dept, name, notif, work, active: true };
    db.departments.push(row);
    return row;
  }
  return prisma.department.create({ data: { name, notif, work } });
}
export async function updateDepartment(id, patch) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = db.departments.find((d) => d.id === Number(id));
    if (!row) throw new Error("Not found");
    Object.assign(row, patch);
    return row;
  }
  return prisma.department.update({ where: { id: Number(id) }, data: patch });
}
export async function deleteDepartment(id) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.departments.findIndex((d) => d.id === Number(id));
    if (idx === -1) throw new Error("Not found");
    db.departments.splice(idx, 1);
    return;
  }
  await prisma.department.delete({ where: { id: Number(id) } });
}

export async function listNatures() {
  if (isUiOnlyMode()) return (await getDB()).natures;
  return prisma.jobNature.findMany({ orderBy: { name: "asc" } });
}
export async function addNature({ name }) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = { id: ++db.seq.nat, name, active: true };
    db.natures.push(row);
    return row;
  }
  return prisma.jobNature.create({ data: { name } });
}
export async function updateNature(id, patch) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = db.natures.find((n) => n.id === Number(id));
    if (!row) throw new Error("Not found");
    Object.assign(row, patch);
    return row;
  }
  return prisma.jobNature.update({ where: { id: Number(id) }, data: patch });
}
export async function deleteNature(id) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    db.natures = db.natures.filter((n) => n.id !== Number(id));
    return;
  }
  await prisma.jobNature.delete({ where: { id: Number(id) } });
}

// ── Users ───────────────────────────────────────────────────────────────
function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}
export async function listUsers() {
  if (isUiOnlyMode()) return (await getDB()).users.map(publicUser);
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(publicUser);
}
export async function findUserByUsername(username) {
  if (isUiOnlyMode()) return (await getDB()).users.find((u) => u.username === username) || null;
  return prisma.user.findUnique({ where: { username } });
}
export async function findUserById(id) {
  if (isUiOnlyMode()) return (await getDB()).users.find((u) => u.id === Number(id)) || null;
  return prisma.user.findUnique({ where: { id: Number(id) } });
}
export async function addUser({ username, passwordHash, name, role, dept, designation, email, mobile }) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    if (db.users.some((u) => u.username === username)) {
      const err = new Error("A user with this username already exists");
      err.code = "DUP";
      throw err;
    }
    const row = { id: ++db.seq.user, username, passwordHash, name, role, dept, designation, email: email || "", mobile: mobile || "", active: true };
    db.users.push(row);
    return publicUser(row);
  }
  try {
    const row = await prisma.user.create({ data: { username, passwordHash, name, role, dept, designation, email, mobile } });
    return publicUser(row);
  } catch (e) {
    if (e.code === "P2002") { const err = new Error("A user with this username already exists"); err.code = "DUP"; throw err; }
    throw e;
  }
}
export async function updateUser(id, patch) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = db.users.find((u) => u.id === Number(id));
    if (!row) throw new Error("Not found");
    Object.assign(row, patch);
    return publicUser(row);
  }
  const row = await prisma.user.update({ where: { id: Number(id) }, data: patch });
  return publicUser(row);
}
export async function deleteUser(id) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.users.findIndex((u) => u.id === Number(id));
    if (idx === -1) throw new Error("Not found");
    db.users.splice(idx, 1);
    return;
  }
  await prisma.user.delete({ where: { id: Number(id) } });
}

// ── Notifications ───────────────────────────────────────────────────────
function normNotif(n, users) {
  if (!n) return null;
  const raisedByName = n.raisedByName || users?.find((u) => u.id === n.raisedById)?.name || n.raisedBy?.name;
  return {
    id: n.id, no: n.no, date: typeof n.date === "string" ? n.date : n.date.toISOString().slice(0, 10),
    time: n.time, dept: n.dept, location: n.location, job: n.job, description: n.description,
    nature: n.nature, priority: n.priority, status: n.status,
    raisedByName, workOrderNo: n.workOrderNo ?? n.workOrder?.no ?? null,
    attachments: n.attachments || [], history: n.history || [],
  };
}

export async function listNotifications({ scope, userDept, userName } = {}) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    let rows = db.notifications;
    if (scope === "dept") rows = rows.filter((n) => n.dept === userDept);
    if (scope === "mine") {
      const myWoNotifNos = new Set(db.workOrders.filter((w) => w.assignedToName === userName).map((w) => w.notificationNo));
      rows = rows.filter((n) => myWoNotifNos.has(n.no));
    }
    return rows.map((n) => normNotif(n, db.users)).sort((a, b) => (b.date + b.time < a.date + a.time ? -1 : 1));
  }
  const where = {};
  if (scope === "dept") where.dept = userDept;
  let rows = await prisma.notification.findMany({ where, include: { raisedBy: true, workOrder: true }, orderBy: [{ date: "desc" }, { time: "desc" }] });
  if (scope === "mine") {
    const mine = await prisma.workOrder.findMany({ where: { assignedTo: { name: userName } }, select: { notificationId: true } });
    const ids = new Set(mine.map((w) => w.notificationId));
    rows = rows.filter((n) => ids.has(n.id));
  }
  return rows.map((n) => normNotif({ ...n, workOrderNo: n.workOrder?.no }, null));
}

export async function getNotificationByNo(no) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    return normNotif(db.notifications.find((n) => n.no === no), db.users);
  }
  const n = await prisma.notification.findUnique({ where: { no }, include: { raisedBy: true, workOrder: true } });
  return n ? normNotif({ ...n, workOrderNo: n.workOrder?.no }, null) : null;
}

export async function createNotification({ dept, location, job, description, nature, priority, raisedByUser }) {
  const t = nowISO();
  const [date, time] = t.split(" ");
  const history = [{ at: t, who: raisedByUser.name, text: "Notification created and raised to engineering." }];
  if (isUiOnlyMode()) {
    const db = await getDB();
    const no = nextNo(db, "nt");
    const row = { id: db.notifications.length + 1, no, date, time, dept, location, job, description, nature, priority,
      status: "Raised", raisedById: raisedByUser.id, raisedByName: raisedByUser.name, workOrderNo: null, attachments: [], history };
    db.notifications.unshift(row);
    return normNotif(row, db.users);
  }
  let no;
  const row = await prisma.$transaction(async (tx) => {
    const count = await tx.notification.count();
    no = `NT-2026-${String(413 + count).padStart(5, "0")}`;
    return tx.notification.create({
      data: { no, date: new Date(date), time, dept, location, job, description, nature, priority, status: "Raised", raisedById: raisedByUser.id, history },
    });
  });
  return normNotif(row, null);
}

function pushHistory(n, who, text) {
  n.history = [...(n.history || []), { at: nowISO(), who, text }];
}

export async function setNotificationStatus(no, status, who) {
  const label = { "Under Review": "Status changed to Under Review.", Accepted: "Status changed to Accepted.", Rejected: "Notification rejected by engineering." }[status] || `Status changed to ${status}.`;
  if (isUiOnlyMode()) {
    const db = await getDB();
    const n = db.notifications.find((x) => x.no === no);
    if (!n) throw new Error("Not found");
    n.status = status;
    pushHistory(n, who, label);
    return normNotif(n, db.users);
  }
  const n = await prisma.notification.findUnique({ where: { no } });
  if (!n) throw new Error("Not found");
  const history = [...(n.history || []), { at: nowISO(), who, text: label }];
  const updated = await prisma.notification.update({ where: { no }, data: { status, history } });
  return normNotif(updated, null);
}

// Full-field edit. Called by an administrator (any field, any status) and by
// the person who raised the notification (the API route restricts their
// patch to { job, priority } and blocks it once converted/closed).
const NOTIF_EDITABLE = ["dept", "location", "job", "description", "nature", "priority", "status"];
export async function updateNotification(no, patch, who) {
  const data = {};
  for (const k of NOTIF_EDITABLE) if (patch[k] !== undefined) data[k] = patch[k];
  const text = "Notification edited.";
  if (isUiOnlyMode()) {
    const db = await getDB();
    const n = db.notifications.find((x) => x.no === no);
    if (!n) throw new Error("Not found");
    Object.assign(n, data);
    pushHistory(n, who, text);
    return normNotif(n, db.users);
  }
  const n = await prisma.notification.findUnique({ where: { no } });
  if (!n) throw new Error("Not found");
  const history = [...(n.history || []), { at: nowISO(), who, text }];
  const updated = await prisma.notification.update({ where: { no }, data: { ...data, history }, include: { workOrder: true } });
  return normNotif({ ...updated, workOrderNo: updated.workOrder?.no }, null);
}

// Deletes a notification together with any work order raised from it, so an
// administrator can remove one at any status without hitting the foreign-key
// constraint on WorkOrder.notificationId. (The API route only lets a
// non-admin owner delete a notification that hasn't been converted yet, so
// there's nothing to cascade in that case.)
export async function deleteNotification(no) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.notifications.findIndex((x) => x.no === no);
    if (idx < 0) throw new Error("Not found");
    db.workOrders = db.workOrders.filter((w) => w.notificationNo !== no);
    db.notifications.splice(idx, 1);
    return;
  }
  const n = await prisma.notification.findUnique({ where: { no } });
  if (!n) throw new Error("Not found");
  await prisma.$transaction([
    prisma.workOrder.deleteMany({ where: { notificationId: n.id } }),
    prisma.notification.delete({ where: { no } }),
  ]);
}

// ── Work Orders ─────────────────────────────────────────────────────────
function normWO(w) {
  if (!w) return null;
  return {
    id: w.id, no: w.no, notificationNo: w.notificationNo || w.notification?.no,
    dept: w.dept, location: w.location, job: w.job, description: w.description, nature: w.nature, priority: w.priority,
    assignedToName: w.assignedToName ?? w.assignedTo?.name ?? null,
    plannedStart: typeof w.plannedStart === "string" ? w.plannedStart : w.plannedStart?.toISOString().slice(0, 16).replace("T", " "),
    plannedEnd: typeof w.plannedEnd === "string" ? w.plannedEnd : w.plannedEnd?.toISOString().slice(0, 16).replace("T", " "),
    actualStart: typeof w.actualStart === "string" || !w.actualStart ? w.actualStart : w.actualStart.toISOString().slice(0, 16).replace("T", " "),
    actualEnd: typeof w.actualEnd === "string" || !w.actualEnd ? w.actualEnd : w.actualEnd.toISOString().slice(0, 16).replace("T", " "),
    status: w.status, workDone: w.workDone || "", spares: w.spares || "", remarks: w.remarks || "",
    completedByName: w.completedByName ?? null, attachments: w.attachments || [], history: w.history || [],
    createdAt: typeof w.createdAt === "string" ? w.createdAt : w.createdAt?.toISOString(),
    sourceDept: w.sourceDept,
  };
}

export async function listWorkOrders({ scope, userDept, userName } = {}) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    let rows = db.workOrders.map((w) => ({ ...w, sourceDept: db.notifications.find((n) => n.no === w.notificationNo)?.dept }));
    if (scope === "mine") rows = rows.filter((w) => w.assignedToName === userName);
    if (scope === "dept") rows = rows.filter((w) => w.sourceDept === userDept);
    return rows.map(normWO).sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1));
  }
  const rows = await prisma.workOrder.findMany({ include: { assignedTo: true, notification: true }, orderBy: { createdAt: "desc" } });
  let out = rows.map((w) => normWO({ ...w, notificationNo: w.notification.no, sourceDept: w.notification.dept }));
  if (scope === "mine") out = out.filter((w) => w.assignedToName === userName);
  if (scope === "dept") out = out.filter((w) => w.sourceDept === userDept);
  return out;
}

export async function getWorkOrderByNo(no) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const w = db.workOrders.find((x) => x.no === no);
    if (!w) return null;
    return normWO({ ...w, sourceDept: db.notifications.find((n) => n.no === w.notificationNo)?.dept });
  }
  const w = await prisma.workOrder.findUnique({ where: { no }, include: { assignedTo: true, notification: true } });
  return w ? normWO({ ...w, notificationNo: w.notification.no, sourceDept: w.notification.dept }) : null;
}

export async function createWorkOrder({ notificationNo, dept, location, job, description, nature, priority, assignedToName, plannedStart, plannedEnd, remarks, createdByUser }) {
  const t = nowISO();
  const status = assignedToName ? "Assigned" : "Pending";
  const history = [{ at: t, who: createdByUser.name, text: `Work order created from notification ${notificationNo}.` }];
  if (assignedToName) history.push({ at: t, who: createdByUser.name, text: `Assigned to ${assignedToName}.` });

  if (isUiOnlyMode()) {
    const db = await getDB();
    const src = db.notifications.find((n) => n.no === notificationNo);
    if (!src) throw new Error("Source notification not found");
    if (src.workOrderNo) throw new Error("Already converted");
    const no = nextNo(db, "wo");
    const assignedToId = db.users.find((u) => u.name === assignedToName)?.id ?? null;
    const row = {
      id: db.workOrders.length + 1, no, notificationId: src.id, notificationNo, dept, location, job, description, nature, priority,
      assignedToId, assignedToName: assignedToName || null, plannedStart, plannedEnd, actualStart: null, actualEnd: null,
      status, workDone: "", spares: "", remarks: remarks || "", completedAt: null, completedByName: null,
      createdById: createdByUser.id, createdAt: t, attachments: [], history,
    };
    db.workOrders.unshift(row);
    src.status = "Converted to Work Order";
    src.workOrderNo = no;
    pushHistory(src, createdByUser.name, `Converted to work order ${no}.`);
    return normWO({ ...row, sourceDept: src.dept });
  }

  const src = await prisma.notification.findUnique({ where: { no: notificationNo } });
  if (!src) throw new Error("Source notification not found");
  const count = await prisma.workOrder.count();
  const no = `WO-2026-${String(459 + count).padStart(5, "0")}`;
  const assignedUser = assignedToName ? await prisma.user.findFirst({ where: { name: assignedToName } }) : null;
  const [w] = await prisma.$transaction([
    prisma.workOrder.create({
      data: {
        no, notificationId: src.id, dept, location, job, description, nature, priority,
        assignedToId: assignedUser?.id, plannedStart: new Date(plannedStart.replace(" ", "T")), plannedEnd: new Date(plannedEnd.replace(" ", "T")),
        remarks: remarks || "", status, createdById: createdByUser.id, history,
      },
    }),
    prisma.notification.update({
      where: { no: notificationNo },
      data: { status: "Converted to Work Order", history: [...(src.history || []), { at: t, who: createdByUser.name, text: `Converted to work order ${no}.` }] },
    }),
  ]);
  return normWO({ ...w, notificationNo, assignedToName, sourceDept: src.dept });
}

async function getWOMock(no) {
  const db = await getDB();
  const w = db.workOrders.find((x) => x.no === no);
  if (!w) throw new Error("Not found");
  return { db, w };
}
function withHistory(history, who, text) {
  return [...(history || []), { at: nowISO(), who, text }];
}
function finishMock(w, db) {
  return normWO({ ...w, sourceDept: db.notifications.find((n) => n.no === w.notificationNo)?.dept });
}
async function finishPrisma(no, patch) {
  const before = await prisma.workOrder.findUnique({ where: { no }, include: { notification: true } });
  if (!before) throw new Error("Not found");
  const updated = await prisma.workOrder.update({ where: { no }, data: patch });
  return { before, updated: normWO({ ...updated, notificationNo: before.notification.no, sourceDept: before.notification.dept }) };
}

export async function assignWorkOrder(no, assignedToName, who) {
  const text = `Assigned to ${assignedToName}.`;
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.assignedToName = assignedToName;
    w.assignedToId = db.users.find((u) => u.name === assignedToName)?.id ?? null;
    if (w.status === "Pending") w.status = "Assigned";
    w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const assignedUser = await prisma.user.findFirst({ where: { name: assignedToName } });
  const { updated } = await finishPrisma(no, {
    assignedToId: assignedUser?.id ?? null,
    status: before.status === "Pending" ? "Assigned" : before.status,
    history: withHistory(before.history, who, text),
  });
  return { ...updated, assignedToName };
}

export async function startWorkOrder(no, who) {
  const text = "Work started on site.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.status = "In Progress"; w.actualStart = nowStamp(); w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const { updated } = await finishPrisma(no, { status: "In Progress", actualStart: new Date(), history: withHistory(before.history, who, text) });
  return updated;
}

export async function holdWorkOrder(no, who) {
  const text = "Work put on hold.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.status = "On Hold"; w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const { updated } = await finishPrisma(no, { status: "On Hold", history: withHistory(before.history, who, text) });
  return updated;
}

export async function resumeWorkOrder(no, who) {
  const text = "Work resumed.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.status = "In Progress"; w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const { updated } = await finishPrisma(no, { status: "In Progress", history: withHistory(before.history, who, text) });
  return updated;
}

export async function completeWorkOrder(no, { workDone, spares, remarks }, who) {
  const text = "Work completed and reported.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    const at = nowStamp();
    w.status = "Completed"; w.actualEnd = at; w.completedAt = at; w.completedByName = who;
    if (!w.actualStart) w.actualStart = at;
    w.workDone = workDone; w.spares = spares || ""; if (remarks) w.remarks = remarks;
    w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const now = new Date();
  const { updated } = await finishPrisma(no, {
    status: "Completed", actualEnd: now, completedAt: now, completedByName: who,
    ...(before.actualStart ? {} : { actualStart: now }),
    workDone, spares: spares || "", ...(remarks ? { remarks } : {}),
    history: withHistory(before.history, who, text),
  });
  return updated;
}

export async function closeWorkOrder(no, who) {
  const text = "Work order verified and closed.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.status = "Closed"; w.history = withHistory(w.history, who, text);
    const n = db.notifications.find((x) => x.no === w.notificationNo);
    if (n) { n.status = "Closed"; n.history = withHistory(n.history, who, "Notification closed after work order closure."); }
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no }, include: { notification: true } });
  if (!before) throw new Error("Not found");
  const { updated } = await finishPrisma(no, { status: "Closed", history: withHistory(before.history, who, text) });
  await prisma.notification.update({
    where: { id: before.notificationId },
    data: { status: "Closed", history: withHistory(before.notification.history, who, "Notification closed after work order closure.") },
  });
  return updated;
}

export async function cancelWorkOrder(no, who) {
  const text = "Work order cancelled.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    w.status = "Cancelled"; w.history = withHistory(w.history, who, text);
    const n = db.notifications.find((x) => x.no === w.notificationNo);
    if (n) { n.workOrderNo = null; n.status = "Accepted"; n.history = withHistory(n.history, who, `Work order ${no} cancelled — notification returned to accepted.`); }
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no }, include: { notification: true } });
  if (!before) throw new Error("Not found");
  const { updated } = await finishPrisma(no, { status: "Cancelled", history: withHistory(before.history, who, text) });
  await prisma.notification.update({
    where: { id: before.notificationId },
    data: { status: "Accepted", history: withHistory(before.notification.history, who, `Work order ${no} cancelled — notification returned to accepted.`) },
  });
  return updated;
}

// Full-field edit, administrator only, unrestricted by status — the one
// place a completed/closed work order can still be corrected.
const WO_EDITABLE = ["dept", "location", "job", "description", "nature", "priority", "status", "workDone", "spares", "remarks"];
const WO_DATES = ["plannedStart", "plannedEnd", "actualStart", "actualEnd"];
function parseStamp(s) {
  return s ? new Date(String(s).replace(" ", "T")) : null;
}
export async function updateWorkOrder(no, patch, who) {
  const text = "Work order edited by administrator.";
  const data = {};
  for (const k of WO_EDITABLE) if (patch[k] !== undefined) data[k] = patch[k];
  const dates = {};
  for (const k of WO_DATES) if (patch[k] !== undefined) dates[k] = patch[k] || null;
  const assignChanged = patch.assignedToName !== undefined;
  const assignedToName = patch.assignedToName || null;

  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    Object.assign(w, data, dates);
    if (assignChanged) {
      w.assignedToName = assignedToName;
      w.assignedToId = db.users.find((u) => u.name === assignedToName)?.id ?? null;
    }
    w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const prismaDates = Object.fromEntries(Object.entries(dates).map(([k, v]) => [k, parseStamp(v)]));
  const assign = {};
  if (assignChanged) {
    const u = assignedToName ? await prisma.user.findFirst({ where: { name: assignedToName } }) : null;
    assign.assignedToId = u?.id ?? null;
  }
  const { updated } = await finishPrisma(no, { ...data, ...prismaDates, ...assign, history: withHistory(before.history, who, text) });
  return { ...updated, assignedToName };
}

// Light edit — { job, priority, assignedToName } only, a quick correction
// kept separate from the assign/start/hold/.../close lifecycle above. The API
// route gates this to the administrator and blocks it once completed/closed.
export async function editWorkOrder(no, patch, who) {
  const text = "Work order edited.";
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    if (patch.job !== undefined) w.job = patch.job;
    if (patch.priority !== undefined) w.priority = patch.priority;
    if (patch.assignedToName !== undefined) {
      w.assignedToName = patch.assignedToName || null;
      w.assignedToId = patch.assignedToName ? (db.users.find((u) => u.name === patch.assignedToName)?.id ?? null) : null;
    }
    w.history = withHistory(w.history, who, text);
    return finishMock(w, db);
  }
  const before = await prisma.workOrder.findUnique({ where: { no } });
  if (!before) throw new Error("Not found");
  const data = { history: withHistory(before.history, who, text) };
  if (patch.job !== undefined) data.job = patch.job;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.assignedToName !== undefined) {
    const assignedUser = patch.assignedToName ? await prisma.user.findFirst({ where: { name: patch.assignedToName } }) : null;
    data.assignedToId = assignedUser?.id ?? null;
  }
  const { updated } = await finishPrisma(no, data);
  return patch.assignedToName !== undefined ? { ...updated, assignedToName: patch.assignedToName || null } : updated;
}

// Administrator only, unrestricted by status. Returns the source notification
// to "Accepted", same as cancelling one.
export async function deleteWorkOrder(no, who) {
  const text = `Work order ${no} removed — notification returned to accepted.`;
  if (isUiOnlyMode()) {
    const { db, w } = await getWOMock(no);
    db.workOrders = db.workOrders.filter((x) => x !== w);
    const n = db.notifications.find((x) => x.no === w.notificationNo);
    if (n) { n.workOrderNo = null; n.status = "Accepted"; pushHistory(n, who, text); }
    return;
  }
  const before = await prisma.workOrder.findUnique({ where: { no }, include: { notification: true } });
  if (!before) throw new Error("Not found");
  await prisma.$transaction([
    prisma.workOrder.delete({ where: { no } }),
    prisma.notification.update({
      where: { id: before.notificationId },
      data: { status: "Accepted", history: withHistory(before.notification.history, who, text) },
    }),
  ]);
}

// ── Dashboard aggregation ───────────────────────────────────────────────
export async function getDashboardData({ scope, userDept, userName } = {}) {
  const notifications = await listNotifications({ scope, userDept, userName });
  const workOrders = await listWorkOrders({ scope, userDept, userName });
  return { notifications, workOrders, open: workOrders.filter((w) => WO_OPEN.includes(w.status)) };
}

// ── Inventory (store stock) ─────────────────────────────────────────────
function normInv(r) {
  const balance = balanceOf(r);
  return {
    id: r.id, source: r.source, name: r.name, dept: r.dept, category: r.category, location: r.location,
    opening: r.opening, received: r.received, issued: r.issued, reorderLevel: r.reorderLevel,
    balance, status: stockStatus(r.source, balance, r.reorderLevel),
    fsn: r.fsn || "", avgMonthly: r.avgMonthly || 0,
  };
}
async function rawInventory() {
  if (isUiOnlyMode()) return (await getDB()).inventory;
  return prisma.inventoryItem.findMany();
}
function dupError(item) {
  const err = new Error(`“${item.name}” is already in the ${item.source === "IMPORTED" ? "Imported" : "Local"} list. Edit that item instead.`);
  err.code = "DUP";
  return err;
}
function notFound() {
  const err = new Error("Not found");
  err.code = "NOT_FOUND";
  return err;
}

export async function listInventory() {
  const rows = await rawInventory();
  return rows.map(normInv).sort((a, b) => a.name.localeCompare(b.name));
}

// `item` is already cleaned and validated (see lib/inventory.js).
export async function createInventoryItem(item) {
  const key = nameKey(item.name);
  if (isUiOnlyMode()) {
    const db = await getDB();
    if (db.inventory.some((r) => r.source === item.source && r.nameKey === key)) throw dupError(item);
    const row = { id: ++db.seq.inv, ...item, nameKey: key };
    db.inventory.push(row);
    return normInv(row);
  }
  try {
    return normInv(await prisma.inventoryItem.create({ data: { ...item, nameKey: key } }));
  } catch (e) {
    if (e.code === "P2002") throw dupError(item);
    throw e;
  }
}

// The list (Local / Imported) an item belongs to never changes; everything else can.
export async function updateInventoryItem(id, item) {
  const { source: _source, ...fields } = item;
  const key = nameKey(fields.name);
  if (isUiOnlyMode()) {
    const db = await getDB();
    const row = db.inventory.find((r) => r.id === Number(id));
    if (!row) throw notFound();
    if (db.inventory.some((r) => r.id !== row.id && r.source === row.source && r.nameKey === key)) throw dupError({ ...fields, source: row.source });
    Object.assign(row, fields, { nameKey: key });
    return normInv(row);
  }
  const cur = await prisma.inventoryItem.findUnique({ where: { id: Number(id) } });
  if (!cur) throw notFound();
  try {
    return normInv(await prisma.inventoryItem.update({ where: { id: cur.id }, data: { ...fields, nameKey: key } }));
  } catch (e) {
    if (e.code === "P2025") throw notFound();
    if (e.code === "P2002") throw dupError({ ...fields, source: cur.source });
    throw e;
  }
}

export async function deleteInventoryItem(id) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.inventory.findIndex((r) => r.id === Number(id));
    if (idx < 0) throw notFound();
    db.inventory.splice(idx, 1);
    return;
  }
  try {
    await prisma.inventoryItem.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === "P2025") throw notFound();
    throw e;
  }
}

// Works out what importing `rows` (cleaned + validated) would do, without changing anything.
export async function planInventoryImport(rows) {
  const existing = await rawInventory();
  const byKey = new Map(existing.map((r) => [`${r.source}|${r.nameKey}`, r]));
  const seen = new Set();
  const news = [];
  const updates = [];
  let unchanged = 0;
  let duplicates = 0;
  for (const row of rows) {
    const key = `${row.source}|${nameKey(row.name)}`;
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    const cur = byKey.get(key);
    if (!cur) { news.push(row); continue; }
    const changes = importChanges(cur, row);
    if (changes.length) updates.push({ id: cur.id, source: cur.source, name: cur.name, location: cur.location, changes });
    else unchanged++;
  }
  // Items on the lists the file covers that the file doesn't mention. They are kept, never deleted.
  const listsInFile = new Set(rows.map((r) => r.source));
  const notInFile = existing.filter((r) => listsInFile.has(r.source) && !seen.has(`${r.source}|${r.nameKey}`)).length;
  return { news, updates, unchanged, duplicates, notInFile };
}

// Saves a plan from planInventoryImport().
export async function applyInventoryImport(plan) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    for (const u of plan.updates) {
      const row = db.inventory.find((r) => r.id === u.id);
      if (row) for (const c of u.changes) row[c.field] = c.to;
    }
    for (const n of plan.news) db.inventory.push({ id: ++db.seq.inv, ...n, nameKey: nameKey(n.name) });
    return;
  }
  const data = plan.news.map((n) => ({ ...n, nameKey: nameKey(n.name) }));
  for (let i = 0; i < data.length; i += 500) {
    await prisma.inventoryItem.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
  }
  for (let i = 0; i < plan.updates.length; i += 100) {
    await prisma.$transaction(
      plan.updates.slice(i, i + 100).map((u) =>
        prisma.inventoryItem.update({ where: { id: u.id }, data: Object.fromEntries(u.changes.map((c) => [c.field, c.to])) }),
      ),
    );
  }
}

// ── Stock movements (issuance slips and top-ups) ─────────────────────────
const r3 = (n) => Math.round(n * 1000) / 1000;

function normMove(r) {
  return {
    id: r.id, kind: r.kind, slipNo: r.slipNo || "", when: new Date(r.when ?? r.occurredAt).toISOString(),
    issuedBy: r.issuedBy || "", issuedTo: r.issuedTo || "", dept: r.dept || "", authorisedBy: r.authorisedBy || "", location: r.location || "",
    vendor: r.vendor || "", invoiceNo: r.invoiceNo || "", recordedBy: r.recordedBy || "",
    lines: r.lines.map((l) => ({ itemId: l.itemId, name: l.itemName ?? l.name, qty: l.qty })),
  };
}
function moveError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
// The message for the first line the store can't cover, or null. Only issuing can run short.
function shortLine(kind, lines, rows) {
  if (kind !== MOVEMENT.ISSUE) return null;
  for (const l of lines) {
    const row = rows.get(l.itemId);
    const bal = balanceOf(row);
    if (l.qty > bal) return `Only ${bal} of “${row.name}” is in stock. Lower the quantity.`;
  }
  return null;
}

export async function listMovements(limit = 30) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    return [...db.movements].sort((a, b) => b.id - a.id).slice(0, limit).map(normMove);
  }
  const rows = await prisma.stockMovement.findMany({ orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: limit, include: { lines: true } });
  return rows.map(normMove);
}

// Saves an issuance slip (kind ISSUE) or a top-up (kind TOPUP) and adds each line to
// the item's issued / received total. `input` is already cleaned and validated (see
// lib/inventory.js). Returns { movement, items } with the updated stock rows.
export async function recordMovement(kind, input, recordedBy) {
  const field = kind === MOVEMENT.ISSUE ? "issued" : "received";
  const key = kind === MOVEMENT.ISSUE ? slipKey(input.slipNo) : null;
  const fields = {
    kind, slipNo: kind === MOVEMENT.ISSUE ? input.slipNo : "", slipKey: key, recordedBy: recordedBy || "",
    issuedBy: input.issuedBy || "", issuedTo: input.issuedTo || "", dept: input.dept || "", authorisedBy: input.authorisedBy || "", location: input.location || "",
    vendor: input.vendor || "", invoiceNo: input.invoiceNo || "",
  };
  const dupSlip = () => moveError("DUP", `Slip ${input.slipNo} is already recorded. Check the number on the slip.`);
  const gone = () => moveError("NOT_FOUND", "A spare on this list no longer exists. Reload the page and try again.");

  if (isUiOnlyMode()) {
    const db = await getDB();
    if (key && db.movements.some((r) => r.kind === kind && r.slipKey === key)) throw dupSlip();
    const rows = new Map(input.lines.map((l) => [l.itemId, db.inventory.find((r) => r.id === l.itemId)]));
    if ([...rows.values()].some((r) => !r)) throw gone();
    const short = shortLine(kind, input.lines, rows);
    if (short) throw moveError("SHORT", short);
    for (const l of input.lines) rows.get(l.itemId)[field] = r3(rows.get(l.itemId)[field] + l.qty);
    const row = { id: ++db.seq.mov, ...fields, when: input.when, lines: input.lines.map((l) => ({ itemId: l.itemId, name: rows.get(l.itemId).name, qty: l.qty })) };
    db.movements.push(row);
    return { movement: normMove(row), items: input.lines.map((l) => normInv(rows.get(l.itemId))) };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const ids = input.lines.map((l) => l.itemId);
      const rows = new Map((await tx.inventoryItem.findMany({ where: { id: { in: ids } } })).map((r) => [r.id, r]));
      if (ids.some((id) => !rows.has(id))) throw gone();
      const short = shortLine(kind, input.lines, rows);
      if (short) throw moveError("SHORT", short);
      for (const l of input.lines) {
        await tx.inventoryItem.update({ where: { id: l.itemId }, data: { [field]: { increment: l.qty } } });
      }
      const saved = await tx.stockMovement.create({
        data: {
          ...fields, occurredAt: new Date(input.when),
          lines: { create: input.lines.map((l) => ({ itemId: l.itemId, itemName: rows.get(l.itemId).name, qty: l.qty })) },
        },
        include: { lines: true },
      });
      const fresh = await tx.inventoryItem.findMany({ where: { id: { in: ids } } });
      return { movement: normMove(saved), items: fresh.map(normInv) };
    });
  } catch (e) {
    if (e.code === "P2002") throw dupSlip();
    throw e;
  }
}

// Flattened movement lines for the Issuance / Top Up report export — one row
// per spare, most recent first. `filters` narrows what's returned; every
// filter is optional. `location` is a composed prefix (see composeLocation in
// lib/locationTree.js) — a spare used anywhere under it matches.
export async function reportMovementLines(kind, filters = {}) {
  const { from, to, spare, slipNo, dept, issuedTo, location, vendor } = filters;
  const spareQ = (spare || "").trim().toLowerCase();
  const has = (v, q) => String(v || "").toLowerCase().includes(q.toLowerCase());
  const rows = [];

  if (isUiOnlyMode()) {
    const db = await getDB();
    for (const m of db.movements) {
      if (m.kind !== kind) continue;
      const day = new Date(m.when ?? m.occurredAt).toISOString().slice(0, 10);
      if (from && day < from) continue;
      if (to && day > to) continue;
      if (kind === MOVEMENT.ISSUE) {
        if (slipNo && !has(m.slipNo, slipNo)) continue;
        if (dept && m.dept !== dept) continue;
        if (issuedTo && !has(m.issuedTo, issuedTo)) continue;
        if (location && !String(m.location || "").startsWith(location)) continue;
      } else if (vendor && !has(m.vendor, vendor)) continue;
      for (const l of m.lines) {
        if (spareQ && !has(l.name, spareQ)) continue;
        rows.push({ when: m.when, slipNo: m.slipNo, invoiceNo: m.invoiceNo, spare: l.name, qty: l.qty, issuedBy: m.issuedBy, issuedTo: m.issuedTo, dept: m.dept, authorisedBy: m.authorisedBy, location: m.location, vendor: m.vendor });
      }
    }
  } else {
    const where = { kind };
    if (from || to) where.occurredAt = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
    if (kind === MOVEMENT.ISSUE) {
      if (slipNo) where.slipNo = { contains: slipNo, mode: "insensitive" };
      if (dept) where.dept = dept;
      if (issuedTo) where.issuedTo = { contains: issuedTo, mode: "insensitive" };
      if (location) where.location = { startsWith: location };
    } else if (vendor) {
      where.vendor = { contains: vendor, mode: "insensitive" };
    }
    if (spareQ) where.lines = { some: { itemName: { contains: spareQ, mode: "insensitive" } } };
    const found = await prisma.stockMovement.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      include: { lines: spareQ ? { where: { itemName: { contains: spareQ, mode: "insensitive" } } } : true },
    });
    for (const m of found) {
      for (const l of m.lines) {
        rows.push({ when: m.occurredAt.toISOString(), slipNo: m.slipNo, invoiceNo: m.invoiceNo, spare: l.itemName, qty: l.qty, issuedBy: m.issuedBy, issuedTo: m.issuedTo, dept: m.dept, authorisedBy: m.authorisedBy, location: m.location, vendor: m.vendor });
      }
    }
  }
  return rows.sort((a, b) => b.when.localeCompare(a.when));
}
