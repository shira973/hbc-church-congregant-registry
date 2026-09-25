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
  sex: { en: "Sex", grt: "Sal.gipa/Sal.gitchi" },
  dob: { en: "Date of Birth", grt: "Jonema Salo" },
  phone: { en: "Phone (optional)", grt: "Phone (gaba)" },
  fatherName: { en: "Father's Name", grt: "Apa'ni Bimung" },
  motherName: { en: "Mother's Name", grt: "Ma'ni Bimung" },
  baptismDate: { en: "Date of Baptism", grt: "Baptisma Salo" },
  baptizedBy: { en: "Baptized By", grt: "Baptisma Enchakni" },

  permanentAddress: { en: "Permanent Address", grt: "Fixed-a Address" },
  state: { en: "State", grt: "State" },
  townCityVillage: { en: "Town / City / Village", grt: "Aro/Song" },
  district: { en: "District", grt: "District" },
  locality: { en: "Locality", grt: "Locality" },
  houseNumber: { en: "House Number", grt: "Nok Number" },
  houseName: { en: "House Name", grt: "Nok Bimung" },
  pinCode: { en: "PIN Number", grt: "PIN Number" },

  temporaryAddress: { en: "Temporary Address", grt: "Gimin-a Address" },
  guardianCaretaker: {
    en: "Guardian / Caretaker",
    grt: "Cha·chatnikgipa",
  },

  previousConvention: {
    en: "Previous Convention",
    grt: "Bimung ra'baa banoni",
  },
  transitingToConvention: {
    en: "Transiting To Convention",
    grt: "Biming ra'anfa banona",
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
