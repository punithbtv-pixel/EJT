// Plant → Main Section → Sub-Section → Equipment / Location reference data,
// ported from the sibling MIS project's data/Daily Act.xlsx (via
// src/lib/maintenanceLog.js) so both apps describe the plant the same way.
// This is fixed reference data, not an admin-editable master list.

export const OTHER = "Other";

export const PLANT_TREE = {
  Milling: {
    general: ["Milling Area", "Office", "Wearhouse"],
    utility: ["Electric supply", "Water", "Compressor Air", "UPS / Invertor", "P_M Paddy Bridge"],
    categories: {
      "Electrical Panel": ["CP", "CM - 1", "CM - 2", "CM - 3", "LCP - 1", "LCP - 2", "LCP - 3", "Junction Box", "Cable / Wiring", "Sensor"],
      "Pneumatic": ["Solenoid Valve", "Cylinder", "Air Connector", "Air Pipe", "Regulator", "Valve", "Divertor", "Slide Gate", "Cable / Wiring", "Sensor"],
      "Chain conveyor": ["CC1 / Chain conveyor", "CC2 / Chain conveyor", "CC3 / Chain conveyor", "Sensor", "Cable / Wiring"],
      "Bucket Elevator": ["E1 / Bucket Elevator", "E2 / Bucket Elevator", "E3 / Bucket Elevator", "E4 / Bucket Elevator", "E5 / Bucket Elevator", "E6 / Bucket Elevator", "E7 / Bucket Elevator", "E8 / Bucket Elevator", "E9 / Bucket Elevator", "E10 / Bucket Elevator", "E11 / Bucket Elevator", "E12 / Bucket Elevator", "E13 / Bucket Elevator", "E14 / Bucket Elevator", "E15 / Bucket Elevator", "E16 / Bucket Elevator", "E17 / Bucket Elevator", "E18 / Bucket Elevator", "E19 / Bucket Elevator", "E20 / Bucket Elevator", "E21 / Bucket Elevator", "E22 / Bucket Elevator", "E23 / Bucket Elevator", "E24 / Bucket Elevator", "E25 / Bucket Elevator", "E26 / Bucket Elevator", "E27 / Bucket Elevator", "E28 / Bucket Elevator", "E29 / Bucket Elevator", "E30 / Bucket Elevator", "E31 / Bucket Elevator", "E32 / Bucket Elevator", "E33 / Bucket Elevator", "E34 / Bucket Elevator", "E35 / Bucket Elevator", "E36 / Bucket Elevator", "E37 / Bucket Elevator", "Sensor", "Cable / Wiring"],
      "Screw Conveyor": ["SC1 / Screw Conveyor", "SC2 / Screw Conveyor", "SC3 / Screw Conveyor", "SC4 / Screw Conveyor", "SC5 / Screw Conveyor", "SC6 / Screw Conveyor", "SC7 / Screw Conveyor", "SC8 / Screw Conveyor", "SC9 / Screw Conveyor", "SC10 / Screw Conveyor", "SC11 / Screw Conveyor", "SC12 / Screw Conveyor", "SC13 / Screw Conveyor", "SC-14 / Conveyor", "SF-1 / Screw Conveyor", "SF-2 / Screw Conveyor", "SF-3 / Screw Conveyor", "Sensor", "Cable / Wiring"],
      "Belt Conveyor": ["BC1 / Belt Conveyor", "BC2 / Belt Conveyor", "BC3 / Belt Conveyor", "BC4 / Belt Conveyor", "BC5 / Belt Conveyor", "BC6 / Belt Conveyor", "BC7 / Belt Conveyor", "BC8 / Belt Conveyor", "Sensor", "Cable / Wiring"],
      "Classifier": ["MVSF 100G 'A' / MVSF Aspiration", "MVSF 100G 'B' / MVSF Aspiration", "MVSE-150 / MVSE Aspiration", "MTRAClassifier MTRA100/200 DL B", "MVSE-150G / MVSE Aspiration", "MTRAClassifier MTRA100/200", "Sensor", "Cable / Wiring"],
      "Destoner": ["MTSD 100/1200 'B' / MTSD Destoner", "SAP- DE-Stoner-1", "SAP- DE-Stoner-2", "SAP RICE DE-STONER", "Sensor", "Cable / Wiring"],
      "Cyclone": ["Airlock - for (FAN-1)", "FAN-1", "AIRLOCK- for MPSN (FAN-2)", "FAN-2", "AIRLOCK - for MPSN (FAN-3)", "FAN-3", "Airlock- For MPSN (FAN-4)", "Fan-4", "Airlock- MPSN (FAN-5)", "FAN-5", "Airlock- MPSN (FAN-6)", "FAN-6", "Airlock- For MPS (FAN-7)", "Fan-7", "Airlock- MPSN (FAN-8)", "FAN-8", "Airlock- MPS (FAN-9)", "FAN-9", "Airlock- MPS (FAN-10)", "FAN-10", "Airlock (FAN-11)", "FAN-11", "Sensor", "Cable / Wiring"],
      "Hulling": ["DRSD-IV 'A'", "DRSD-IV 'B'", "DRSD-IV 'C'", "DRSD-IV 'D'", "Sensor", "Cable / Wiring"],
      "Husk blower": ["Husk blower", "Airlock-For Husk Hopper", "Sensor", "Cable / Wiring"],
      "Paddy separator": ["MGCZ Paddy separator", "Sensor", "Cable / Wiring"],
      "Online Scale": ["Paddy Scale", "Bran Scale", "Head Rice Scale", "Broken Flow Balance -1", "Broken Flow Balance -2", "Head Flow Balance -1", "Head Flow Balance -2", "Sensor", "Cable / Wiring"],
      "Whitener": ["DRWA'A' / DRWAUltrawhite", "DRWA'B' / DRWAUltrawhite", "DRWA'C' / DRWAUltrawhite", "DRWA'D' / DRWAUltrawhite", "Sensor", "Cable / Wiring"],
      "Polisher": ["DRPG 'A' / DRPG", "DRPG 'A' / DRPG Water pump", "DRPG 'B' / DRPG", "DRPG 'B' / DRPG Water pump", "DRPG 'C' / DRPG", "DRPG 'C' / DRPG Water pump", "Sensor", "Cable / Wiring"],
      "Indent cylinder": ["Indent Cylinder- DRIV LADB, UN-401/9 A", "Indent Cylinder- DRIV LADB, UN-401/9 B", "Indent Cylinder LADB, UN-401/9 C", "Indent Cylinder LADB, UN-401/9 D", "Indent Cylinder SAP Granderr A", "Indent Cylinder SAP Granderr B", "Indent Cylinder SAP Granderr C", "Indent Cylinder SAP Granderr D", "Sensor", "Cable / Wiring"],
      "Sorting": ["Sortex-R500", "Sortex-Spark Pro 10_A", "Sortex-SPARK PRO-7_A", "Sortex-Spark Pro 10_B", "Sortex-SPARK PRO-7_B", "Sensor", "Cable / Wiring"],
      "Silos / Bins": ["Silo -1", "Bin-1", "Bin-2", "Bin-3", "Bin-4", "Bin-5", "Bin-6", "Bin-7", "Bin-8", "Bin-9", "Bin-10", "Bin-11", "Bin-12", "Bin-13", "Broken Rice Bin-14", "Head Rice Bin-15", "Primary Bin-16", "Primary Bin-17", "Secondary Bin-18", "HR Tertiary Bin-19", "BR Primary Bin-20", "BR Secondary Bin-21", "Bin-22", "Broken Rice packing Bin-23", "BR1 Bin-24", "BR2 Bin-25", "HR1 Bin-26", "HR2 Bin-27", "Packing Bin-28", "Packing Bin-29", "Primary Bin-30", "Secondary Bin-31", "Tertiary Bin-32", "Sensor", "Cable / Wiring"],
      "Grader": ["BRAN Tip Separator A", "BRAN Tip Separator B", "Sensor", "Cable / Wiring"],
      "Bran": ["Elevator", "Screw conveyor", "Bran Shifter -1", "Bran Shifter -2", "Sensor", "Cable / Wiring"],
      "Bagging": ["Packing Machine-1", "Packing Machine-2", "Packing Machine-3", "Packing Machine-4", "Wood Conveyor", "Sensor", "Cable / Wiring"],
    },
  },
  Parboiling: {
    general: [],
    utility: ["Electric supply", "Water", "Steem", "Compressor Air"],
    categories: {
      "Electrical Panel": ["Control Room Panel", "Dryer MCC Panel", "Dryer PLC Panel", "Socking Panel", "Pre-Cleaning Panel", "Cable / Wiring", "Sensor"],
      "Pneumatic": ["Solenoid Valve", "Cylinder", "Air Connector", "Air Pipe", "Control Valve", "Regulator", "Valve", "Divertor", "Slide Gate", "Actuator", "Cable / Wiring", "Sensor"],
      "Chain conveyor": ["CHAIN CONVEYOR-1", "CHAIN CONVEYOR-2", "Cable / Wiring", "Sensor"],
      "Bucket Elevator": ["PRE-CLEANER-1 ELEVATOR-1", "PRE-CLEANER-2 ELEVATOR-2", "PRE-CLEANER-3 ELEVATOR-1A", "PRE-CLEANER-3 ELEVATOR-2A", "PRE-CLEANER-3 ELEVATOR-3A", "SILO ELEVATOR-3", "BIN ELEVATOR-4", "POST STEAMING ELEVATOR-5", "DRYER-1 ELEVATOR-6", "DRYER-2 ELEVATOR-7", "DRYER-3 ELEVATOR-8", "DRYER-4 ELEVATOR-9", "TOWER ELEVATOR-10", "DRYER-5 ELEVATOR-11", "DRYER-6 ELEVATOR-12", "DRYER-7 ELEVATOR-13", "DRYER-8 ELEVATOR-14", "TOWER ELEVATOR-15", "FINAL SILO ELEVATOR-16", "DRYER UNLOADING ELEVATOR-17", "Cable / Wiring", "Sensor"],
      "Belt Conveyor": ["BELT CONVEYOR -1", "BELT CONVEYOR -2", "BELT CONVEYOR-3", "BELT CONVEYOR-4", "BELT CONVEYOR-5", "BELT CONVEYOR-6", "BELT CONVEYOR-7", "BELT CONVEYOR-8", "Cable / Wiring", "Sensor"],
      "Pre-Cleaning": ["PRE CLEANER-1", "DESTONER -1", "DESTONER -2", "DESTONER BLOWER", "DESTONER AIRLOCK", "DRUM SIEVE", "PRE CLEANER-3", "PRE-CLEANER -3 BLOWER", "PRE-CLEANER -3 AIRLOCK", "Cable / Wiring", "Sensor"],
      "Socking": ["HOT WATER TANK -1", "HOT WATER TANK -2", "HOT WATER TANK -3", "MANUAL FEEDING PUMP-1", "MANUAL FEEDING PUMP-2", "MANUAL FEEDING PUMP-3", "MANUAL FEEDING PUMP-4", "MANUAL FEEDING PUMP-5", "MANUAL FEEDING PUMP-6", "HOT WATER TANK FEEDING PUMP-8", "HOT WATER TANK FEEDING PUMP-9", "HOT WATER TANK FEEDING PUMP-10", "HOT WATER TANK FEEDING PUMP-11", "RTD", "Cable / Wiring", "Sensor"],
      "ONC": ["ONC AIRLOCK-1", "ONC AIRLOCK-2", "Cable / Wiring", "Sensor"],
      "Drying": ["DRYER-1 ROTOR", "DRYER-1 BLOWER", "DRYER-2 ROTOR", "DRYER-2 BLOWER", "DRYER-3 ROTOR", "DRYER-3 BLOWER", "DRYER-4 ROTOR", "DRYER-4 BLOWER", "DRYER-5 ROTOR", "DRYER-5 BLOWER", "DRYER-6 ROTOR", "DRYER-6 BLOWER", "DRYER-7 ROTOR", "DRYER-7 BLOWER", "DRYER-8 ROTOR", "DRYER-8 BLOWER", "RTD", "Cable / Wiring", "Sensor"],
      "Silo / Bins": ["Silo-1", "Silo-2", "Silo-3", "Silo-4", "Socking Tank Bin", "ONC Bin", "Cable / Wiring", "Sensor"],
    },
  },
  Boiler: {
    general: [],
    utility: ["Electric supply", "Water", "Compressor Air"],
    categories: {
      "Electrical Panel": ["Boiler Control Room Panel", "WTP Control Panel", "Softner Control Panel", "Fire Hydrent Panel", "Cable / Wiring", "Sensor"],
      "Pneumatic": ["Solenoid Valve", "Cylinder", "Air Connector", "Air Pipe", "Control Valve", "Regulator", "Valve", "Divertor", "Slide Gate", "Actuator", "Cable / Wiring", "Sensor"],
      "Boiler": ["ID Fan", "FD Fan - 1", "FD Fan - 2", "Feed Water Pump - 1", "Feed Water Pump - 2", "Feed Water Pump - 3", "Booster Fan - 1", "Booster Fan - 2", "Hopper Airlock", "Cyclomax Airlock", "APH Airlock", "Husk Feeder -1", "Husk Feeder -2", "Screw Feeder - 1", "Screw Feeder - 2", "Husk Elevator", "Air Compressor", "Sand Filter Motor - 1", "Sand Filter Motor - 2", "Cable / Wiring", "Sensor"],
      "WTP": ["Salt Mixer", "Softner Pump - 1", "Softner Pump - 2", "Raw Water Tank Pump - 1", "Raw Water Tank Pump - 2", "Hot Water Tank Pump -1", "Hot Water Tank Pump -2", "Hot Water Tank Pump -3", "Softner Tank Pump - 1", "New Softner transfer pump -1", "New Softner transfer pump -2", "New Softner transfer pump -3", "Fire Hydrent Pump", "Cable / Wiring", "Sensor"],
    },
  },
  ETP: {
    general: [],
    utility: ["Electric supply", "Water", "Compressor Air"],
    categories: {
      "Electrical Panel": ["ETP Control Panel", "Fire Hydrent Panel", "Cable / Wiring", "Sensor"],
      "Pneumatic": ["Solenoid Valve", "Cylinder", "Air Connector", "Air Pipe", "Regulator", "Valve", "Actuator", "Cable / Wiring", "Sensor"],
      "ETP": ["Raw Effluent Transfer Pump-1 (RETP-1)", "Raw Effluent Transfer Pump-2 (RETP-2)", "Coagulant Dosing Pump-1 (CDS-1)", "Coagulant Dosing Pump-2 (CDS-2)", "Coagulant Dosing Pump-3 (CDS-3)", "Coagulant Dosing Pump-4 (CDS-4)", "Polymer Dosing Pump-1 (FDC-1)", "Polymer Dosing Pump-2 (FDC-2)", "Polymer Dosing Pump-2 (FDC-3)", "Polymer Dosing Pump-2 (FDC-4)", "Hypo Dosing Pump-1", "Hypo Dosing Pump-2", "Air Blower For AQT-1 (EQT-1)", "Air Blower For AQT-2 (EQT-2)", "Filter Feed Pump-1", "Filter Feed Pump-2", "Air Blower For AA-1 (EQT-3)", "Air Blower For AA-2 (EQT-4)", "Cable / Wiring", "Sensor"],
    },
  },
  Powerhouse: {
    general: [],
    utility: ["Electric supply", "Water", "Compressor Air"],
    categories: {
      "PCC": ["PCC Panels", "PDB Panels", "RMU", "HT Meetring", "33/11KV Transformer", "11/0.415 KV Transformer", "NEPA GOS", "Milling Stabilizer", "Parboiling Stabilizer", "Cable / Wiring", "Sensor"],
      "Generator": ["Milling DG", "Parboiling DG", "Admin DG", "Utility DG", "Diesel Storage", "Cable / Wiring", "Sensor"],
      "Air Compressor": ["AIR Compressor E75 - 1", "AIR Compressor E75 - 2", "AIR Compressor E75 - 3", "AIR Compressor E55 - 1", "Air Dryer - 1", "Air Dryer - 2", "Air Dryer - 3", "Cable / Wiring", "Sensor"],
    },
  },
  Admin: {
    general: [],
    utility: ["Electric supply", "Water"],
    categories: {
      "Area": ["Reseption", "First Aid", "GM Office", "IT Office", "MD Office", "ChairMan Office", "Account Office", "Conference Room", "1st Floor Residency", "2nd Floor Residency", "Cable / Wiring"],
      "Admin Section": ["Admin/Residency", "HR Office", "Technical store", "Masque", "REKA Storage", "Security gate - 1", "Security gate - 2", "Canteen", "WeighBridge", "Staff Rest Room"],
    },
  },
};

export const PLANTS = [...Object.keys(PLANT_TREE), OTHER];

function withExtras(list) {
  const withGeneral = list.includes("General") ? list : [...list, "General"];
  return withGeneral.includes(OTHER) ? withGeneral : [...withGeneral, OTHER];
}

export function sectionsForPlant(plant) {
  const tree = PLANT_TREE[plant];
  if (!tree) return [OTHER];
  const sections = [];
  if (tree.general.length) sections.push("General Section");
  sections.push("Utility Section");
  sections.push(`${plant} Section`);
  sections.push(OTHER);
  return sections;
}

// Only the main "<Plant> Section" is broken into sub-sections; General/Utility/Other
// stay flat. Returns null when the given section has no sub-section level.
export function categoriesForSection(plant, section) {
  const tree = PLANT_TREE[plant];
  if (!tree || section !== `${plant} Section`) return null;
  return [...Object.keys(tree.categories), OTHER];
}

export function equipmentForSection(plant, section, category) {
  const tree = PLANT_TREE[plant];
  if (!tree || section === OTHER) return [OTHER];
  let list;
  if (section === "General Section") list = tree.general;
  else if (section === "Utility Section") list = tree.utility;
  else if (category === OTHER) list = [];
  else list = tree.categories[category] ?? tree.categories[Object.keys(tree.categories)[0]] ?? [];
  return withExtras(list);
}

const SEP = " / ";

// Composes the picker's current selection into the single string stored on
// Notification.location / WorkOrder.location, e.g.
// "Milling / Milling Section / Bucket Elevator / E3 / Bucket Elevator".
export function composeLocation({ plant, section, category, equipment }) {
  return [plant, section, category, equipment].filter(Boolean).join(SEP);
}

// Splits a stored location string back into its path segments. Older
// records created before this hierarchy existed are a single flat token —
// callers should treat those as depth-1 (plant-only) paths.
export function parseLocationPath(location) {
  return String(location || "").split(SEP).filter(Boolean);
}
