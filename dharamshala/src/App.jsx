// App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";

/* ============================
   🔧 Firebase config (your app)
   ============================ */
const firebaseConfig = {
  apiKey: "AIzaSyDhzHQXw-XxxpKrBGr_RuG8FyJaAkOGKg8",
  authDomain: "dharamshala-6a25e.firebaseapp.com",
  projectId: "dharamshala-6a25e",
  storageBucket: "dharamshala-6a25e.appspot.com",
  messagingSenderId: "596835846095",
  appId: "1:596835846095:web:61961941b000c00ef6f4ba",
  measurementId: "G-M6E1X808LP",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/* ============================
   📋 Fixed Inventory (your list)
   ============================ */
const AT = [7, 8, 9, 10, 11, 15, 17, 18, 21, 22, 23, 24, 34, 35, 36, 45, 46, 47, 56, 57, 58, 59];
const AC = [4, 5, 6, 20, 19, 37, 48, 52, 53, 54, 55];
const NAT = [1, 2, 3, 12, 13, 14, 25, 26, 27, 28, 29, 30, 31, 32, 33, 38, 39, 44, 49, 50, 51];

const FIXED_ROOMS = [
  ...AT.map((n) => ({ number: n, tag: "AT", attach: "Attached", type: "Non-AC" })),
  ...AC.map((n) => ({ number: n, tag: "AC", attach: "Attached", type: "AC" })),
  ...NAT.map((n) => ({ number: n, tag: "NAT", attach: "Non-Attached", type: "Non-AC" })),
].sort((a, b) => a.number - b.number);

/* ============================
   UI / Status themes
   ============================ */
const STATUS_META = {
  Empty: { dot: "bg-gray-300", bg: "bg-white dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700" },
  Interested: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700" },
  Booked: { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700" },
};

/* ============================
   MAIN APP
   ============================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  const admins = ["adityasikarvar2502@gmail.com"]; // change/add emails here
  const isAdmin = !!(user && admins.includes(user.email));

  /* --- seed fixed rooms into Firestore (non-destructive) --- */
  const seedRooms = async () => {
    try {
      const snap = await getDocs(collection(db, "rooms"));
      const existing = new Set(snap.docs.map((d) => Number(d.id)));
      const batch = writeBatch(db);

      FIXED_ROOMS.forEach((r) => {
        if (!existing.has(r.number)) {
          batch.set(doc(db, "rooms", String(r.number)), {
            number: r.number,
            tag: r.tag,
            attach: r.attach,
            type: r.type,
            status: "Empty",
            bookedTill: "",
            note: "",
            updatedAt: Date.now(),
          });
        }
      });

      await batch.commit();
    } catch (e) {
      console.error("Seeding error:", e);
      setError("Failed to seed rooms. Check Firestore rules / network.");
    }
  };

  /* --- auth listener --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /* --- live subscription to rooms --- */
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "rooms"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.number - b.number);
        setRooms(list);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setError("Failed to load rooms (live updates).");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    seedRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- auth helpers --- */
  const handleSignIn = async () => {
    setError("");
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); setError("Login failed."); }
  };
  const handleSignOut = async () => {
    setError("");
    try { await signOut(auth); } catch (e) { console.error(e); setError("Sign out failed."); }
  };

  /* --- update a room (admins only will succeed due to rules) --- */
  const updateRoom = async (roomNumber, data) => {
    setError("");
    try {
      await updateDoc(doc(db, "rooms", String(roomNumber)), { ...data, updatedAt: Date.now() });
    } catch (e) {
      console.error("Update error:", e);
      setError("Could not update room. Check permission / network.");
    }
  };

  /* convenience map for rendering current state */
  const roomsMap = useMemo(() => {
    const m = new Map();
    rooms.forEach((r) => m.set(Number(r.number), r));
    return m;
  }, [rooms]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏨</div>
            <div>
              <h1 className="text-2xl font-semibold">Dharamshala</h1>
              <div className="text-xs text-gray-500 dark:text-gray-300">Fixed room map</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-sm text-gray-700 dark:text-gray-200">{user.email}</div>
                <button onClick={handleSignOut} className="px-3 py-1 rounded-md bg-rose-500 text-white text-sm">Logout</button>
              </>
            ) : (
              <button onClick={handleSignIn} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">Login</button>
            )}
          </div>
        </div>
      </header>

      {/* error banner */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="rounded-md border border-red-200 bg-red-50 text-red-800 p-3 text-sm flex items-start gap-3">
            <div>⚠️</div>
            <div className="flex-1">{error}</div>
            <button onClick={() => setError("")} className="text-xs underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Grid and legend section */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Legend />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Click a tile to view/update</div>
        </div>

        {/* Seat-map style grid */}
        <div className="mx-auto" style={{ maxWidth: 460 }}>
          <div className="grid grid-cols-6 gap-2">
            {FIXED_ROOMS.map((meta) => {
              const r = roomsMap.get(meta.number) || meta;
              return (
                <RoomTile
                  key={meta.number}
                  data={r}
                  onOpen={() => setSelectedRoom(r)}
                />
              );
            })}
          </div>
        </div>
      </main>

      {/* Room sheet (right side) */}
      {selectedRoom && (
        <RoomSheet
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onSave={async (payload) => {
            if (!isAdmin) { setError("Only admins can update rooms."); return; }
            if (payload.status === "Booked" && !payload.bookedTill) { setError("Booked requires a date."); return; }
            await updateRoom(selectedRoom.number, payload);
            setSelectedRoom(null);
          }}
          isAdmin={isAdmin}
        />
      )}

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-gray-500 dark:text-gray-400">
        <p>Tip: This is a minimal seat-map UI — subtle interactions, clean look.</p>
      </footer>
    </div>
  );
}

/* ============================
   RoomTile: compact seat-like tile
   ============================ */
function RoomTile({ data = {}, onOpen = () => {} }) {
  const status = data.status || "Empty";
  const meta = STATUS_META[status] || STATUS_META.Empty;
  return (
    <button
      aria-label={`Room ${data.number || "?"}, ${data.type || ""}, ${status}`}
      onClick={() => onOpen(data)}
      className={`relative aspect-square rounded-md p-2 overflow-hidden border ${meta.bg} ${meta.border} transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400`}
      title={`Room ${data.number}`}
    >
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="text-xs font-semibold">{`#${data.number}`}</div>
        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{data.tag || ""}</div>

        {/* status dot */}
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${meta.dot} border border-white dark:border-gray-800`} />

        {/* note pill */}
        {data.note && (
          <div className="absolute bottom-2 left-2 right-2 px-1.5 py-0.5 text-[10px] truncate rounded bg-white/90 dark:bg-gray-900/70 border text-gray-700 dark:text-gray-100">
            {data.note.length > 20 ? data.note.slice(0, 18) + "…" : data.note}
          </div>
        )}
      </div>
    </button>
  );
}

/* ============================
   RoomSheet: right-side panel to edit
   ============================ */
function RoomSheet({ room, onClose, onSave, isAdmin }) {
  const [status, setStatus] = useState(room.status || "Empty");
  const [bookedTill, setBookedTill] = useState(room.bookedTill || "");
  const [note, setNote] = useState(room.note || "");
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const handleSave = async () => {
    setLocalErr("");
    if (!isAdmin) { setLocalErr("Only admins can update rooms."); return; }
    if (status === "Booked" && !bookedTill) { setLocalErr("Please set 'Booked Till' date."); return; }
    try {
      setSaving(true);
      await onSave({ status, bookedTill: status === "Booked" ? bookedTill : "", note });
    } catch (e) {
      console.error(e);
      setLocalErr("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ml-auto w-full max-w-sm h-full bg-white dark:bg-gray-800 shadow-xl border-l">
        <div className="p-4 border-b">
          <div className="text-sm text-gray-500">Room</div>
          <div className="text-xl font-semibold">#{room.number}</div>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-500">Details</div>
          <div className="text-xs">
            <div><strong>Type:</strong> {room.type}</div>
            <div><strong>Attach:</strong> {room.attach}</div>
            <div><strong>Tag:</strong> {room.tag}</div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2">Status</div>
            <div className="grid grid-cols-3 gap-2">
              {["Empty","Interested","Booked"].map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`px-2 py-2 text-sm rounded ${status===s ? "bg-gray-900 text-white" : "bg-white dark:bg-gray-700"}`} disabled={!isAdmin}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {status === "Booked" && (
            <div>
              <div className="text-xs font-medium mb-1">Booked Till</div>
              <input type="date" value={bookedTill} onChange={(e) => setBookedTill(e.target.value)} className="border rounded p-2 w-full" disabled={!isAdmin} />
            </div>
          )}

          <div>
            <div className="text-xs font-medium mb-1">Note</div>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="border rounded p-2 w-full" disabled={!isAdmin} placeholder="short note (name/phone/time)..." />
          </div>

          {localErr && <div className="text-red-600 text-sm">{localErr}</div>}
        </div>

        <div className="mt-auto p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} disabled={saving || !isAdmin} className="px-3 py-2 bg-green-600 text-white rounded">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================
   Legend
   ============================ */
function Legend() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-xs">
        <div className="w-3 h-3 rounded-sm bg-gray-300 border border-white" />
        <div className="text-xs">Empty</div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <div className="w-3 h-3 rounded-sm bg-amber-500" />
        <div className="text-xs">Interested</div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <div className="text-xs">Booked</div>
      </div>
    </div>
  );
}
