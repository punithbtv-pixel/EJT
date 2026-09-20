// Unified data-access layer. Every function branches on UI_ONLY mode so API
// routes never need to know which backend (Postgres via Prisma, or the
// in-memory mock store) is actually serving the request.
import { isUiOnlyMode } from "@/lib/mode";
import { prisma } from "@/lib/prisma";
import { getDB, nextNo, nowStamp } from "@/lib/mockStore";
import { engineerOf } from "@/lib/seedData";
import { WO_OPEN } from "@/lib/constants";

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

// patch is restricted by the API route to { job, priority } — a notification's
// dept/location/nature are fixed at raise time, same as before this existed.
export async function updateNotification(no, patch, who) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const n = db.notifications.find((x) => x.no === no);
    if (!n) throw new Error("Not found");
    Object.assign(n, patch);
    pushHistory(n, who, "Notification edited.");
    return normNotif(n, db.users);
  }
  const n = await prisma.notification.findUnique({ where: { no } });
  if (!n) throw new Error("Not found");
  const history = [...(n.history || []), { at: nowISO(), who, text: "Notification edited." }];
  const updated = await prisma.notification.update({ where: { no }, data: { ...patch, history } });
  return normNotif(updated, null);
}

export async function deleteNotification(no) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.notifications.findIndex((x) => x.no === no);
    if (idx === -1) throw new Error("Not found");
    db.notifications.splice(idx, 1);
    return;
  }
  await prisma.notification.delete({ where: { no } });
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

// patch is restricted by the API route to { job, priority, assignedToName } —
// a direct correction, separate from the assign/start/hold/.../close lifecycle above.
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

export async function deleteWorkOrder(no, who) {
  if (isUiOnlyMode()) {
    const db = await getDB();
    const idx = db.workOrders.findIndex((x) => x.no === no);
    if (idx === -1) throw new Error("Not found");
    const w = db.workOrders[idx];
    db.workOrders.splice(idx, 1);
    const n = db.notifications.find((x) => x.no === w.notificationNo);
    if (n) { n.workOrderNo = null; n.status = "Accepted"; n.history = withHistory(n.history, who, `Work order ${no} removed — notification returned to accepted.`); }
    return;
  }
  const before = await prisma.workOrder.findUnique({ where: { no }, include: { notification: true } });
  if (!before) throw new Error("Not found");
  await prisma.workOrder.delete({ where: { no } });
  await prisma.notification.update({
    where: { id: before.notificationId },
    data: { status: "Accepted", history: withHistory(before.notification.history, who, `Work order ${no} removed — notification returned to accepted.`) },
  });
}

// ── Dashboard aggregation ───────────────────────────────────────────────
export async function getDashboardData({ scope, userDept, userName } = {}) {
  const notifications = await listNotifications({ scope, userDept, userName });
  const workOrders = await listWorkOrders({ scope, userDept, userName });
  return { notifications, workOrders, open: workOrders.filter((w) => WO_OPEN.includes(w.status)) };
}
