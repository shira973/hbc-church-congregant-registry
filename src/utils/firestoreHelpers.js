import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../firebaseConfig";
import mockMembersSeed from "../data/mockMembers.json";

/**
 * DATA MODEL (single Firestore collection: "members")
 * One document = one congregation member. Admins are just members with
 * isAdmin = true. This avoids a separate admins collection and keeps
 * "promote a member to admin" a single field update.
 *
 * {
 *   name, sex, dob, phone,
 *   fatherName, motherName,
 *   baptismDate, baptizedBy,
 *   address: {
 *     permanent: { state, townCityVillage, district, locality, houseNumber, houseName, pinCode },
 *     temporary: string,
 *     guardianCaretaker: string
 *   },
 *   previousConvention, transitingToConvention,
 *   dateOfDeath,            // admin-only field
 *   dateOfDiscontinuation,
 *   dateOfReborn,
 *   dateOfRejoin,
 *   remarks,                // admin-only field
 *
 *   isAdmin: boolean,             // default false
 *   position: string,             // default "Congregant"
 *   email: string,                // admins only, used for OTP delivery
 *   createdAt, updatedAt
 * }
 */

const MEMBERS = "members";
const OTPS = "otps"; // short-lived OTP docs, keyed by phone
const USE_LOCAL_MOCK_DATA = true;
const LOCAL_MEMBERS_KEY = "hbcrb_mock_members";

async function readMockMembers() {
  const stored = await AsyncStorage.getItem(LOCAL_MEMBERS_KEY);
  if (stored !== null) return JSON.parse(stored);

  const seed = mockMembersSeed.map((member) => ({ ...member }));
  await AsyncStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(seed));
  return seed;
}

async function writeMockMembers(members) {
  await AsyncStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
}

export const DEFAULT_MEMBER = {
  name: "",
  sex: "",
  dob: "",
  phone: "",
  fatherName: "",
  motherName: "",
  baptismDate: "",
  baptizedBy: "",
  address: {
    permanent: {
      state: "",
      townCityVillage: "",
      district: "",
      locality: "",
      houseNumber: "",
      houseName: "",
      pinCode: "",
    },
    temporary: "",
    guardianCaretaker: "",
  },
  previousConvention: "",
  transitingToConvention: "",
  isDeceased: false,
  dateOfDeath: "",
  dateOfDiscontinuation: "",
  dateOfReborn: "",
  dateOfRejoin: "",
  remarks: "",
  isAdmin: false,
  position: "Congregant",
};

export async function createMember(data) {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    members.push({
      ...DEFAULT_MEMBER,
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    });
    await writeMockMembers(members);
    return id;
  }

  const payload = {
    ...DEFAULT_MEMBER,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, MEMBERS), payload);
  return ref.id;
}

export async function updateMember(memberId, data) {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    const memberIndex = members.findIndex((member) => member.id === memberId);
    if (memberIndex < 0) throw new Error("Member not found in local mock data.");
    members[memberIndex] = {
      ...members[memberIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await writeMockMembers(members);
    return;
  }

  const ref = doc(db, MEMBERS, memberId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function getMember(memberId) {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    return members.find((member) => member.id === memberId) || null;
  }

  const snap = await getDoc(doc(db, MEMBERS, memberId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listMembers() {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    return members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  const q = query(collection(db, MEMBERS), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function findMemberByPhone(phone) {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    return members.find((member) => member.phone === phone) || null;
  }

  const q = query(collection(db, MEMBERS), where("phone", "==", phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function promoteToAdmin(memberId, { position, phone }) {
  const updates = { isAdmin: true, position: position || "Admin" };
  if (phone) updates.phone = phone;
  await updateMember(memberId, updates);
}

export async function listAdmins() {
  if (USE_LOCAL_MOCK_DATA) {
    const members = await readMockMembers();
    return members.filter((member) => member.isAdmin === true);
  }

  const q = query(collection(db, MEMBERS), where("isAdmin", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Analytics: counts by year and sex for deaths / baptisms, plus totals.
 * Pulled client-side over the members list — fine at congregation scale
 * (hundreds-low thousands of docs, well under the free-tier read quota).
 */
export function computeAnalytics(members) {
  const byYearSex = (dateField) => {
    const result = {}; // { year: { M: n, F: n } }
    members.forEach((m) => {
      const raw = m[dateField];
      if (!raw) return;
      const year = new Date(raw).getFullYear();
      if (Number.isNaN(year)) return;
      result[year] = result[year] || { M: 0, F: 0 };
      const sexKey = (m.sex || "").toLowerCase().startsWith("f") ? "F" : "M";
      result[year][sexKey] += 1;
    });
    return result;
  };

  const totalBaptized = members.reduce(
    (acc, m) => {
      if (!m.baptismDate) return acc;
      const sexKey = (m.sex || "").toLowerCase().startsWith("f") ? "F" : "M";
      acc[sexKey] += 1;
      return acc;
    },
    { M: 0, F: 0 }
  );
  const totalDeceased = members.reduce(
    (acc, member) => {
      if (!member.isDeceased && !member.dateOfDeath) return acc;
      const sexKey = (member.sex || "").toLowerCase().startsWith("f") ? "F" : "M";
      acc[sexKey] += 1;
      return acc;
    },
    { M: 0, F: 0 }
  );

  return {
    deathsByYear: byYearSex("dateOfDeath"),
    baptismsByYear: byYearSex("baptismDate"),
    totalBaptized,
    totalDeceased,
  };
}

export { MEMBERS, OTPS };
