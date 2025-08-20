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
const NAT = [1, 2, 3, 12, 13, 14,16, 25, 26, 27, 28, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42, 43, 44, 49, 50, 51];

const FIXED_ROOMS = [
  ...AT.map((n) => ({ number: n, tag: "AT", attach: "Attached", type: "Non-AC" })),
  ...AC.map((n) => ({ number: n, tag: "AC", attach: "Attached", type: "AC" })),
  ...NAT.map((n) => ({ number: n, tag: "NAT", attach: "Non-Attached", type: "Non-AC" })),
].sort((a, b) => a.number - b.number);

/* ============================
   UI / Status themes
   ============================ */
const STATUS_META = {
  Empty: { 
    bg: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", 
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-600 dark:text-gray-300",
    dot: "bg-gray-400",
    icon: "🏠"
  },
  Interested: { 
    bg: "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30", 
    border: "border-amber-200 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    icon: "👀"
  },
  Booked: { 
    bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30", 
    border: "border-green-200 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
    icon: "✅"
  },
};

/* ============================
   MAIN APP
   ============================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRoom, setEditingRoom] = useState(null);

  const admins = ["adityasikarvar2502@gmail.com","dharmeshsikarvar@gmail.com"]; // change/add emails here
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
            peopleCount: 0,
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
    try { 
      await signInWithPopup(auth, provider); 
    } catch (e) { 
      console.error(e); 
      setError("Login failed."); 
    }
  };

  const handleSignOut = async () => {
    setError("");
    try { 
      await signOut(auth); 
      setEditingRoom(null);
    } catch (e) { 
      console.error(e); 
      setError("Sign out failed."); 
    }
  };

  /* --- update a room (admins only will succeed due to rules) --- */
  const updateRoom = async (roomNumber, data) => {
    setError("");
    try {
      await updateDoc(doc(db, "rooms", String(roomNumber)), { 
        ...data, 
        updatedAt: Date.now() 
      });
      setEditingRoom(null);
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

  /* filtered rooms for display */
  const filteredRooms = useMemo(() => {
    let filtered = FIXED_ROOMS.map((meta) => {
      const r = roomsMap.get(meta.number) || meta;
      return { ...meta, ...r };
    });

    if (filterStatus !== "all") {
      filtered = filtered.filter(room => room.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(room => 
        room.number.toString().includes(searchTerm) ||
        room.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.note && room.note.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [roomsMap, filterStatus, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = { Empty: 0, Interested: 0, Booked: 0 };
    rooms.forEach(room => {
      if (counts.hasOwnProperty(room.status)) {
        counts[room.status]++;
      }
    });
    return counts;
  }, [rooms]);

  useEffect(() => {
    if (!isAdmin) return; // Only admins can auto-clear
    const now = new Date();
    rooms.forEach(room => {
      if (
        room.status === "Booked" &&
        room.bookedTill &&
        new Date(room.bookedTill).setHours(23,59,59,999) < now
      ) {
        // Auto-clear: set to Empty
        updateRoom(room.number, {
          status: "Empty",
          note: "",
          bookedTill: "",
          peopleCount: 0
        });
      }
    });
    // eslint-disable-next-line
  }, [rooms, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏨</div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Dharamshala
                </h1>
                <div className="text-sm text-gray-500 dark:text-gray-400">Room Management System</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="text-right">
                    <div className="text-sm font-medium">{user.displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isAdmin ? "Admin" : "Viewer"} • {user.email}
                    </div>
                  </div>
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                  <button 
                    onClick={handleSignOut} 
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleSignIn} 
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </div>

          {/* Stats and Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <StatsBadge label="Empty" count={statusCounts.Empty} color="gray" />
                <StatsBadge label="Interested" count={statusCounts.Interested} color="amber" />
                <StatsBadge label="Booked" count={statusCounts.Booked} color="green" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-48"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="all">All Rooms</option>
                <option value="Empty">Empty Only</option>
                <option value="Interested">Interested Only</option>
                <option value="Booked">Booked Only</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 flex items-center gap-3">
            <div className="text-xl">⚠️</div>
            <div className="flex-1">{error}</div>
            <button 
              onClick={() => setError("")} 
              className="text-sm px-3 py-1 rounded bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Room Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.number}
              room={room}
              isAdmin={isAdmin}
              onUpdate={updateRoom}
              isEditing={editingRoom === room.number}
              onEdit={(roomNumber) => setEditingRoom(roomNumber)}
              onCancelEdit={() => setEditingRoom(null)}
            />
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 dark:text-gray-400">No rooms match your current filters.</p>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 pb-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Dharamshala Room Management • {rooms.length} Total Rooms
        </p>
      </footer>
    </div>
  );
}

/* ============================
   Stats Badge Component
   ============================ */
function StatsBadge({ label, count, color }) {
  const colorClasses = {
    gray: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
  };

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses[color]}`}>
      {label}: {count}
    </div>
  );
}

/* ============================
   Enhanced Room Card Component
   ============================ */
function RoomCard({ room, isAdmin, onUpdate, isEditing, onEdit, onCancelEdit }) {
  const [localStatus, setLocalStatus] = useState(room.status || "Empty");
  const [localNote, setLocalNote] = useState(room.note || "");
  const [localBookedTill, setLocalBookedTill] = useState(room.bookedTill || "");
  const [localPeopleCount, setLocalPeopleCount] = useState(room.peopleCount || 0);
  const [saving, setSaving] = useState(false);

  const status = room.status || "Empty";
  const meta = STATUS_META[status];

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setSaving(true);
    try {
      const payload = {
        status: localStatus,
        note: localStatus === "Empty" ? "" : localNote,
        bookedTill: localStatus === "Booked" ? localBookedTill : "",
        peopleCount: localStatus === "Empty" ? 0 : localPeopleCount
      };
      
      await onUpdate(room.number, payload);
      onCancelEdit();
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalStatus(room.status || "Empty");
    setLocalNote(room.note || "");
    setLocalBookedTill(room.bookedTill || "");
    setLocalPeopleCount(room.peopleCount || 0);
    onCancelEdit();
  };

  return (
    <div className={`relative rounded-xl border-2 ${meta.border} ${meta.bg} p-4 transition-all duration-200 hover:shadow-lg hover:scale-102 transform`}>
      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${meta.dot}`}></div>
        <span className="text-lg">{meta.icon}</span>
      </div>

      {/* Room info */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-xl font-bold">#{room.number}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${meta.text} bg-white/50 dark:bg-gray-800/50`}>
            {room.tag}
          </span>
        </div>
        <div className="text-sm opacity-75">
          {room.type} • {room.attach}
          {room.peopleCount > 0 && room.status !== "Empty" && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
              👥 {room.peopleCount} people
            </span>
          )}
        </div>
      </div>

      {/* Status and booking info */}
      <div className="mb-3">
        {!isEditing ? (
          <>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${meta.text} bg-white/50 dark:bg-gray-800/50 mb-2`}>
              {status}
            </div>
            {room.bookedTill && status === "Booked" && (
              <div className="text-xs opacity-75">
                Until: {formatDMY(room.bookedTill)}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1">
              {["Empty", "Interested", "Booked"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setLocalStatus(s);
                    // Auto-clear data when setting to Empty
                    if (s === "Empty") {
                      setLocalNote("");
                      setLocalPeopleCount(0);
                      setLocalBookedTill("");
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    localStatus === s
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80"
                  }`}
                  disabled={saving}
                >
                  {s}
                </button>
              ))}
            </div>
            
            {localStatus === "Booked" && (
              <input
                type="date"
                value={localBookedTill}
                onChange={(e) => setLocalBookedTill(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                disabled={saving}
              />
            )}
            
            {(localStatus === "Interested" || localStatus === "Booked") && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  👥 People:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLocalPeopleCount(Math.max(0, localPeopleCount - 1))}
                    disabled={saving || localPeopleCount <= 0}
                    className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 text-xs font-bold disabled:opacity-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={localPeopleCount}
                    onChange={(e) => setLocalPeopleCount(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="10"
                    className="w-12 px-1 py-1 text-xs text-center rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setLocalPeopleCount(Math.min(10, localPeopleCount + 1))}
                    disabled={saving || localPeopleCount >= 10}
                    className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 text-xs font-bold disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note section */}
      <div className="mb-3">
        {!isEditing ? (
          // Display notes only for non-empty rooms
          room.note && room.status !== "Empty" ? (
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Note:</div>
              <div className="text-sm">{room.note}</div>
            </div>
          ) : (
            room.status === "Empty" ? (
              <div className="text-xs text-gray-400 italic">Room is empty</div>
            ) : (
              <div className="text-xs text-gray-400 italic">No notes</div>
            )
          )
        ) : (
          // Edit mode - show note input only for non-empty rooms
          localStatus !== "Empty" ? (
            <textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="Add a note (name, phone, etc.)"
              rows={2}
              className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
              disabled={saving}
            />
          ) : (
            <div className="text-xs text-gray-400 italic">Empty rooms don't need notes</div>
          )
        )}
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => onEdit(room.number)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-800/70 text-sm font-medium hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (localStatus === "Booked" && !localBookedTill)}
                className="flex-1 px-3 py-1 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Last updated timestamp */}
      {room.updatedAt && (
        <div className="absolute bottom-1 right-2 text-xs text-gray-400">
          {new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

// Add this helper function at the top or bottom of your file:
function formatDMY(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
}