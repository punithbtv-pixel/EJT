"use client";

import { Field, inputClass } from "@/components/ui";
import { PLANTS, sectionsForPlant, categoriesForSection, equipmentForSection, composeLocation } from "@/lib/locationTree";

export const emptyLocation = { plant: "", section: "", category: "", equipment: "" };

// Cascading Plant -> Main Section -> Sub-Section -> Equipment / Location
// picker. `value` is { plant, section, category, equipment }; the caller
// reads the final stored string with composeLocation(value).
export default function LocationPicker({ value, onChange }) {
  const { plant, section, category, equipment } = value;
  const sections = plant ? sectionsForPlant(plant) : [];
  const categories = plant && section ? categoriesForSection(plant, section) : null;
  const equipmentOptions = plant && section ? equipmentForSection(plant, section, category) : [];
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${categories ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
      <Field label="Plant" required>
        <select className={inputClass} value={plant} onChange={(e) => set({ plant: e.target.value, section: "", category: "", equipment: "" })}>
          <option value="">Select plant</option>
          {PLANTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Main section" required>
        <select className={inputClass} disabled={!plant} value={section} onChange={(e) => set({ section: e.target.value, category: "", equipment: "" })}>
          <option value="">Select section</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {categories && (
        <Field label="Sub-section" required>
          <select className={inputClass} disabled={!section} value={category} onChange={(e) => set({ category: e.target.value, equipment: "" })}>
            <option value="">Select sub-section</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      )}
      <Field label="Equipment / Location" required>
        <select className={inputClass} disabled={!section || (categories && !category)} value={equipment} onChange={(e) => set({ equipment: e.target.value })}>
          <option value="">Select equipment / location</option>
          {equipmentOptions.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </Field>
    </div>
  );
}

export { composeLocation };
