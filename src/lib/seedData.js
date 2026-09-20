// Canonical seed data for the ZYN Engineering Job Tracker — shared by the
// Postgres seed script (prisma/seed.mjs) and the in-memory UI_ONLY store
// (src/lib/mockStore.js), so both modes show identical sample data.
// Relative import (not the "@/" alias) so this file can also be loaded by
// prisma/seed.mjs, which runs as a plain Node script outside the Next.js bundler.
import { ROLES } from "./roles.js";

export const TODAY = "2026-09-19";

export const DEPARTMENTS = [
  { name: "Milling", notif: true, work: true, active: true },
  { name: "Parboiling", notif: true, work: true, active: true },
  { name: "Boiler", notif: true, work: true, active: true },
  { name: "ETP", notif: true, work: false, active: true },
  { name: "ETP/WTP", notif: false, work: true, active: true },
  { name: "Admin", notif: true, work: true, active: true },
  { name: "Mechanical", notif: true, work: true, active: true },
  { name: "Electrical", notif: true, work: true, active: true },
  { name: "Security", notif: true, work: false, active: true },
  { name: "Warehouse", notif: true, work: false, active: true },
  { name: "Residence", notif: true, work: false, active: true },
];

export const NATURES = [
  "Breakdown", "Preventive Maintenance", "Corrective Maintenance", "Inspection", "Modification",
  "Installation", "Electrical", "Mechanical", "Civil", "Plumbing", "Fabrication", "Other",
].map((name) => ({ name, active: true }));

// designation -> app role
const ROLE_OF_DESIGNATION = {
  Administrator: ROLES.ADMIN,
  "Engineering Supervisor": ROLES.ENGINEER,
  "Department Supervisor": ROLES.DEPT,
  "Engineer/Technician": ROLES.TECH,
};

// [name, emp, dept, designation, email, mobile, active]
const USER_ROWS = [
  ["Suresh Menon", "EMP-1001", "Admin", "Administrator", "suresh.menon@zynelectrical.co.in", "+91 98450 11021", true],
  ["Anil Deshpande", "EMP-1012", "Mechanical", "Engineering Supervisor", "anil.d@zynelectrical.co.in", "+91 98450 11034", true],
  ["Farid Qureshi", "EMP-1015", "Electrical", "Engineering Supervisor", "farid.q@zynelectrical.co.in", "+91 98450 11038", true],
  ["Ravi Kulkarni", "EMP-1103", "Milling", "Department Supervisor", "ravi.k@zynelectrical.co.in", "+91 98450 11102", true],
  ["Meena Patil", "EMP-1104", "Parboiling", "Department Supervisor", "meena.p@zynelectrical.co.in", "+91 98450 11109", true],
  ["Jagdish Rao", "EMP-1105", "Boiler", "Department Supervisor", "jagdish.r@zynelectrical.co.in", "+91 98450 11114", true],
  ["Sunita Nair", "EMP-1106", "ETP", "Department Supervisor", "sunita.n@zynelectrical.co.in", "+91 98450 11121", true],
  ["Vikram Shetty", "EMP-1107", "Warehouse", "Department Supervisor", "vikram.s@zynelectrical.co.in", "+91 98450 11127", true],
  ["Anand Kamble", "EMP-1108", "Security", "Department Supervisor", "anand.k@zynelectrical.co.in", "+91 98450 11131", true],
  ["Mohan Prabhu", "EMP-1109", "Admin", "Department Supervisor", "mohan.p@zynelectrical.co.in", "+91 98450 11136", true],
  ["Lata Hegde", "EMP-1110", "Residence", "Department Supervisor", "lata.h@zynelectrical.co.in", "+91 98450 11142", false],
  ["Imran Shaikh", "EMP-1201", "Mechanical", "Engineer/Technician", "imran.s@zynelectrical.co.in", "+91 98450 11203", true],
  ["Prakash Gowda", "EMP-1202", "Mechanical", "Engineer/Technician", "prakash.g@zynelectrical.co.in", "+91 98450 11209", true],
  ["Deepak Yadav", "EMP-1203", "Electrical", "Engineer/Technician", "deepak.y@zynelectrical.co.in", "+91 98450 11215", true],
  ["Nitin Salunke", "EMP-1204", "Electrical", "Engineer/Technician", "nitin.s@zynelectrical.co.in", "+91 98450 11221", true],
  ["Sanjay Bhosale", "EMP-1205", "Mechanical", "Engineer/Technician", "sanjay.b@zynelectrical.co.in", "+91 98450 11226", true],
  ["Kiran Joshi", "EMP-1206", "ETP/WTP", "Engineer/Technician", "kiran.j@zynelectrical.co.in", "+91 98450 11232", true],
];

function usernameFor(name) {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).join(".");
}

export const DEFAULT_PASSWORD = "Ejt@2026";

export const USERS = USER_ROWS.map(([name, emp, dept, designation, email, mobile, active]) => ({
  username: usernameFor(name),
  name,
  emp,
  dept,
  designation,
  role: ROLE_OF_DESIGNATION[designation],
  email,
  mobile,
  active,
}));

// engineer who reviews notifications raised by each department
const ENG_OF = {
  Mechanical: "Anil Deshpande", Electrical: "Farid Qureshi", Boiler: "Anil Deshpande",
  "ETP/WTP": "Anil Deshpande", Admin: "Anil Deshpande", Milling: "Anil Deshpande", Parboiling: "Anil Deshpande",
};
export function engineerOf(dept) {
  return ENG_OF[dept] || "Anil Deshpande";
}

// [no, date, time, raisedBy, dept, location, job, description, nature, priority, status, woNo]
export const NT_SEED = [
["NT-2026-00412", "2026-09-19", "07:42", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Belt Conveyor / BC4 / Belt Conveyor", "Conveyor bearing replacement", "Drive-end bearing on C-4 belt conveyor running hot and squealing. Temperature gun reads 82 °C against a normal 45 °C. Belt stopped to avoid seizure.", "Breakdown", "Critical", "Converted to Work Order", "WO-2026-00458"],
["NT-2026-00411", "2026-09-19", "06:15", "Jagdish Rao", "Boiler", "Boiler / Boiler Section / Boiler / ID Fan", "Boiler ID fan vibration inspection", "ID fan vibration climbing over the last three shifts, audible rumble at full load. Needs vibration check before the next husk firing cycle.", "Inspection", "High", "Converted to Work Order", "WO-2026-00457"],
["NT-2026-00410", "2026-09-18", "22:05", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Socking / HOT WATER TANK -3", "Steam trap leaking at soaking tank 3", "Steam trap on soaking tank 3 blowing through continuously. Steam loss is visible at the header and soaking temperature is dropping.", "Breakdown", "High", "Converted to Work Order", "WO-2026-00456"],
["NT-2026-00409", "2026-09-18", "16:30", "Sunita Nair", "ETP", "ETP / ETP Section / ETP / Air Blower For AQT-2 (EQT-2)", "ETP aerator motor tripping on overload", "Surface aerator 2 trips on overload within ten minutes of start. DO level in the aeration tank has fallen to 0.9 mg/l.", "Breakdown", "Critical", "Converted to Work Order", "WO-2026-00455"],
["NT-2026-00408", "2026-09-18", "14:12", "Vikram Shetty", "Warehouse", "Admin / Admin Section / Admin Section / Technical store", "Warehouse shutter roller jammed", "Rolling shutter at despatch bay 2 jams halfway. Being forced open manually by loaders, which is unsafe during loading.", "Corrective Maintenance", "Medium", "Under Review", ""],
["NT-2026-00407", "2026-09-18", "11:48", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Polisher / DRPG 'A' / DRPG", "Polisher motor overheating", "Silky polisher motor body too hot to touch after 40 minutes of running. Suspected winding problem or blocked cooling fins.", "Breakdown", "High", "Converted to Work Order", "WO-2026-00454"],
["NT-2026-00406", "2026-09-17", "19:20", "Farid Qureshi", "Electrical", "Powerhouse / Powerhouse Section / PCC / PCC Panels", "MCC panel thermography inspection", "Quarterly thermography of MCC-1 and MCC-2 feeders due. Last scan flagged a warm link on the milling feeder that needs re-checking.", "Preventive Maintenance", "Medium", "Converted to Work Order", "WO-2026-00453"],
["NT-2026-00405", "2026-09-17", "15:05", "Anand Kamble", "Security", "Admin / Admin Section / Admin Section / Security gate - 1", "CCTV camera at main gate not recording", "Camera 4 covering the weigh bridge approach shows live feed but no recording since Monday. Truck entries are not being captured.", "Breakdown", "Medium", "Raised", ""],
["NT-2026-00404", "2026-09-17", "10:35", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Drying / DRYER-2 BLOWER", "Dryer blower belt replacement", "Blower belts on dryer 2 are cracked and slipping. Drying cycle time has increased by roughly 20 minutes per batch.", "Corrective Maintenance", "Medium", "Converted to Work Order", "WO-2026-00452"],
["NT-2026-00403", "2026-09-16", "09:10", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Destoner / MTSD 100/1200 'B' / MTSD Destoner", "Destoner screen choked repeatedly", "Destoner screen chokes twice per shift with husk and dust. Needs screen inspection and possibly a mesh change.", "Corrective Maintenance", "Medium", "Accepted", ""],
["NT-2026-00402", "2026-09-16", "08:00", "Jagdish Rao", "Boiler", "Boiler / Boiler Section / Boiler / Feed Water Pump - 1", "Feed water pump mechanical seal replacement", "Boiler feed pump 1 leaking at the seal, roughly a drop per second, wetting the base frame. Standby pump in service.", "Breakdown", "Critical", "Converted to Work Order", "WO-2026-00451"],
["NT-2026-00401", "2026-09-15", "17:25", "Lata Hegde", "Residence", "Admin / Admin Section / Admin Section / Admin/Residency", "Quarters B-4 geyser not heating", "Geyser in staff quarters B-4 not heating. Element suspected.", "Corrective Maintenance", "Low", "Rejected", ""],
["NT-2026-00400", "2026-09-15", "13:40", "Sunita Nair", "ETP", "ETP / ETP Section / ETP / Coagulant Dosing Pump-1 (CDS-1)", "Dosing pump diaphragm leak", "Alum dosing pump leaking at the diaphragm head. Dosing rate is inconsistent and chemical is dripping onto the plinth.", "Breakdown", "High", "Converted to Work Order", "WO-2026-00450"],
["NT-2026-00399", "2026-09-14", "20:15", "Vikram Shetty", "Warehouse", "Admin / Admin Section / Admin Section / WeighBridge", "Weigh bridge load cell showing error", "Weigh bridge indicator shows E-04 intermittently and weights drift by 40–60 kg between passes. Truck weighments are being done manually.", "Breakdown", "High", "Converted to Work Order", "WO-2026-00449"],
["NT-2026-00398", "2026-09-13", "11:05", "Anand Kamble", "Security", "Boiler / Boiler Section / WTP / Fire Hydrent Pump", "Fire hydrant jockey pump not building pressure", "Jockey pump runs continuously without holding hydrant line pressure at 7 kg/cm². Safety risk flagged to the safety committee.", "Breakdown", "Critical", "Closed", "WO-2026-00448"],
["NT-2026-00397", "2026-09-12", "09:50", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Bagging / Cable / Wiring", "Bagging section lighting repair", "Six of the fourteen LED high bays in the bagging section are out. Operators cannot read bag markings on the night shift.", "Electrical", "Low", "Closed", "WO-2026-00447"],
["NT-2026-00396", "2026-09-11", "14:20", "Mohan Prabhu", "Admin", "Admin / Admin Section / Admin Section / Canteen", "Canteen exhaust fan noisy", "Kitchen exhaust fan making a loud rattle and vibrating the duct. Smoke is not clearing during lunch service.", "Corrective Maintenance", "Low", "Converted to Work Order", "WO-2026-00446"],
["NT-2026-00395", "2026-09-10", "08:30", "Jagdish Rao", "Boiler", "Boiler / Boiler Section / Boiler / Hopper Airlock", "Ash conveyor chain broken", "Bottom ash drag chain snapped at the tail end. Ash is being removed manually, which is slowing the boiler down.", "Breakdown", "High", "Closed", "WO-2026-00445"],
["NT-2026-00394", "2026-09-09", "16:45", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Bucket Elevator / SILO ELEVATOR-3", "Bucket elevator boot section fabrication", "Boot section plate of paddy elevator 3 has worn through and is leaking grain. Needs a new plate fabricated and welded.", "Fabrication", "Medium", "Converted to Work Order", "WO-2026-00444"],
["NT-2026-00393", "2026-09-08", "10:10", "Mohan Prabhu", "Admin", "Admin / Admin Section / Admin Section / Staff Rest Room", "Staff toilet water line leakage", "Supply line to the staff toilet block leaking at the junction, flooding the passage. Water is being wasted through the shift.", "Plumbing", "Low", "Closed", "WO-2026-00443"],
["NT-2026-00392", "2026-09-05", "07:55", "Farid Qureshi", "Electrical", "Powerhouse / Powerhouse Section / PCC / 11/0.415 KV Transformer", "Transformer oil level low", "Oil level in the 1000 kVA transformer conservator has dropped below the minimum mark on the gauge.", "Inspection", "High", "Closed", "WO-2026-00442"],
["NT-2026-00391", "2026-09-03", "12:30", "Sunita Nair", "ETP", "ETP / ETP Section / ETP / Raw Effluent Transfer Pump-1 (RETP-1)", "RECA pump suction line air lock", "RECA pump loses prime after every stoppage. Suction line is drawing air at the foot valve.", "Breakdown", "Medium", "Closed", "WO-2026-00441"],
["NT-2026-00390", "2026-09-02", "09:05", "Anil Deshpande", "Mechanical", "Admin / Admin Section / Admin Section / Technical store", "Workshop lathe chuck runout", "Lathe three-jaw chuck showing 0.6 mm runout, jobs coming out tapered.", "Corrective Maintenance", "Low", "Closed", "WO-2026-00440"],
["NT-2026-00389", "2026-08-28", "15:40", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Hulling / DRSD-IV 'B'", "Rubber roll sheller excessive vibration", "Sheller 2 vibrating heavily at full feed, shelling efficiency down to about 78%.", "Breakdown", "High", "Closed", "WO-2026-00439"],
["NT-2026-00388", "2026-08-26", "11:15", "Jagdish Rao", "Boiler", "Boiler / Boiler Section / WTP / Softner Pump - 1", "Softener backwash valve stuck", "Multiport valve on softener 1 stuck in backwash, feed water hardness rising above 5 ppm.", "Corrective Maintenance", "Medium", "Closed", "WO-2026-00438"],
["NT-2026-00387", "2026-08-22", "08:20", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Socking / HOT WATER TANK -1", "Soaking tank level sensor faulty", "Level transmitter on soaking tank 1 reading full at all times, overflow risk during filling.", "Electrical", "Medium", "Closed", "WO-2026-00437"],
["NT-2026-00386", "2026-08-19", "17:10", "Farid Qureshi", "Electrical", "Powerhouse / Powerhouse Section / Generator / Utility DG", "DG set weekly load test", "Scheduled weekly on-load test of the 750 kVA DG set with load bank readings.", "Preventive Maintenance", "Low", "Closed", "WO-2026-00436"],
["NT-2026-00385", "2026-08-14", "10:45", "Vikram Shetty", "Warehouse", "Admin / Admin Section / Admin Section / Technical store", "Paddy unloading hopper grill welding", "Hopper grill bars bent and two are broken, bags are falling through during unloading.", "Fabrication", "Medium", "Closed", "WO-2026-00435"],
["NT-2026-00384", "2026-08-11", "13:25", "Sunita Nair", "ETP", "ETP / ETP Section / ETP / Filter Feed Pump-1", "Sludge pump impeller worn", "Sludge transfer pump discharge down to about half, impeller suspected worn by grit.", "Breakdown", "High", "Closed", "WO-2026-00434"],
["NT-2026-00383", "2026-08-07", "09:35", "Anil Deshpande", "Mechanical", "Powerhouse / Powerhouse Section / Air Compressor / Air Dryer - 1", "Compressor air dryer PM", "Refrigerated air dryer service due — condenser cleaning, drain trap check and filter change.", "Preventive Maintenance", "Low", "Closed", "WO-2026-00433"],
["NT-2026-00382", "2026-08-04", "16:00", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Paddy separator / MGCZ Paddy separator", "Paddy cleaner aspirator duct modification", "Aspirator duct on the pre-cleaner chokes with light husk. Duct angle needs modification to improve suction.", "Modification", "Medium", "Closed", "WO-2026-00432"],
["NT-2026-00381", "2026-07-29", "14:05", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Bucket Elevator / BIN ELEVATOR-4", "Paddy elevator 2 belt slipping", "Elevator belt slipping under load, buckets returning half empty.", "Breakdown", "High", "Closed", "WO-2026-00431"],
["NT-2026-00380", "2026-07-24", "08:50", "Farid Qureshi", "Electrical", "Powerhouse / Powerhouse Section / PCC / RMU", "HT panel relay testing", "Annual secondary injection testing of HT panel protection relays due for statutory compliance.", "Inspection", "Medium", "Closed", "WO-2026-00430"],
["NT-2026-00379", "2026-07-18", "12:40", "Mohan Prabhu", "Admin", "Admin / Admin Section / Admin Section / Canteen", "Canteen RO unit filter replacement", "RO unit filters due for replacement, TDS at the outlet has risen to 180 ppm.", "Preventive Maintenance", "Low", "Closed", "WO-2026-00429"],
["NT-2026-00378", "2026-07-11", "10:20", "Jagdish Rao", "Boiler", "Boiler / Utility Section / Water", "Drain line civil repair near boiler", "Drain channel alongside the boiler house has cracked and water is pooling near the feed pump plinth.", "Civil", "Low", "Closed", "WO-2026-00428"],
["NT-2026-00377", "2026-07-05", "15:30", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Bagging / Packing Machine-1", "New bag stitching machine installation", "New bag stitching machine received, needs mounting, power connection and trial run at the bagging point.", "Installation", "Medium", "Closed", "WO-2026-00427"],
["NT-2026-00376", "2026-06-27", "09:15", "Sunita Nair", "ETP", "ETP / ETP Section / ETP / Air Blower For AA-1 (EQT-3)", "Cooling tower fan gearbox oil change", "Gearbox oil change due on cooling tower fan as per the 2000-hour schedule.", "Preventive Maintenance", "Low", "Closed", "WO-2026-00426"],
["NT-2026-00375", "2026-06-19", "11:50", "Anil Deshpande", "Mechanical", "Admin / Admin Section / Admin Section / Technical store", "Welding rectifier earth cable damaged", "Earth cable insulation on the 400 A rectifier is cut in two places, shock hazard for the welders.", "Electrical", "Medium", "Closed", "WO-2026-00425"],
["NT-2026-00374", "2026-06-12", "07:30", "Vikram Shetty", "Warehouse", "Admin / Admin Section / Admin Section / Technical store", "Warehouse ventilator fan bearing noise", "Roof ventilator fan bearing noisy, likely dry. Fan may seize if left as is.", "Corrective Maintenance", "Low", "Closed", "WO-2026-00424"],
["NT-2026-00373", "2026-06-04", "13:10", "Anand Kamble", "Security", "Admin / Admin Section / Admin Section / Security gate - 2", "Security cabin AC not cooling", "Split AC in the weigh bridge cabin blowing warm air, gas leak suspected.", "Corrective Maintenance", "Low", "Closed", "WO-2026-00423"],
["NT-2026-00372", "2026-05-22", "10:05", "Ravi Kulkarni", "Milling", "Milling / Milling Section / Grader / BRAN Tip Separator A", "Grader sieve replacement", "Length grader sieves worn, broken rice separation has fallen off specification.", "Preventive Maintenance", "Medium", "Closed", "WO-2026-00422"],
["NT-2026-00371", "2026-05-09", "08:40", "Jagdish Rao", "Boiler", "Boiler / Boiler Section / Boiler / Air Compressor", "Boiler safety valve testing", "Statutory safety valve set-pressure testing due before the inspector's visit.", "Inspection", "High", "Closed", "WO-2026-00421"],
["NT-2026-00370", "2026-04-25", "16:20", "Farid Qureshi", "Electrical", "Powerhouse / Powerhouse Section / PCC / PDB Panels", "Capacitor bank contactor replacement", "Two capacitor bank steps not switching in, power factor has dropped to 0.87.", "Breakdown", "High", "Closed", "WO-2026-00420"],
["NT-2026-00369", "2026-04-10", "09:00", "Meena Patil", "Parboiling", "Parboiling / Parboiling Section / Drying / DRYER-1 ROTOR", "Husk fired furnace grate repair", "Furnace grate bars burnt through in the centre, husk is falling into the ash pit unburnt.", "Fabrication", "Medium", "Closed", "WO-2026-00419"],
];

// [woNo, notifNo, workDept, assignedTo, plannedStart, plannedEnd, actualStart, actualEnd, status, workDone, spares, remarks, completedBy]
export const WO_SEED = [
["WO-2026-00458","NT-2026-00412","Mechanical","Imran Shaikh","2026-09-19 09:00","2026-09-19 15:00","2026-09-19 09:20","","In Progress","","","Line stopped, hot work permit taken.",""],
["WO-2026-00457","NT-2026-00411","Mechanical","Prakash Gowda","2026-09-20 06:00","2026-09-20 12:00","","","Assigned","","","Vibration meter to be drawn from the workshop store.",""],
["WO-2026-00456","NT-2026-00410","Mechanical","Sanjay Bhosale","2026-09-19 08:00","2026-09-19 13:00","2026-09-19 08:15","","In Progress","","","Header isolated, trap being removed for inspection.",""],
["WO-2026-00455","NT-2026-00409","Electrical","Deepak Yadav","2026-09-19 10:00","2026-09-19 18:00","","","Assigned","","","Megger test planned before restart.",""],
["WO-2026-00454","NT-2026-00407","Electrical","Nitin Salunke","2026-09-18 14:00","2026-09-19 12:00","2026-09-18 14:30","","On Hold","Winding inspected, insulation resistance low on two phases.","","Held for a rewound spare motor from the Hubli vendor, expected 21-Sep.",""],
["WO-2026-00453","NT-2026-00406","Electrical","","2026-09-22 09:00","2026-09-22 17:00","","","Pending","","","Awaiting assignment — thermography camera booked for 22-Sep.",""],
["WO-2026-00452","NT-2026-00404","Mechanical","Prakash Gowda","2026-09-20 08:00","2026-09-20 14:00","","","Assigned","","","Belts issued from store against requisition 4412.",""],
["WO-2026-00451","NT-2026-00402","Mechanical","Imran Shaikh","2026-09-16 10:00","2026-09-17 16:00","2026-09-16 10:40","","In Progress","Pump decoupled, old seal removed and shaft sleeve measured.","","Sleeve wear within limits, new seal being fitted.",""],
["WO-2026-00450","NT-2026-00400","ETP/WTP","Kiran Joshi","2026-09-15 15:00","2026-09-16 13:00","2026-09-15 15:20","2026-09-16 11:05","Completed","Diaphragm and check valves replaced on the alum dosing pump, dosing rate re-calibrated to 4.2 l/h.","Diaphragm kit PDK-32 (1 no.), suction/discharge valve set (1 set)","Awaiting closure by the engineering supervisor.","Kiran Joshi"],
["WO-2026-00449","NT-2026-00399","Electrical","Deepak Yadav","2026-09-15 09:00","2026-09-16 17:00","2026-09-15 09:30","","On Hold","Junction box opened, load cell 3 shows an open circuit.","","Held pending the OEM service engineer's visit for cell replacement and re-calibration.",""],
["WO-2026-00448","NT-2026-00398","Mechanical","Imran Shaikh","2026-09-13 12:00","2026-09-13 18:00","2026-09-13 12:15","2026-09-13 17:40","Closed","Jockey pump non-return valve replaced and the foot valve cleaned. Hydrant line pressure held at 7.2 kg/cm² for 30 minutes.","NRV 40 mm (1 no.), gland packing (1 set)","Verified with the safety officer; hydrant log updated.","Imran Shaikh"],
["WO-2026-00447","NT-2026-00397","Electrical","Nitin Salunke","2026-09-12 14:00","2026-09-12 19:00","2026-09-12 14:10","2026-09-12 18:20","Closed","Six LED high bay fittings replaced and the bagging section circuit re-tested. Lux level measured at 210 lux at bag height.","LED high bay 150 W (6 nos.), cable lugs","Old fittings returned to the store as scrap.","Nitin Salunke"],
["WO-2026-00446","NT-2026-00396","Mechanical","Sanjay Bhosale","2026-09-12 09:00","2026-09-12 15:00","2026-09-12 09:05","2026-09-12 13:50","Completed","Exhaust fan impeller balanced, worn bearings replaced and the duct hanger re-clamped.","Bearing 6204 ZZ (2 nos.)","Noise level down; awaiting closure after two days of observation.","Sanjay Bhosale"],
["WO-2026-00445","NT-2026-00395","Mechanical","Prakash Gowda","2026-09-10 10:00","2026-09-10 20:00","2026-09-10 10:20","2026-09-10 19:15","Closed","Broken drag chain links replaced, chain tension reset and the tail sprocket alignment corrected.","Drag chain links (8 nos.), tail sprocket (1 no.)","Boiler back to full firing at 19:40.","Prakash Gowda"],
["WO-2026-00444","NT-2026-00394","Mechanical","Sanjay Bhosale","2026-09-18 08:00","2026-09-20 17:00","2026-09-18 08:30","","In Progress","Boot plate cut out and the new 6 mm MS plate rolled to profile.","MS plate 6 mm (1.2 m²), welding electrodes 3.15 mm","Fit-up planned after the shift change.",""],
["WO-2026-00443","NT-2026-00393","Admin","Sanjay Bhosale","2026-09-08 11:00","2026-09-08 16:00","2026-09-08 11:15","2026-09-08 15:10","Closed","Leaking GI junction replaced with a CPVC section and the line pressure tested.","CPVC pipe 25 mm (3 m), elbows and solvent cement","Passage dried and cleared.","Sanjay Bhosale"],
["WO-2026-00442","NT-2026-00392","Electrical","Deepak Yadav","2026-09-05 09:00","2026-09-05 14:00","2026-09-05 09:10","2026-09-05 12:30","Closed","Transformer topped up with 40 litres of filtered oil; BDV tested at 58 kV. No leak found at the radiator joints.","Transformer oil (40 l), gasket set","Oil test report filed with the electrical records.","Deepak Yadav"],
["WO-2026-00441","NT-2026-00391","Mechanical","Imran Shaikh","2026-09-03 14:00","2026-09-03 19:00","2026-09-03 14:20","2026-09-03 18:05","Closed","Foot valve replaced and the suction line joints re-sealed. Pump held prime through three start-stop cycles.","Foot valve 100 mm (1 no.), teflon tape","No further air lock reported.","Imran Shaikh"],
["WO-2026-00440","NT-2026-00390","Mechanical","","2026-09-03 09:00","2026-09-03 17:00","","","Cancelled","","","Cancelled — duplicate of the workshop AMC job already scheduled with the OEM.",""],
["WO-2026-00439","NT-2026-00389","Mechanical","Imran Shaikh","2026-08-29 08:00","2026-08-29 18:00","2026-08-29 08:20","2026-08-29 17:10","Closed","Rubber rolls replaced as a pair, roll gap set to 0.6 mm and the drive belt tension corrected.","Rubber roll 10 inch (2 nos.), V-belt B-75 (2 nos.)","Shelling efficiency back to 92% on trial.","Imran Shaikh"],
["WO-2026-00438","NT-2026-00388","Boiler","Prakash Gowda","2026-08-26 13:00","2026-08-26 18:00","2026-08-26 13:20","2026-08-26 17:00","Closed","Multiport valve dismantled, seals replaced and the regeneration cycle run twice.","Seal kit MPV-40 (1 set)","Hardness back to 2 ppm after regeneration.","Prakash Gowda"],
["WO-2026-00437","NT-2026-00387","Electrical","Nitin Salunke","2026-08-22 10:00","2026-08-22 15:00","2026-08-22 10:10","2026-08-22 14:05","Closed","Level transmitter replaced and re-ranged 0–3 m, loop checked against the tank sight glass.","Level transmitter LT-30 (1 no.)","Calibration certificate filed.","Nitin Salunke"],
["WO-2026-00436","NT-2026-00386","Electrical","Deepak Yadav","2026-08-19 18:00","2026-08-19 21:00","2026-08-19 18:05","2026-08-19 20:30","Closed","DG set run on load for two hours at 80% load. Frequency, voltage and coolant temperature within limits.","","Log sheet attached; next test due 26-Aug.","Deepak Yadav"],
["WO-2026-00435","NT-2026-00385","Mechanical","Sanjay Bhosale","2026-08-14 12:00","2026-08-14 18:00","2026-08-14 12:20","2026-08-14 17:30","Closed","Broken grill bars cut out and new 25 mm MS bars welded in, edges ground and painted.","MS square bar 25 mm (12 m), electrodes","Hopper back in service the same shift.","Sanjay Bhosale"],
["WO-2026-00434","NT-2026-00384","ETP/WTP","Kiran Joshi","2026-08-11 14:00","2026-08-12 13:00","2026-08-11 14:15","2026-08-12 11:40","Closed","Pump opened, worn impeller and wear plate replaced, discharge restored to 18 m³/h.","Impeller SP-80 (1 no.), wear plate (1 no.), gland packing","Grit trap cleaning added to the weekly checklist.","Kiran Joshi"],
["WO-2026-00433","NT-2026-00383","Mechanical","Prakash Gowda","2026-08-07 10:00","2026-08-07 14:00","2026-08-07 10:05","2026-08-07 13:15","Closed","Condenser coil cleaned, auto drain trap serviced and the line filter element replaced.","Filter element AF-25 (1 no.)","Dew point back to 4 °C.","Prakash Gowda"],
["WO-2026-00432","NT-2026-00382","Mechanical","Sanjay Bhosale","2026-08-05 08:00","2026-08-06 17:00","2026-08-05 08:20","2026-08-06 16:10","Closed","Aspirator duct re-angled to 35° and a cleanout door added near the bend.","MS sheet 3 mm (2 m²), hinges and latch","Choking not reported in the following week.","Sanjay Bhosale"],
["WO-2026-00431","NT-2026-00381","Mechanical","Imran Shaikh","2026-07-29 15:00","2026-07-29 20:00","2026-07-29 15:10","2026-07-29 19:20","Closed","Elevator belt re-laced, tension reset and two damaged buckets replaced.","Belt fastener set, elevator buckets (2 nos.)","Bucket discharge back to normal.","Imran Shaikh"],
["WO-2026-00430","NT-2026-00380","Electrical","Deepak Yadav","2026-07-24 09:00","2026-07-24 18:00","2026-07-24 09:15","2026-07-24 17:25","Closed","Secondary injection testing completed on all HT protection relays, trip timings within the set curve.","","Test report submitted to the electrical inspector.","Deepak Yadav"],
["WO-2026-00429","NT-2026-00379","Admin","Kiran Joshi","2026-07-18 14:00","2026-07-18 17:00","2026-07-18 14:10","2026-07-18 16:20","Closed","Sediment, carbon and RO membrane filters replaced and the unit flushed.","Filter set RO-3 (1 set), membrane 75 GPD (1 no.)","Outlet TDS measured at 42 ppm.","Kiran Joshi"],
["WO-2026-00428","NT-2026-00378","Admin","Sanjay Bhosale","2026-07-12 08:00","2026-07-13 17:00","2026-07-12 08:15","2026-07-13 15:40","Closed","Cracked drain channel broken out and re-cast in M20 concrete with a fresh slope towards the pit.","Cement (6 bags), sand and aggregate, MS mesh","Cured for seven days before full load.","Sanjay Bhosale"],
["WO-2026-00427","NT-2026-00377","Mechanical","Prakash Gowda","2026-07-06 09:00","2026-07-06 18:00","2026-07-06 09:10","2026-07-06 16:45","Closed","Stitching machine mounted on the bagging platform, power drawn from the local DB and trial run of 50 bags completed.","Cable 2.5 sq mm (20 m), MCB 16 A (1 no.)","Operator training done on the same day.","Prakash Gowda"],
["WO-2026-00426","NT-2026-00376","ETP/WTP","Kiran Joshi","2026-06-27 10:00","2026-06-27 14:00","2026-06-27 10:05","2026-06-27 13:10","Closed","Gearbox oil drained and refilled with 12 litres of EP-320, breather cleaned.","Gear oil EP-320 (12 l)","Next change due at 2000 running hours.","Kiran Joshi"],
["WO-2026-00425","NT-2026-00375","Electrical","Nitin Salunke","2026-06-19 13:00","2026-06-19 16:00","2026-06-19 13:10","2026-06-19 15:05","Closed","Damaged earth cable replaced end to end and the earth pit resistance measured at 1.8 ohm.","Earth cable 35 sq mm (15 m), lugs","Welders briefed before restart.","Nitin Salunke"],
["WO-2026-00424","NT-2026-00374","Mechanical","Prakash Gowda","2026-06-12 09:00","2026-06-12 13:00","2026-06-12 09:20","2026-06-12 12:15","Closed","Ventilator fan bearings replaced and the shaft greased.","Bearing 6205 (2 nos.), grease","Noise gone on trial run.","Prakash Gowda"],
["WO-2026-00423","NT-2026-00373","Admin","Nitin Salunke","2026-06-04 15:00","2026-06-04 18:00","2026-06-04 15:10","2026-06-04 17:30","Closed","Leak found at the flare joint, repaired and the system charged with R-32 gas.","R-32 refrigerant (1.2 kg)","Cabin temperature down to 24 °C.","Nitin Salunke"],
["WO-2026-00422","NT-2026-00372","Mechanical","Imran Shaikh","2026-05-22 12:00","2026-05-22 18:00","2026-05-22 12:15","2026-05-22 17:20","Closed","Length grader sieves replaced as a set and the indent pocket cleaned.","Grader sieve set (1 set)","Broken rice back within specification on the next run.","Imran Shaikh"],
["WO-2026-00421","NT-2026-00371","Boiler","Prakash Gowda","2026-05-09 10:00","2026-05-09 16:00","2026-05-09 10:10","2026-05-09 15:00","Closed","Both safety valves tested and reset to 10.5 and 11.0 kg/cm², witnessed by the boiler inspector.","Valve seat lapping compound","Certificate issued by the inspector.","Prakash Gowda"],
["WO-2026-00420","NT-2026-00370","Electrical","Deepak Yadav","2026-04-25 17:00","2026-04-26 13:00","2026-04-25 17:15","2026-04-26 11:50","Closed","Two capacitor step contactors replaced and the APFC controller re-programmed.","Contactor 63 A (2 nos.)","Power factor restored to 0.98.","Deepak Yadav"],
["WO-2026-00419","NT-2026-00369","Mechanical","Sanjay Bhosale","2026-04-10 10:00","2026-04-11 17:00","2026-04-10 10:20","2026-04-11 16:00","Closed","Burnt grate bars cut out and new cast bars fitted, furnace refractory patched around the grate.","Grate bars (14 nos.), refractory castable (50 kg)","Furnace fired after 24 hours of curing.","Sanjay Bhosale"],
];
