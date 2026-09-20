// Seeds a real Postgres database with the same sample data the UI_ONLY mock
// store uses, so a fresh deploy has realistic data to explore.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { DEPARTMENTS, LOCATIONS, NATURES, USERS, NT_SEED, WO_SEED, DEFAULT_PASSWORD, engineerOf } from "../src/lib/seedData.js";

const prisma = new PrismaClient();

async function hashPassword(password) {
  return crypto.createHash("sha256").update(`${password}::zyn-ejt::user-v1`).digest("hex");
}

function addMinutesStr(dateStr, timeStr, minutes) {
  const d = new Date(`${dateStr}T${timeStr || "00:00"}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16).replace("T", " ");
}
function splitDT(s) {
  const [d, t] = s.split(" ");
  return [d, t];
}

async function main() {
  console.log("Seeding departments, locations, job natures…");
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { name: d.name }, update: {}, create: d });
  }
  for (const l of LOCATIONS) {
    await prisma.location.upsert({ where: { name: l.name }, update: {}, create: l });
  }
  for (const n of NATURES) {
    await prisma.jobNature.upsert({ where: { name: n.name }, update: {}, create: n });
  }

  console.log(`Seeding ${USERS.length} users (default password: ${DEFAULT_PASSWORD})…`);
  const passwordHash = await hashPassword(process.env.EJT_SEED_PASSWORD || DEFAULT_PASSWORD);
  const userByName = {};
  for (const u of USERS) {
    const row = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { username: u.username, passwordHash, name: u.name, role: u.role, dept: u.dept, designation: u.designation, email: u.email, mobile: u.mobile, active: u.active },
    });
    userByName[u.name] = row;
  }

  console.log(`Seeding ${NT_SEED.length} notifications…`);
  const notifByNo = {};
  for (const r of NT_SEED) {
    const [no, date, time, raisedBy, dept, location, job, description, nature, priority, status, wo] = r;
    const eng = engineerOf(dept);
    const history = [{ at: `${date} ${time}`, who: raisedBy, text: "Notification created and raised to engineering." }];
    if (status !== "Raised") history.push({ at: addMinutesStr(date, time, 33), who: eng, text: "Notification reviewed by engineering." });
    if (status === "Rejected") history.push({ at: addMinutesStr(date, time, 41), who: eng, text: "Notification rejected — handled outside engineering." });
    if (wo) history.push({ at: addMinutesStr(date, time, 48), who: eng, text: `Converted to work order ${wo}.` });

    const row = await prisma.notification.upsert({
      where: { no },
      update: {},
      create: {
        no, date: new Date(date), time, dept, location, job, description, nature, priority, status,
        raisedById: userByName[raisedBy].id, history,
      },
    });
    notifByNo[no] = row;
  }

  console.log(`Seeding ${WO_SEED.length} work orders…`);
  for (const r of WO_SEED) {
    const [no, notifNo, dept, assignedTo, plannedStart, plannedEnd, actualStart, actualEnd, status, workDone, spares, remarks, completedBy] = r;
    const src = notifByNo[notifNo];
    const [cd, ct] = splitDT(addMinutesStr(src.date.toISOString().slice(0, 10), src.time, 48));
    const created = `${cd} ${ct}`;
    const eng = engineerOf(dept);
    const history = [{ at: created, who: eng, text: `Work order created from notification ${notifNo}.` }];
    if (assignedTo) history.push({ at: created, who: eng, text: `Assigned to ${assignedTo}.` });
    if (actualStart) history.push({ at: actualStart, who: assignedTo, text: "Work started on site." });
    if (actualEnd) history.push({ at: actualEnd, who: completedBy || assignedTo, text: "Work completed and reported." });
    if (status === "Closed") history.push({ at: actualEnd || created, who: eng, text: "Work order verified and closed." });
    if (status === "Cancelled") history.push({ at: created, who: eng, text: "Work order cancelled." });

    await prisma.workOrder.upsert({
      where: { no },
      update: {},
      create: {
        no, notificationId: src.id, dept, location: src.location, job: src.job, description: src.description, nature: src.nature, priority: src.priority,
        assignedToId: assignedTo ? userByName[assignedTo]?.id : null,
        plannedStart: new Date(plannedStart.replace(" ", "T")), plannedEnd: new Date(plannedEnd.replace(" ", "T")),
        actualStart: actualStart ? new Date(actualStart.replace(" ", "T")) : null,
        actualEnd: actualEnd ? new Date(actualEnd.replace(" ", "T")) : null,
        status, workDone, spares, remarks, completedByName: completedBy || null,
        completedAt: actualEnd ? new Date(actualEnd.replace(" ", "T")) : null,
        createdById: userByName[eng].id, history,
      },
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
