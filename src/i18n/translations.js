// Inline (static, non-dynamic) translation map for the User Data Entry form.
// Add more languages by adding another key alongside "en" for each field.
// Toggle cycles through the keys in LANGUAGES below.

export const LANGUAGES = ["en", "grt"]; // en = English, grt = Garo (edit label below)

export const LANGUAGE_LABELS = {
  en: "English",
  grt: "A·chik",
};

export const FIELD_LABELS = {
  formTitle: {
    en: "Hawakhana Baptist Church Roll Book",
    grt: "Hawakhana Baptist Church Roll Book", // replace with translated title if desired
  },
  name: { en: "Name", grt: "Bimung" },
  sex: { en: "Sex", grt: "Sex" },
  dob: { en: "Date of Birth", grt: "Atchiani Sal" },
  phone: { en: "Phone (optional)", grt: "Phone" },
  fatherName: { en: "Father's Name", grt: "Pagipani Bimung" },
  motherName: { en: "Mother's Name", grt: "Ma'gipani Bimung" },
  baptismDate: { en: "Date of Baptism", grt: "Napolani Tarik" },
  baptizedBy: { en: "Baptized By", grt: "Sachi Napolata" },

  permanentAddress: { en: "Permanent Address", grt: "Permanent Address" },
  state: { en: "State", grt: "State" },
  townCityVillage: { en: "Town / City / Village", grt: "Town / City / Village" },
  district: { en: "District", grt: "District" },
  locality: { en: "Locality", grt: "Locality" },
  houseNumber: { en: "House Number", grt: "House Number" },
  houseName: { en: "House Name", grt: "House Name" },
  pinCode: { en: "PIN Number", grt: "PIN Number" },

  temporaryAddress: { en: "Temporary Address", grt: "Gimin-a Address" },
  guardianCaretaker: {
    en: "Guardian / Caretaker",
    grt: "Niroktimgipa / Caretaker",
  },

  previousConvention: {
    en: "Previous Convention",
    grt: "Bimung Ra'baa Banoni",
  },
  transitingToConvention: {
    en: "Transiting To Convention",
    grt: "Biming Ra'anga Banona",
  },

  dateOfDeath: { en: "Date of Death (admin only)", grt: "Jok Salo" },
  dateOfDiscontinuation: {
    en: "Date of Discontinuation",
    grt: "A'pal dona/gala",
  },
  dateOfReborn: { en: "Date of Reborn", grt: "Gisiko nie rimnapa" },
  dateOfRejoin: { en: "Date of Rejoin", grt: "Gisiko nie rimnapa" },
  remarks: { en: "Remarks (admin only)", grt: "Remarks" },

  save: { en: "Save", grt: "Save" },
  toggleLanguage: { en: "Switch Language", grt: "Ronga Sokdona" },
};

export function label(key, lang) {
  const entry = FIELD_LABELS[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
