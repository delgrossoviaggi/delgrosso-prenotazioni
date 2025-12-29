import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const col = collection(db, "bookings");

export async function addBooking(data) {
  await addDoc(col, { ...data, createdAt: serverTimestamp() });
}

export async function listBookings(limitTo = 500) {
  const q = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.slice(0, limitTo).map(d => ({ id: d.id, ...d.data() }));
}

export async function getOccupiedSeatsByTripKey(tripKey) {
  const q = query(col, where("tripKey", "==", tripKey));
  const snap = await getDocs(q);
  const occ = new Set();
  snap.docs.forEach(d => {
    const b = d.data();
    (b.seats || []).forEach(s => occ.add(Number(s)));
  });
  return occ;
}
