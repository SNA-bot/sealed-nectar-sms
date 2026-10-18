import React, { useState, useEffect, useRef } from "react";
import { Users, Wallet, ClipboardList, LogOut, Plus, Search, Trash2, ChevronRight, X, Check, AlertCircle, Lock, KeyRound, Printer, ArrowLeft, GraduationCap, Clock, HelpCircle, Upload, Download, Table, CreditCard } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import * as XLSX from "xlsx";
import { getItem, setItem, uploadPhoto } from "./lib/storage";

// ---------- Storage helpers ----------
const load = async (key, fallback) => {
  try {
    const value = await getItem(key);
    return value !== null && value !== undefined ? value : fallback;
  } catch {
    return fallback;
  }
};
const save = async (key, value) => {
  try {
    await setItem(key, value);
  } catch (e) {
    console.error("Storage error:", e);
  }
};

const uid = () => Math.random().toString(36).slice(2, 10);
const CLASSES = ["KG1", "KG2", "N1", "N2", "Basic1", "Basic2", "Basic3", "Basic4", "Basic5", "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const CLASS_GROUP = {
  KG1: "kg", KG2: "kg",
  N1: "nursery", N2: "nursery",
  Basic1: "basic", Basic2: "basic", Basic3: "basic", Basic4: "basic", Basic5: "basic",
  JSS1: "jss", JSS2: "jss", JSS3: "jss",
  SS1: "ss", SS2: "ss", SS3: "ss",
};
const KG_SUBJECTS = ["CLL", "N/Maths", "SED", "PSED", "CHL", "CCA", "Arabic", "Song/Rhyme", "KUW", "PHD"];
const NURSERY_SUBJECTS = ["CLL", "N/Maths", "SED", "SHD", "CHL", "Pre-Science", "Arabiyah", "Discovery", "CCA", "H/W", "Story", "Song & Rhyme"];
const BASIC_SUBJECTS = ["English Studies", "Mathematics", "BST", "NVE", "PVS", "Literature", "IRS", "Arabiyah", "Yoruba", "Agric Science", "Home Economics", "Civic Education", "Social Studies", "CCA", "ICT", "PHE", "Quantitative Aptitude", "Verbal Aptitude"];
const JSS_SUBJECTS = ["English Studies", "Mathematics", "BST", "CCA", "PHE", "ICT", "Social Studies", "Civic Education", "IRS", "Arabiyah", "Yoruba", "Business Studies", "Home Economics", "Agric Science"];
const SS_CORE = ["Mathematics", "English Language", "Civic Education"];
const TRADE_SUBJECTS = ["Electrical Installation", "Cosmetology", "Barbing & Hairdressing", "Data Processing", "Insurance", "Animal Husbandry", "Crop Husbandry", "Refrigeration"];
const DEPARTMENTS = ["STEM", "Business", "Humanities"];
const DEPARTMENT_SUBJECTS = {
  STEM: { prerequisite: ["Physics", "Chemistry", "Biology"], elective: ["Technical Drawing", "Economics", "Agric Science", "ICT"] },
  Business: { prerequisite: ["Account", "Commerce"], elective: ["Economics", "Yoruba", "Further Mathematics", "Marketing"] },
  Humanities: { prerequisite: ["Literature-in-English", "Yoruba", "IRS", "Government"], elective: ["Further Mathematics", "Economics", "Geography"] },
};
function subjectsForClass(className, department) {
  const group = CLASS_GROUP[className];
  if (group === "kg") return KG_SUBJECTS;
  if (group === "nursery") return NURSERY_SUBJECTS;
  if (group === "basic") return BASIC_SUBJECTS;
  if (group === "jss") return JSS_SUBJECTS;
  if (group === "ss") {
    const dept = DEPARTMENT_SUBJECTS[department];
    return dept ? [...SS_CORE, ...dept.prerequisite, ...dept.elective] : SS_CORE;
  }
  return [];
}
function subjectsForStudent(student) {
  const group = CLASS_GROUP[student.className];
  if (group !== "ss") return subjectsForClass(student.className, student.department);
  const dept = DEPARTMENT_SUBJECTS[student.department];
  if (!dept) return SS_CORE;
  const electives = (student.electives && student.electives.length) ? student.electives : dept.elective;
  const subjects = [...SS_CORE, ...dept.prerequisite, ...electives];
  if (student.tradeSubject) subjects.push(student.tradeSubject);
  return subjects;
}
const ALL_SUBJECTS = [...new Set([
  ...KG_SUBJECTS, ...NURSERY_SUBJECTS, ...JSS_SUBJECTS, ...SS_CORE,
  ...Object.values(DEPARTMENT_SUBJECTS).flatMap((d) => [...d.prerequisite, ...d.elective]),
  ...TRADE_SUBJECTS,
])];
const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const NEXT_CLASS = {
  KG1: "KG2", KG2: "N1", N1: "N2", N2: "Basic1",
  Basic1: "Basic2", Basic2: "Basic3", Basic3: "Basic4", Basic4: "Basic5", Basic5: "JSS1",
  JSS1: "JSS2", JSS2: "JSS3", JSS3: "SS1",
  SS1: "SS2", SS2: "SS3", SS3: "Graduated",
};

// Scoring model: classes that sit CBT (JSS & SS) split as C.A 40 + CBT 20 + Paper-based 40 = 100.
// Basic/Primary and below never sit CBT, so they split as C.A 40 + Paper-based 60 = 100.
function isCbtClass(className) {
  const group = CLASS_GROUP[className];
  return group === "jss" || group === "ss";
}
function theoryMaxFor(className) {
  return isCbtClass(className) ? 40 : 60;
}

function gradeFor(score) {
  const n = Number(score);
  if (n >= 70) return { grade: "A", remark: "Excellent" };
  if (n >= 60) return { grade: "B", remark: "Very Good" };
  if (n >= 50) return { grade: "C", remark: "Good" };
  if (n >= 45) return { grade: "D", remark: "Pass" };
  if (n >= 40) return { grade: "E", remark: "Fair" };
  return { grade: "F", remark: "Fail" };
}

function getCbtScore(studentId, subject, term, exams, examAttempts) {
  const examIds = exams.filter((e) => e.subject === subject && e.term === term).map((e) => e.id);
  if (examIds.length === 0) return null;
  const attempts = examAttempts.filter((a) => a.studentId === studentId && examIds.includes(a.examId));
  if (attempts.length === 0) return null;
  return Math.min(attempts.reduce((sum, a) => sum + Number(a.score || 0), 0), 20);
}
function resultTotal(result, cbt) {
  const ca = Number(result?.ca || 0);
  const theory = Number(result?.theory || 0);
  return ca + (cbt || 0) + theory;
}

function annualAverage(studentId, subjects, results, exams, examAttempts) {
  const perSubject = subjects.map((subj) => {
    const perTerm = TERMS.map((t) => {
      const r = results.find((rr) => rr.studentId === studentId && rr.subject === subj && rr.term === t);
      if (!r) return null;
      const cbt = getCbtScore(studentId, subj, t, exams, examAttempts);
      return resultTotal(r, cbt);
    }).filter((v) => v !== null);
    return perTerm.length ? perTerm.reduce((a, b) => a + b, 0) / perTerm.length : null;
  }).filter((v) => v !== null);
  return perSubject.length ? perSubject.reduce((a, b) => a + b, 0) / perSubject.length : null;
}

function ledgerFor(studentId, feeLedger) {
  return feeLedger.filter((e) => e.studentId === studentId).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
function ledgerTotals(entries) {
  const charged = entries.filter((e) => e.type === "charge").reduce((s, e) => s + Number(e.amount || 0), 0);
  const paid = entries.filter((e) => e.type === "payment").reduce((s, e) => s + Number(e.amount || 0), 0);
  return { charged, paid, balance: charged - paid };
}

async function hashCode(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await window.crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function compressImageToBlob(file, maxSize = 300, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize; } }
        else if (h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoUpload({ value, onChange, label, maxSize = 300, shape = "circle" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await compressImageToBlob(file, maxSize, 0.75);
      const url = await uploadPhoto(blob);
      if (url) onChange(url);
      else setError("Upload failed — try again.");
    } catch {
      setError("Couldn't process that image — try again.");
    }
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {value ? (
        <img src={value} alt={label} className={`w-14 h-14 object-cover border border-[#EFE9DA] ${shape === "circle" ? "rounded-full" : "rounded-md bg-white"}`} />
      ) : (
        <div className={`w-14 h-14 flex items-center justify-center bg-[#F5F1E6] text-[#6E8F80] text-[9px] text-center border border-dashed border-[#EFE9DA] ${shape === "circle" ? "rounded-full" : "rounded-md"}`}>{label}</div>
      )}
      <label className="text-xs text-[#0B4F3C] hover:underline cursor-pointer">
        {busy ? "Uploading…" : value ? "Change" : "Upload"}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={busy} />
      </label>
      {value && <button type="button" onClick={() => onChange("")} className="text-xs text-[#B0532B] hover:underline">Remove</button>}
      {error && <p className="w-full text-[10px] text-[#B0532B]">{error}</p>}
    </div>
  );
}

function Rosette({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0 L14.5 8 L22 5.5 L16.5 12 L22 18.5 L14.5 16 L12 24 L9.5 16 L2 18.5 L7.5 12 L2 5.5 L9.5 8 Z" />
    </svg>
  );
}
function StarField() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" preserveAspectRatio="xMidYMid slice">
      <pattern id="stars" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M30 12 L33.5 24 L46 20 L37 30 L46 40 L33.5 36 L30 48 L26.5 36 L14 40 L23 30 L14 20 L26.5 24 Z" fill="#C9A227" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#stars)" />
    </svg>
  );
}
const inputCls = "border border-[#EFE9DA] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227] bg-white";

// ---------- Root ----------
export default function App() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [fees, setFees] = useState([]);
  const [exams, setExams] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [theoryExams, setTheoryExams] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({ directorName: "", directorTitle: "Director of Studies", directorSignature: "", statement: "", phone: "", address: "Ota, Ogun State, Nigeria" });
  const [feeStructures, setFeeStructures] = useState([]);
  const [notes, setNotes] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [feeLedger, setFeeLedger] = useState([]);
  const [newsPosts, setNewsPosts] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [adminAuth, setAdminAuth] = useState(undefined);
  const [reportCard, setReportCard] = useState(null);
  const [broadsheet, setBroadsheet] = useState(null);
  const [idCardView, setIdCardView] = useState(null);
  const [billView, setBillView] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, t, a, r, f, aa, ex, ea, te, qb, ss, fs, nt, lc, fl, np, gp] = await Promise.all([
        load("students", []), load("teachers", []), load("attendance", []),
        load("results", []), load("fees", []), load("adminAuth", null),
        load("exams", []), load("examAttempts", []), load("theoryExams", []), load("questionBank", []),
        load("schoolSettings", { directorName: "", directorTitle: "Director of Studies", directorSignature: "", statement: "", phone: "", address: "Ota, Ogun State, Nigeria" }),
        load("feeStructures", []), load("notes", []), load("liveClasses", []), load("feeLedger", []),
        load("newsPosts", []), load("galleryPhotos", []),
      ]);
      setStudents(s); setTeachers(t); setAttendance(a); setResults(r); setFees(f); setAdminAuth(aa);
      setExams(ex); setExamAttempts(ea); setTheoryExams(te); setQuestionBank(qb);
      setSchoolSettings(ss); setFeeStructures(fs); setNotes(nt); setLiveClasses(lc);
      setNewsPosts(np); setGalleryPhotos(gp);
      if (fl.length === 0 && f.length > 0) {
        const migrated = [];
        f.forEach((rec) => {
          if (Number(rec.due) > 0) migrated.push({ id: uid(), studentId: rec.studentId, type: "charge", amount: rec.due, term: rec.term, description: `${rec.term} fees`, date: new Date().toISOString().slice(0, 10) });
          if (Number(rec.paid) > 0) migrated.push({ id: uid(), studentId: rec.studentId, type: "payment", amount: rec.paid, term: rec.term, description: "Migrated payment record", date: new Date().toISOString().slice(0, 10) });
        });
        setFeeLedger(migrated);
        save("feeLedger", migrated);
      } else {
        setFeeLedger(fl);
      }
      setLoading(false);
    })();
  }, []);

  const persist = {
    students: (v) => { setStudents(v); save("students", v); },
    teachers: (v) => { setTeachers(v); save("teachers", v); },
    attendance: (v) => { setAttendance(v); save("attendance", v); },
    results: (v) => { setResults(v); save("results", v); },
    fees: (v) => { setFees(v); save("fees", v); },
    adminAuth: (v) => { setAdminAuth(v); save("adminAuth", v); },
    exams: (v) => { setExams(v); save("exams", v); },
    examAttempts: (v) => { setExamAttempts(v); save("examAttempts", v); },
    theoryExams: (v) => { setTheoryExams(v); save("theoryExams", v); },
    questionBank: (v) => { setQuestionBank(v); save("questionBank", v); },
    schoolSettings: (v) => { setSchoolSettings(v); save("schoolSettings", v); },
    feeStructures: (v) => { setFeeStructures(v); save("feeStructures", v); },
    notes: (v) => { setNotes(v); save("notes", v); },
    liveClasses: (v) => { setLiveClasses(v); save("liveClasses", v); },
    feeLedger: (v) => { setFeeLedger(v); save("feeLedger", v); },
    newsPosts: (v) => { setNewsPosts(v); save("newsPosts", v); },
    galleryPhotos: (v) => { setGalleryPhotos(v); save("galleryPhotos", v); },
  };

  const logout = () => { setRole(null); setSession(null); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B4F3C]">
        <div className="text-[#C9A227] flex flex-col items-center gap-3">
          <Rosette size={32} className="animate-spin" />
          <span className="font-serif tracking-wide">Loading Sealed Nectar Academy…</span>
        </div>
      </div>
    );
  }

  if (reportCard) {
    return (
      <ReportCardPrint
        student={students.find((s) => s.id === reportCard.studentId)}
        term={reportCard.term}
        results={results}
        attendance={attendance}
        feeLedger={feeLedger}
        exams={exams}
        examAttempts={examAttempts}
        onBack={() => setReportCard(null)}
      />
    );
  }

  if (broadsheet) {
    return (
      <BroadsheetPrint
        {...broadsheet}
        students={students}
        results={results}
        exams={exams}
        examAttempts={examAttempts}
        onBack={() => setBroadsheet(null)}
      />
    );
  }

  if (idCardView) {
    return (
      <IdCardPrint
        type={idCardView.type}
        items={idCardView.type === "student" ? students.filter((s) => idCardView.ids.includes(s.id)) : teachers.filter((t) => idCardView.ids.includes(t.id))}
        schoolSettings={schoolSettings}
        onBack={() => setIdCardView(null)}
      />
    );
  }

  if (billView) {
    return (
      <BillPrint
        student={students.find((s) => s.id === billView.studentId)}
        term={billView.term}
        feeLedger={feeLedger}
        feeStructures={feeStructures}
        onBack={() => setBillView(null)}
      />
    );
  }

  if (!role) return <RoleSelect onSelect={setRole} />;

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#1D2B26]">
      <TopBar role={role} onExit={logout} />
      {role === "admin" && (
        session?.type === "admin" ? (
          <AdminView
            students={students} setStudents={persist.students}
            teachers={teachers} setTeachers={persist.teachers}
            feeLedger={feeLedger} setFeeLedger={persist.feeLedger}
            newsPosts={newsPosts} setNewsPosts={persist.newsPosts}
            galleryPhotos={galleryPhotos} setGalleryPhotos={persist.galleryPhotos}
            feeStructures={feeStructures} setFeeStructures={persist.feeStructures}
            results={results} attendance={attendance}
            exams={exams} examAttempts={examAttempts}
            adminAuth={adminAuth} setAdminAuth={persist.adminAuth}
            schoolSettings={schoolSettings} setSchoolSettings={persist.schoolSettings}
            onOpenReportCard={(studentId, term) => setReportCard({ studentId, term })}
            onOpenBroadsheet={(className, department, term) => setBroadsheet({ className, department, term })}
            onOpenIdCards={(type, ids) => setIdCardView({ type, ids })}
            onOpenBill={(studentId, term) => setBillView({ studentId, term })}
          />
        ) : (
          <AdminGate adminAuth={adminAuth} setAdminAuth={persist.adminAuth} onSuccess={() => setSession({ type: "admin" })} />
        )
      )}
      {role === "teacher" && (
        session?.type === "teacher" ? (
          <TeacherView
            teacher={teachers.find((t) => t.id === session.teacherId)}
            students={students}
            attendance={attendance} setAttendance={persist.attendance}
            results={results} setResults={persist.results}
            exams={exams} setExams={persist.exams}
            examAttempts={examAttempts}
            theoryExams={theoryExams} setTheoryExams={persist.theoryExams}
            questionBank={questionBank} setQuestionBank={persist.questionBank}
            notes={notes} setNotes={persist.notes}
            liveClasses={liveClasses} setLiveClasses={persist.liveClasses}
          />
        ) : (
          <TeacherGate teachers={teachers} onSuccess={(teacherId) => setSession({ type: "teacher", teacherId })} />
        )
      )}
      {role === "student" && (
        session?.type === "student" ? (
          <StudentView
            student={students.find((s) => s.id === session.studentId)}
            exams={exams} examAttempts={examAttempts} setExamAttempts={persist.examAttempts}
            notes={notes} liveClasses={liveClasses}
          />
        ) : (
          <StudentGate students={students} onSuccess={(studentId) => setSession({ type: "student", studentId })} />
        )
      )}
      {role === "parent" && (
        <ParentView
          students={students} attendance={attendance} results={results} feeLedger={feeLedger}
          exams={exams} examAttempts={examAttempts}
          notes={notes} liveClasses={liveClasses}
          onOpenReportCard={(studentId, term) => setReportCard({ studentId, term })}
          onOpenBill={(studentId, term) => setBillView({ studentId, term })}
        />
      )}
    </div>
  );
}

// ---------- Role select (landing) ----------
function RoleSelect({ onSelect }) {
  const roles = [
    { key: "admin", label: "Admin & Accounts", desc: "Manage students, staff and fee records", icon: Wallet },
    { key: "teacher", label: "Teacher Portal", desc: "Take attendance, enter results and set exams", icon: ClipboardList },
    { key: "student", label: "Student Portal", desc: "Write CBT exams and view scores", icon: GraduationCap },
    { key: "parent", label: "Parent Portal", desc: "View your child's progress", icon: Users },
  ];
  return (
    <div className="min-h-screen relative bg-[#0B4F3C] flex items-center justify-center p-6 overflow-hidden">
      <StarField />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center gap-1 mb-4 text-[#C9A227]">
            <Rosette size={14} /><Rosette size={20} /><Rosette size={14} />
          </div>
          <p className="text-[#C9A227]/80 text-xs tracking-[0.25em] uppercase mb-2">Bismillah</p>
          <h1 className="font-serif text-3xl text-[#FBF8F1] leading-tight">Sealed Nectar Academy</h1>
          <p className="text-[#8FB5A5] text-sm mt-2">School Management System · Ota, Ogun State</p>
        </div>
        <div className="space-y-3">
          {roles.map((r) => (
            <button key={r.key} onClick={() => onSelect(r.key)}
              className="w-full flex items-center gap-4 bg-[#0F5D46] hover:bg-[#136B50] border border-[#C9A227]/25 hover:border-[#C9A227]/60 rounded-lg px-5 py-4 text-left transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[#C9A227]/15 flex items-center justify-center flex-shrink-0">
                <r.icon size={18} className="text-[#C9A227]" />
              </div>
              <div className="flex-1">
                <div className="text-[#FBF8F1] font-medium">{r.label}</div>
                <div className="text-[#8FB5A5] text-xs mt-0.5">{r.desc}</div>
              </div>
              <ChevronRight size={16} className="text-[#8FB5A5] group-hover:text-[#C9A227] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopBar({ role, onExit }) {
  const titles = { admin: "Admin & Accounts", teacher: "Teacher Portal", parent: "Parent Portal", student: "Student Portal" };
  return (
    <div className="bg-[#0B4F3C] text-[#FBF8F1] px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
      <div className="flex items-center gap-2.5">
        <Rosette size={18} className="text-[#C9A227]" />
        <div>
          <div className="font-serif text-base leading-none">Sealed Nectar Academy</div>
          <div className="text-[#8FB5A5] text-[11px] mt-1">{titles[role]}</div>
        </div>
      </div>
      <button onClick={onExit} className="flex items-center gap-1.5 text-[#8FB5A5] hover:text-[#C9A227] text-sm transition-colors">
        <LogOut size={14} /> {role === "parent" ? "Switch" : "Log out"}
      </button>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-[#0B4F3C] flex items-center gap-2">
          <span className="w-1 h-5 bg-[#C9A227] rounded-full inline-block" />{title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function EmptyState({ text }) {
  return <div className="text-center py-10 text-[#6E8F80] text-sm border border-dashed border-[#C9A227]/30 rounded-lg">{text}</div>;
}

// ================= AUTH GATES =================
function AuthCard({ children }) {
  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="bg-white border border-[#EFE9DA] rounded-xl p-6">{children}</div>
    </div>
  );
}

function AdminGate({ adminAuth, setAdminAuth, onSuccess }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const createPassword = async () => {
    if (pw.length < 4) return setError("Password should be at least 4 characters.");
    if (pw !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const hash = await hashCode(pw);
    setAdminAuth({ hash });
    setBusy(false);
    onSuccess();
  };
  const login = async () => {
    setBusy(true);
    const hash = await hashCode(pw);
    setBusy(false);
    if (hash === adminAuth.hash) onSuccess();
    else setError("Incorrect password.");
  };

  if (!adminAuth) {
    return (
      <AuthCard>
        <div className="flex items-center gap-2 mb-1 text-[#0B4F3C]"><Lock size={16} /><span className="font-serif text-lg">Set up admin access</span></div>
        <p className="text-xs text-[#6E8F80] mb-4">This is the first time signing in as admin. Choose a password to protect student, staff and fee records.</p>
        <div className="space-y-2">
          <input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} className={`w-full ${inputCls}`} autoFocus />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createPassword()} className={`w-full ${inputCls}`} />
          {error && <p className="text-xs text-[#B0532B]">{error}</p>}
          <button disabled={busy} onClick={createPassword} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-60">
            {busy ? "Setting up…" : "Create password & continue"}
          </button>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard>
      <div className="flex items-center gap-2 mb-4 text-[#0B4F3C]"><Lock size={16} /><span className="font-serif text-lg">Admin login</span></div>
      <div className="space-y-2">
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className={`w-full ${inputCls}`} autoFocus />
        {error && <p className="text-xs text-[#B0532B]">{error}</p>}
        <button disabled={busy} onClick={login} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-60">
          {busy ? "Checking…" : "Log in"}
        </button>
      </div>
    </AuthCard>
  );
}

function TeacherGate({ teachers, onSuccess }) {
  const [teacherId, setTeacherId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return setError("Select your name first.");
    setBusy(true);
    const hash = await hashCode(pin);
    setBusy(false);
    if (hash === teacher.pinHash) onSuccess(teacher.id);
    else setError("Incorrect PIN.");
  };

  if (teachers.length === 0) {
    return <AuthCard><p className="text-sm text-[#6E8F80]">No teacher accounts have been set up yet. Ask the admin to add you under Staff.</p></AuthCard>;
  }

  return (
    <AuthCard>
      <div className="flex items-center gap-2 mb-4 text-[#0B4F3C]"><KeyRound size={16} /><span className="font-serif text-lg">Teacher login</span></div>
      <div className="space-y-2">
        <select value={teacherId} onChange={(e) => { setTeacherId(e.target.value); setError(""); }} className={`w-full ${inputCls}`}>
          <option value="">Select your name</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="password" inputMode="numeric" placeholder="4–6 digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className={`w-full ${inputCls}`} />
        {error && <p className="text-xs text-[#B0532B]">{error}</p>}
        <button disabled={busy} onClick={login} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-60">
          {busy ? "Checking…" : "Log in"}
        </button>
      </div>
    </AuthCard>
  );
}

function StudentGate({ students, onSuccess }) {
  const [admissionNo, setAdmissionNo] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    const student = students.find((s) => s.admissionNo.toLowerCase() === admissionNo.trim().toLowerCase());
    if (!student) return setError("Admission number not found.");
    if (!student.pinHash) return setError("No login PIN set for you yet. Ask admin to set one.");
    setBusy(true);
    const hash = await hashCode(pin);
    setBusy(false);
    if (hash === student.pinHash) onSuccess(student.id);
    else setError("Incorrect PIN.");
  };

  return (
    <AuthCard>
      <div className="flex items-center gap-2 mb-4 text-[#0B4F3C]"><GraduationCap size={16} /><span className="font-serif text-lg">Student login</span></div>
      <div className="space-y-2">
        <input placeholder="Admission number" value={admissionNo} onChange={(e) => { setAdmissionNo(e.target.value); setError(""); }} className={`w-full ${inputCls}`} autoFocus />
        <input type="password" inputMode="numeric" placeholder="4–6 digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className={`w-full ${inputCls}`} />
        {error && <p className="text-xs text-[#B0532B]">{error}</p>}
        <button disabled={busy} onClick={login} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-60">
          {busy ? "Checking…" : "Log in"}
        </button>
      </div>
    </AuthCard>
  );
}
// ================= ADMIN =================
function AdminView({ students, setStudents, teachers, setTeachers, feeLedger, setFeeLedger, feeStructures, setFeeStructures, results, attendance, exams, examAttempts, adminAuth, setAdminAuth, schoolSettings, setSchoolSettings, newsPosts, setNewsPosts, galleryPhotos, setGalleryPhotos, onOpenReportCard, onOpenBroadsheet, onOpenIdCards, onOpenBill }) {
  const [tab, setTab] = useState("overview");
  const tabs = [
    { key: "overview", label: "Overview" }, { key: "students", label: "Students" }, { key: "bulkimport", label: "Bulk Import" },
    { key: "teachers", label: "Staff" }, { key: "fees", label: "Accounts" },
    { key: "reportcards", label: "Report Cards" }, { key: "broadsheet", label: "Broadsheet" },
    { key: "promotion", label: "Promotion" }, { key: "idcards", label: "ID Cards" },
    { key: "feestructure", label: "Fee Structure" }, { key: "website", label: "Website" }, { key: "settings", label: "Settings" },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex gap-1 mb-6 bg-[#EFE9DA] p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#0B4F3C] text-[#FBF8F1]" : "text-[#6E8F80] hover:text-[#0B4F3C]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <AdminOverview students={students} teachers={teachers} feeLedger={feeLedger} results={results} attendance={attendance} exams={exams} examAttempts={examAttempts} />}
      {tab === "students" && <StudentsPanel students={students} setStudents={setStudents} />}
      {tab === "bulkimport" && <BulkImportPanel students={students} setStudents={setStudents} />}
      {tab === "teachers" && <TeachersPanel teachers={teachers} setTeachers={setTeachers} />}
      {tab === "fees" && <FeesPanel students={students} feeLedger={feeLedger} setFeeLedger={setFeeLedger} feeStructures={feeStructures} />}
      {tab === "reportcards" && <ReportCardsPanel students={students} onOpenReportCard={onOpenReportCard} onOpenBill={onOpenBill} />}
      {tab === "broadsheet" && <BroadsheetFormPanel onOpenBroadsheet={onOpenBroadsheet} />}
      {tab === "promotion" && <PromotionPanel students={students} setStudents={setStudents} results={results} exams={exams} examAttempts={examAttempts} />}
      {tab === "idcards" && <IdCardsPanel students={students} teachers={teachers} onOpenIdCards={onOpenIdCards} />}
      {tab === "feestructure" && <FeeStructurePanel feeStructures={feeStructures} setFeeStructures={setFeeStructures} />}
      {tab === "website" && <WebsiteContentPanel newsPosts={newsPosts} setNewsPosts={setNewsPosts} galleryPhotos={galleryPhotos} setGalleryPhotos={setGalleryPhotos} />}
      {tab === "settings" && <SettingsPanel adminAuth={adminAuth} setAdminAuth={setAdminAuth} schoolSettings={schoolSettings} setSchoolSettings={setSchoolSettings} />}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-[#EFE9DA] rounded-lg p-4">
      <div className="text-2xl font-serif text-[#0B4F3C]">{value}</div>
      <div className="text-xs text-[#6E8F80] mt-1">{label}</div>
      {sub && <div className="text-[11px] text-[#C9A227] mt-1">{sub}</div>}
    </div>
  );
}

function AdminOverview({ students, teachers, feeLedger, results, attendance, exams, examAttempts }) {
  const [perfTerm, setPerfTerm] = useState(TERMS[0]);
  const ledgerAll = ledgerTotals(feeLedger);
  const totalPaid = ledgerAll.paid;
  const outstanding = Math.max(ledgerAll.balance, 0);

  const enrollmentData = CLASSES.map((c) => ({ name: c, students: students.filter((s) => s.className === c).length })).filter((d) => d.students > 0);

  const feeData = (totalPaid > 0 || outstanding > 0) ? [
    { name: "Collected", value: totalPaid },
    { name: "Outstanding", value: outstanding },
  ] : [];
  const FEE_COLORS = ["#0B4F3C", "#B0532B"];

  const attendanceData = CLASSES.map((c) => {
    const classStudentIds = students.filter((s) => s.className === c).map((s) => s.id);
    const records = attendance.filter((a) => classStudentIds.includes(a.studentId));
    const present = records.filter((a) => a.status === "Present").length;
    return { name: c, rate: records.length ? Math.round((present / records.length) * 100) : 0, hasData: records.length > 0 };
  }).filter((d) => d.hasData);

  const subjectsWithData = [...new Set(results.filter((r) => r.term === perfTerm).map((r) => r.subject))];
  const performanceData = subjectsWithData.map((subj) => {
    const rows = results.filter((r) => r.term === perfTerm && r.subject === subj);
    const totals = rows.map((r) => resultTotal(r, getCbtScore(r.studentId, subj, perfTerm, exams, examAttempts)));
    return { name: subj, average: Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 };
  });

  return (
    <div>
      <Section title="At a glance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Students" value={students.length} />
          <StatCard label="Teachers" value={teachers.length} />
          <StatCard label="Fees collected" value={`₦${totalPaid.toLocaleString()}`} />
          <StatCard label="Outstanding" value={`₦${outstanding.toLocaleString()}`} sub={outstanding > 0 ? "Follow up needed" : "All clear"} />
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Enrollment by class">
          {enrollmentData.length === 0 ? <EmptyState text="No students added yet." /> : (
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DA" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6E8F80" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6E8F80" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#EFE9DA" }} />
                  <Bar dataKey="students" fill="#C9A227" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Fee collection">
          {feeData.length === 0 ? <EmptyState text="No fee records yet." /> : (
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={feeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {feeData.map((entry, i) => <Cell key={entry.name} fill={FEE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#EFE9DA" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Attendance rate by class">
          {attendanceData.length === 0 ? <EmptyState text="No attendance recorded yet." /> : (
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DA" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6E8F80" }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6E8F80" }} />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#EFE9DA" }} />
                  <Bar dataKey="rate" fill="#0B4F3C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Subject performance" action={
          <select value={perfTerm} onChange={(e) => setPerfTerm(e.target.value)} className="text-xs border border-[#EFE9DA] rounded-md px-2 py-1 bg-white focus:outline-none focus:border-[#C9A227]">
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        }>
          {performanceData.length === 0 ? <EmptyState text={`No results entered for ${perfTerm} yet.`} /> : (
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DA" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6E8F80" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#6E8F80" }} />
                  <Tooltip formatter={(v) => `${v}/100`} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#EFE9DA" }} />
                  <Bar dataKey="average" fill="#C9A227" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function StudentsPanel({ students, setStudents }) {
  const emptyForm = { name: "", admissionNo: "", className: CLASSES[0], department: "", tradeSubject: "", electives: [], parentName: "", parentPhone: "", photo: "" };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [resetId, setResetId] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const isSS = CLASS_GROUP[form.className] === "ss";
  const electivePool = isSS && DEPARTMENT_SUBJECTS[form.department] ? DEPARTMENT_SUBJECTS[form.department].elective : [];

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const startEdit = (s) => {
    setForm({
      name: s.name, admissionNo: s.admissionNo, className: s.className,
      department: s.department || "", tradeSubject: s.tradeSubject || "",
      electives: s.electives || [], parentName: s.parentName || "", parentPhone: s.parentPhone || "", photo: s.photo || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };
  const toggleElective = (subj) => setForm((f) => ({ ...f, electives: f.electives.includes(subj) ? f.electives.filter((e) => e !== subj) : [...f.electives, subj] }));

  const saveStudent = () => {
    if (!form.name.trim() || !form.admissionNo.trim()) return;
    if (editingId) {
      setStudents(students.map((s) => s.id === editingId ? { ...s, ...form } : s));
    } else {
      setStudents([...students, { id: uid(), ...form }]);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };
  const removeStudent = (id) => setStudents(students.filter((s) => s.id !== id));
  const resetPin = async (id) => {
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError("PIN must be 4 to 6 digits (numbers only).");
      return;
    }
    setPinError("");
    const pinHash = await hashCode(newPin);
    setStudents(students.map((s) => s.id === id ? { ...s, pinHash } : s));
    setResetId(null); setNewPin("");
  };
  const filtered = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.admissionNo.toLowerCase().includes(query.toLowerCase()));

  return (
    <Section title="Students" action={
      <button onClick={() => showForm && !editingId ? setShowForm(false) : startAdd()} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> Add student
      </button>
    }>
      {showForm && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          {editingId && <p className="text-xs text-[#C9A227] font-medium">Editing {form.name || "student"}</p>}
          <PhotoUpload value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} label="Photo" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Admission number" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} className={inputCls} />
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value, department: "", tradeSubject: "", electives: [] })} className={inputCls}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {isSS && (
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, electives: [] })} className={inputCls}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            {isSS && (
              <select value={form.tradeSubject} onChange={(e) => setForm({ ...form, tradeSubject: e.target.value })} className={inputCls}>
                <option value="">Select trade subject</option>
                {TRADE_SUBJECTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <input placeholder="Parent/guardian name" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className={inputCls} />
            <input placeholder="Parent phone" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} className={inputCls} />
          </div>
          {isSS && form.department && (
            <div>
              <p className="text-xs text-[#6E8F80] mb-1.5">Elective subjects for this student (choose from {form.department}'s pool)</p>
              <div className="flex flex-wrap gap-1.5">
                {electivePool.map((subj) => (
                  <button type="button" key={subj} onClick={() => toggleElective(subj)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.electives.includes(subj) ? "bg-[#C9A227] text-[#0B4F3C] border-[#C9A227]" : "border-[#EFE9DA] text-[#6E8F80]"}`}>{subj}</button>
                ))}
              </div>
              <p className="text-[10px] text-[#6E8F80] mt-1">Leave none selected to take all electives in the pool by default.</p>
            </div>
          )}
          <button onClick={saveStudent} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all">{editingId ? "Save changes" : "Save student"}</button>
        </div>
      )}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8F80]" />
        <input placeholder="Search by name or admission no." value={query} onChange={(e) => setQuery(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
      </div>
      {filtered.length === 0 ? <EmptyState text="No students yet. Add your first student above." /> : (
        <>
          <p className="text-[10px] text-[#6E8F80] mb-1.5 sm:hidden">Swipe left/right on the table below to see all columns, including Login PIN.</p>
          <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Adm. No.</th>
                  <th className="text-left px-4 py-2.5">Class</th><th className="text-left px-4 py-2.5">Parent</th>
                  <th className="text-left px-4 py-2.5">Login PIN</th><th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-[#EFE9DA]">
                    <td className="px-4 py-2.5 whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-2.5 text-[#6E8F80] whitespace-nowrap">{s.admissionNo}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{s.className}{s.department ? ` · ${s.department}` : ""}</td>
                    <td className="px-4 py-2.5 text-[#6E8F80] whitespace-nowrap">{s.parentName || "—"}</td>
                    <td className="px-4 py-2.5">
                      {resetId === s.id ? (
                        <div>
                          <div className="flex gap-1 items-center">
                            <input
                              placeholder="New PIN"
                              inputMode="numeric"
                              value={newPin}
                              onChange={(e) => { setNewPin(e.target.value); setPinError(""); }}
                              onKeyDown={(e) => e.key === "Enter" && resetPin(s.id)}
                              autoFocus
                              className="w-20 border border-[#EFE9DA] rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#C9A227]"
                            />
                            <button onClick={() => resetPin(s.id)} className="text-xs bg-[#0B4F3C] text-white px-2 py-1 rounded-md whitespace-nowrap">Save</button>
                            <button onClick={() => { setResetId(null); setNewPin(""); setPinError(""); }} className="text-xs text-[#6E8F80] px-1">Cancel</button>
                          </div>
                          {pinError && <p className="text-[10px] text-[#B0532B] mt-1 w-32">{pinError}</p>}
                        </div>
                      ) : (
                        <button onClick={() => { setResetId(s.id); setNewPin(""); setPinError(""); }} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C] flex items-center gap-1 whitespace-nowrap">
                          <KeyRound size={11} /> {s.pinHash ? "Reset PIN" : "Set PIN"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(s)} className="text-xs text-[#0B4F3C] hover:underline whitespace-nowrap">Edit</button>
                        <button onClick={() => removeStudent(s.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
      }
function normalizeHeader(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
const HEADER_ALIASES = {
  name: ["name", "fullname", "studentname"],
  admissionNo: ["admissionno", "admissionnumber", "admno", "admission", "admnumber"],
  className: ["class", "classname"],
  department: ["department", "dept"],
  tradeSubject: ["tradesubject", "trade"],
  parentName: ["parentname", "guardianname", "parent"],
  parentPhone: ["parentphone", "guardianphone", "phone", "phonenumber"],
};
function mapImportRow(row) {
  const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v]);
  const get = (field) => {
    for (const [k, v] of entries) {
      if (HEADER_ALIASES[field].includes(k)) return String(v ?? "").trim();
    }
    return "";
  };
  return {
    name: get("name"), admissionNo: get("admissionNo"), className: get("className"),
    department: get("department"), tradeSubject: get("tradeSubject"),
    parentName: get("parentName"), parentPhone: get("parentPhone"),
  };
}
function validateImportRow(row, existingAdmissionNos) {
  const errors = [];
  if (!row.name) errors.push("Missing name");
  if (!row.admissionNo) errors.push("Missing admission no.");
  else if (existingAdmissionNos.has(row.admissionNo.toLowerCase())) errors.push("Duplicate admission no.");
  const matchedClass = CLASSES.find((c) => c.toLowerCase() === row.className.toLowerCase());
  if (!matchedClass) errors.push(`Unrecognised class "${row.className}"`);
  return { ...row, className: matchedClass || row.className, errors };
}

function BulkImportPanel({ students, setStudents }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  const downloadTemplate = () => {
    const csv = "Name,Admission Number,Class,Department (SS only),Trade Subject (SS only),Parent Name,Parent Phone\n" +
      "Amina Bello,SN/2026/001,JSS1,,,Mrs Bello,08012345678\n" +
      "Tunde Alabi,SN/2026/002,SS2,STEM,Data Processing,Mr Alabi,08087654321\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResultMsg("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const existing = new Set(students.map((s) => s.admissionNo.toLowerCase()));
        const seen = new Set();
        const parsed = json.map((r) => {
          const mapped = mapImportRow(r);
          const validated = validateImportRow(mapped, existing);
          if (mapped.admissionNo && seen.has(mapped.admissionNo.toLowerCase()) && !validated.errors.includes("Duplicate admission no.")) {
            validated.errors.push("Duplicate within file");
          }
          seen.add(mapped.admissionNo.toLowerCase());
          return validated;
        });
        setRows(parsed);
      } catch {
        setResultMsg("Could not read that file. Make sure it's a valid .csv or .xlsx file.");
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = rows.filter((r) => r.errors.length === 0);

  const doImport = () => {
    const newStudents = validRows.map((r) => ({
      id: uid(), name: r.name, admissionNo: r.admissionNo, className: r.className,
      department: r.department || "", tradeSubject: r.tradeSubject || "",
      parentName: r.parentName, parentPhone: r.parentPhone,
    }));
    setStudents([...students, ...newStudents]);
    setResultMsg(`Imported ${newStudents.length} student${newStudents.length === 1 ? "" : "s"}.${rows.length - newStudents.length > 0 ? ` ${rows.length - newStudents.length} row(s) skipped due to errors.` : ""}`);
    setRows([]);
    setFileName("");
  };

  return (
    <Section title="Bulk Import Students">
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4">
        <p className="text-sm text-[#1D2B26] mb-1 font-medium">1. Download the template</p>
        <p className="text-xs text-[#6E8F80] mb-3">Fill it in Excel, Google Sheets, or any spreadsheet app, then upload it below. Column order doesn't matter as long as the headers are similar to the template.</p>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs border border-[#0B4F3C]/30 text-[#0B4F3C] px-3 py-1.5 rounded-full hover:bg-[#0B4F3C]/5 transition-colors mb-4">
          <Download size={12} /> Download CSV template
        </button>

        <p className="text-sm text-[#1D2B26] mb-1 font-medium">2. Upload your completed file</p>
        <label className="flex items-center gap-2 border border-dashed border-[#C9A227]/50 rounded-lg px-4 py-3 text-sm text-[#6E8F80] cursor-pointer hover:border-[#C9A227] transition-colors">
          <Upload size={14} />
          {fileName || "Choose a .csv or .xlsx file"}
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
        {resultMsg && <p className="text-xs text-[#0B4F3C] mt-3 bg-[#0B4F3C]/5 rounded-md px-3 py-2">{resultMsg}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#6E8F80]">{validRows.length} of {rows.length} row(s) ready to import</p>
            <button disabled={validRows.length === 0} onClick={doImport} className="flex items-center gap-1.5 bg-[#C9A227] text-[#0B4F3C] font-medium text-sm px-3 py-1.5 rounded-md hover:brightness-95 transition-all disabled:opacity-50">
              <Table size={14} /> Import {validRows.length} student{validRows.length === 1 ? "" : "s"}
            </button>
          </div>
          <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Adm. No.</th>
                  <th className="text-left px-3 py-2">Class</th><th className="text-left px-3 py-2">Dept.</th>
                  <th className="text-left px-3 py-2">Parent</th><th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-[#EFE9DA] ${r.errors.length > 0 ? "bg-[#B0532B]/5" : ""}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-[#6E8F80] whitespace-nowrap">{r.admissionNo || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.className || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.department || "—"}</td>
                    <td className="px-3 py-2 text-[#6E8F80] whitespace-nowrap">{r.parentName || "—"}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0
                        ? <span className="text-xs bg-[#0B4F3C]/10 text-[#0B4F3C] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Check size={11} /> Ready</span>
                        : <span className="text-xs bg-[#B0532B]/10 text-[#B0532B] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit" title={r.errors.join(", ")}><AlertCircle size={11} /> {r.errors[0]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

const emptyTeacherForm = { name: "", phone: "", pin: "", classes: [], subjects: [], photo: "" };

function TeachersPanel({ teachers, setTeachers }) {
  const [form, setForm] = useState(emptyTeacherForm);
  const [showForm, setShowForm] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [newPin, setNewPin] = useState("");

  const toggle = (arr, val) => arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const addTeacher = async () => {
    if (!form.name.trim() || !/^\d{4,6}$/.test(form.pin) || form.classes.length === 0 || form.subjects.length === 0) return;
    const pinHash = await hashCode(form.pin);
    setTeachers([...teachers, { id: uid(), name: form.name, phone: form.phone, classes: form.classes, subjects: form.subjects, photo: form.photo, pinHash }]);
    setForm(emptyTeacherForm);
    setShowForm(false);
  };
  const removeTeacher = (id) => setTeachers(teachers.filter((t) => t.id !== id));
  const resetPin = async (id) => {
    if (!/^\d{4,6}$/.test(newPin)) return;
    const pinHash = await hashCode(newPin);
    setTeachers(teachers.map((t) => t.id === id ? { ...t, pinHash } : t));
    setResetId(null); setNewPin("");
  };

  return (
    <Section title="Staff" action={
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> Add teacher
      </button>
    }>
      {showForm && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <PhotoUpload value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} label="Photo" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            <input placeholder="4–6 digit login PIN" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className={inputCls} />
          </div>
          <div>
            <p className="text-xs text-[#6E8F80] mb-1.5">Classes this teacher can access</p>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map((c) => (
                <button type="button" key={c} onClick={() => setForm({ ...form, classes: toggle(form.classes, c) })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.classes.includes(c) ? "bg-[#0B4F3C] text-white border-[#0B4F3C]" : "border-[#EFE9DA] text-[#6E8F80]"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#6E8F80] mb-1.5">Subjects this teacher can enter results for</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SUBJECTS.map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, subjects: toggle(form.subjects, s) })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.subjects.includes(s) ? "bg-[#C9A227] text-[#0B4F3C] border-[#C9A227]" : "border-[#EFE9DA] text-[#6E8F80]"}`}>{s}</button>
              ))}
            </div>
          </div>
          <button onClick={addTeacher} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all">Save teacher</button>
        </div>
      )}
      {teachers.length === 0 ? <EmptyState text="No staff added yet." /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {teachers.map((t) => (
            <div key={t.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-[#1D2B26]">{t.name}</div>
                  {t.phone && <div className="text-xs text-[#6E8F80]">{t.phone}</div>}
                </div>
                <button onClick={() => removeTeacher(t.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.classes.map((c) => <span key={c} className="text-[10px] bg-[#0B4F3C]/10 text-[#0B4F3C] px-1.5 py-0.5 rounded">{c}</span>)}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {t.subjects.map((s) => <span key={s} className="text-[10px] bg-[#C9A227]/15 text-[#8a7115] px-1.5 py-0.5 rounded">{s}</span>)}
              </div>
              {resetId === t.id ? (
                <div className="flex gap-1.5 mt-3">
                  <input placeholder="New PIN" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} className={`flex-1 ${inputCls} py-1.5`} />
                  <button onClick={() => resetPin(t.id)} className="text-xs bg-[#0B4F3C] text-white px-3 rounded-md">Save</button>
                </div>
              ) : (
                <button onClick={() => setResetId(t.id)} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C] mt-3 flex items-center gap-1"><KeyRound size={11} /> Reset PIN</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function FeeStructurePanel({ feeStructures, setFeeStructures }) {
  const [className, setClassName] = useState(CLASSES[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const existing = feeStructures.find((f) => f.className === className && f.term === term);
  const [items, setItems] = useState(existing?.items || [{ id: uid(), name: "", amount: "" }]);

  useEffect(() => {
    const found = feeStructures.find((f) => f.className === className && f.term === term);
    setItems(found?.items?.length ? found.items : [{ id: uid(), name: "", amount: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, term]);

  const updateItem = (id, patch) => setItems(items.map((it) => it.id === id ? { ...it, ...patch } : it));
  const addItem = () => setItems([...items, { id: uid(), name: "", amount: "" }]);
  const removeItem = (id) => setItems(items.filter((it) => it.id !== id));
  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const save = () => {
    const cleanItems = items.filter((it) => it.name.trim() && it.amount !== "");
    if (cleanItems.length === 0) return;
    if (existing) {
      setFeeStructures(feeStructures.map((f) => f.id === existing.id ? { ...f, items: cleanItems } : f));
    } else {
      setFeeStructures([...feeStructures, { id: uid(), className, term, items: cleanItems }]);
    }
  };
  const deleteStructure = () => {
    if (existing) setFeeStructures(feeStructures.filter((f) => f.id !== existing.id));
    setItems([{ id: uid(), name: "", amount: "" }]);
  };

  return (
    <Section title="Fee Structure">
      <p className="text-xs text-[#6E8F80] mb-3">Set the itemized bill for each class and term (e.g. Tuition, Exam charges, Arabiyah). This feeds directly into each student's printable school bill.</p>
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4">
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <select value={className} onChange={(e) => setClassName(e.target.value)} className={inputCls}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls}>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2 mb-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <input placeholder="Item name (e.g. Tuition)" value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} className={`flex-1 ${inputCls}`} />
              <input type="number" min="0" placeholder="Amount (₦)" value={it.amount} onChange={(e) => updateItem(it.id, { amount: e.target.value })} className={`w-32 ${inputCls}`} />
              {items.length > 1 && <button onClick={() => removeItem(it.id)} className="text-[#B0532B]"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline"><Plus size={13} /> Add item</button>
          <p className="text-sm font-medium text-[#0B4F3C]">Total: ₦{total.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all">{existing ? "Update" : "Save"} {className} — {term} bill</button>
          {existing && <button onClick={deleteStructure} className="text-xs text-[#B0532B] px-3 hover:underline">Delete</button>}
        </div>
      </div>

      {feeStructures.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[#6E8F80] uppercase tracking-wide">All fee structures</p>
          {feeStructures.map((f) => (
            <div key={f.id} className="bg-white border border-[#EFE9DA] rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
              <span>{f.className} · {f.term}</span>
              <span className="text-[#6E8F80]">₦{f.items.reduce((s, it) => s + (Number(it.amount) || 0), 0).toLocaleString()} · {f.items.length} item{f.items.length === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function WebsiteContentPanel({ newsPosts, setNewsPosts, galleryPhotos, setGalleryPhotos }) {
  const [tab, setTab] = useState("news");
  const emptyPostForm = { title: "", content: "", imageUrl: "", date: new Date().toISOString().slice(0, 10) };
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [editingPostId, setEditingPostId] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const sortedPosts = [...newsPosts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const startAddPost = () => { setPostForm(emptyPostForm); setEditingPostId(null); setShowPostForm(true); };
  const startEditPost = (p) => { setPostForm({ title: p.title, content: p.content, imageUrl: p.imageUrl, date: p.date }); setEditingPostId(p.id); setShowPostForm(true); };
  const savePost = () => {
    if (!postForm.title.trim() || !postForm.content.trim()) return;
    if (editingPostId) {
      setNewsPosts(newsPosts.map((p) => p.id === editingPostId ? { ...p, ...postForm } : p));
    } else {
      setNewsPosts([...newsPosts, { id: uid(), ...postForm, createdAt: new Date().toISOString() }]);
    }
    setShowPostForm(false);
    setEditingPostId(null);
  };
  const deletePost = (id) => setNewsPosts(newsPosts.filter((p) => p.id !== id));

  const addPhoto = () => {
    if (!photoUrl) return;
    setGalleryPhotos([...galleryPhotos, { id: uid(), url: photoUrl, caption: photoCaption, createdAt: new Date().toISOString() }]);
    setPhotoUrl(""); setPhotoCaption("");
  };
  const deletePhoto = (id) => setGalleryPhotos(galleryPhotos.filter((p) => p.id !== id));

  return (
    <Section title="Website Content">
      <p className="text-xs text-[#6E8F80] mb-3">Anything posted here shows up automatically on the public school website — no separate login needed.</p>
      <div className="flex gap-1 mb-4 bg-[#EFE9DA] p-1 rounded-lg w-fit">
        {[{ key: "news", label: "News" }, { key: "gallery", label: "Gallery" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === t.key ? "bg-[#0B4F3C] text-[#FBF8F1]" : "text-[#6E8F80]"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "news" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => showPostForm ? setShowPostForm(false) : startAddPost()} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
              <Plus size={14} /> New post
            </button>
          </div>
          {showPostForm && (
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
              <input placeholder="Post title" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} className={`w-full ${inputCls}`} />
              <input type="date" value={postForm.date} onChange={(e) => setPostForm({ ...postForm, date: e.target.value })} className={inputCls} />
              <textarea placeholder="Post content" value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} rows={5} className={`w-full ${inputCls}`} />
              <div>
                <p className="text-xs text-[#6E8F80] mb-1">Cover photo (optional)</p>
                <PhotoUpload value={postForm.imageUrl} onChange={(v) => setPostForm({ ...postForm, imageUrl: v })} label="Photo" shape="square" maxSize={800} />
              </div>
              <button onClick={savePost} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all">{editingPostId ? "Save changes" : "Publish post"}</button>
            </div>
          )}
          {sortedPosts.length === 0 ? <EmptyState text="No news posts yet." /> : (
            <div className="space-y-2">
              {sortedPosts.map((p) => (
                <div key={p.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex gap-3">
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-md object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <p className="text-xs text-[#6E8F80] mt-0.5">{p.date}</p>
                    <p className="text-xs text-[#6E8F80] mt-1 line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => startEditPost(p)} className="text-xs text-[#0B4F3C] hover:underline">Edit</button>
                      <button onClick={() => deletePost(p.id)} className="text-xs text-[#B0532B] hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "gallery" && (
        <div>
          <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
            <p className="text-sm font-medium">Add a photo</p>
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} label="Photo" shape="square" maxSize={800} />
            <input placeholder="Caption (optional)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} className={`w-full ${inputCls}`} />
            <button disabled={!photoUrl} onClick={addPhoto} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all disabled:opacity-50">Add to gallery</button>
          </div>
          {galleryPhotos.length === 0 ? <EmptyState text="No photos in the gallery yet." /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...galleryPhotos].reverse().map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.url} alt={p.caption} className="w-full aspect-square object-cover rounded-lg border border-[#EFE9DA]" />
                  {p.caption && <p className="text-[10px] text-[#6E8F80] mt-1 truncate">{p.caption}</p>}
                  <button onClick={() => deletePhoto(p.id)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-[#B0532B]"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
      }
function FeesPanel({ students, feeLedger, setFeeLedger, feeStructures }) {
  const [studentId, setStudentId] = useState("");
  const [issueTerm, setIssueTerm] = useState(TERMS[0]);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");
  const [query, setQuery] = useState("");

  const selectedStudent = students.find((s) => s.id === studentId);
  const entries = studentId ? ledgerFor(studentId, feeLedger) : [];
  const totals = ledgerTotals(entries);

  const structure = selectedStudent ? feeStructures.find((f) => f.className === selectedStudent.className && f.term === issueTerm) : null;
  const structureTotal = structure ? structure.items.reduce((s, it) => s + (Number(it.amount) || 0), 0) : null;
  const alreadyIssued = entries.some((e) => e.type === "charge" && e.term === issueTerm && e.description === `${issueTerm} fees`);

  const issueBill = () => {
    if (!structure || alreadyIssued) return;
    setFeeLedger([...feeLedger, { id: uid(), studentId, type: "charge", amount: structureTotal, term: issueTerm, description: `${issueTerm} fees`, date: new Date().toISOString().slice(0, 10) }]);
  };
  const recordPayment = () => {
    if (!studentId || !payAmount || Number(payAmount) <= 0) return;
    setFeeLedger([...feeLedger, { id: uid(), studentId, type: "payment", amount: payAmount, term: issueTerm, description: payNote || "Payment received", date: payDate }]);
    setPayAmount(""); setPayNote("");
  };
  const removeEntry = (id) => setFeeLedger(feeLedger.filter((e) => e.id !== id));

  const filteredStudents = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.admissionNo.toLowerCase().includes(query.toLowerCase()));

  return (
    <Section title="Accounts — Fee Ledger">
      <p className="text-xs text-[#6E8F80] mb-3">A single running balance per student — payments made in any term automatically reduce what they owe overall, so installments spilling across terms track correctly.</p>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8F80]" />
        <input placeholder="Search student by name or admission no." value={query} onChange={(e) => setQuery(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
      </div>
      <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`w-full ${inputCls} mb-4`}>
        <option value="">Select student</option>
        {filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}
      </select>

      {selectedStudent && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Total Charged" value={`₦${totals.charged.toLocaleString()}`} />
            <StatCard label="Total Paid" value={`₦${totals.paid.toLocaleString()}`} />
            <StatCard label="Balance" value={`₦${Math.max(totals.balance, 0).toLocaleString()}`} sub={totals.balance <= 0 ? "Fully paid" : "Outstanding"} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Issue a term bill</p>
              <select value={issueTerm} onChange={(e) => setIssueTerm(e.target.value)} className={`w-full ${inputCls} mb-2`}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {structure ? (
                <>
                  <p className="text-xs text-[#6E8F80] mb-1">{structure.items.length} item{structure.items.length === 1 ? "" : "s"} · Total ₦{structureTotal.toLocaleString()}</p>
                  <button disabled={alreadyIssued} onClick={issueBill} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all disabled:opacity-50">
                    {alreadyIssued ? "Already issued" : "Issue bill to ledger"}
                  </button>
                </>
              ) : (
                <p className="text-xs text-[#6E8F80]">No fee structure set for {selectedStudent.className} — {issueTerm} yet. Set one under Fee Structure first.</p>
              )}
            </div>
            <div className="bg-white border border-[#EFE9DA] rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Record a payment</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" min="0" placeholder="Amount (₦)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
                <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
              </div>
              <input placeholder="Note (e.g. Bank transfer, cash)" value={payNote} onChange={(e) => setPayNote(e.target.value)} className={`w-full ${inputCls} mb-2`} />
              <button onClick={recordPayment} className="w-full bg-[#0B4F3C] text-white font-medium text-sm rounded-md py-2 hover:bg-[#136B50] transition-colors">Record payment</button>
            </div>
          </div>

          {entries.length === 0 ? <EmptyState text="No ledger entries yet for this student." /> : (
            <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Charge</th><th className="text-right px-3 py-2">Payment</th><th className="px-3 py-2"></th>
                </tr></thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-[#EFE9DA]">
                      <td className="px-3 py-2 text-[#6E8F80] whitespace-nowrap">{e.date}</td>
                      <td className="px-3 py-2">{e.description}</td>
                      <td className="px-3 py-2 text-right">{e.type === "charge" ? `₦${Number(e.amount).toLocaleString()}` : ""}</td>
                      <td className="px-3 py-2 text-right text-[#0B4F3C]">{e.type === "payment" ? `₦${Number(e.amount).toLocaleString()}` : ""}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => removeEntry(e.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function ReportCardsPanel({ students, onOpenReportCard, onOpenBill }) {
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  return (
    <Section title="Report Cards & Bills">
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 max-w-sm space-y-3">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`w-full ${inputCls}`}>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={`w-full ${inputCls}`}>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          disabled={!studentId}
          onClick={() => onOpenReportCard(studentId, term)}
          className="w-full flex items-center justify-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-50">
          <Printer size={14} /> Generate report card
        </button>
        <button
          disabled={!studentId}
          onClick={() => onOpenBill(studentId, term)}
          className="w-full flex items-center justify-center gap-2 bg-[#C9A227] text-[#0B4F3C] font-medium rounded-md py-2.5 hover:brightness-95 transition-all disabled:opacity-50">
          <Printer size={14} /> Generate school bill
        </button>
      </div>
    </Section>
  );
}

function BroadsheetFormPanel({ onOpenBroadsheet }) {
  const [className, setClassName] = useState(CLASSES[0]);
  const [department, setDepartment] = useState("");
  const [term, setTerm] = useState(TERMS[0]);
  const isSS = CLASS_GROUP[className] === "ss";

  return (
    <Section title="Broadsheet">
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 max-w-sm space-y-3">
        <select value={className} onChange={(e) => { setClassName(e.target.value); setDepartment(""); }} className={`w-full ${inputCls}`}>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isSS && (
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={`w-full ${inputCls}`}>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          disabled={isSS && !department}
          onClick={() => onOpenBroadsheet(className, department, term)}
          className="w-full flex items-center justify-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors disabled:opacity-50">
          <Printer size={14} /> Generate broadsheet
        </button>
        {isSS && <p className="text-[11px] text-[#6E8F80]">SS classes are split by department since subjects differ per department.</p>}
      </div>
    </Section>
  );
}

function PromotionPanel({ students, setStudents, results, exams, examAttempts }) {
  const [className, setClassName] = useState(CLASSES[0]);
  const [department, setDepartment] = useState("");
  const [passMark, setPassMark] = useState(40);
  const [selected, setSelected] = useState({});
  const [rowDept, setRowDept] = useState({});
  const [resultMsg, setResultMsg] = useState("");

  const isSS = CLASS_GROUP[className] === "ss";
  const nextClass = NEXT_CLASS[className];
  const needsDeptChoice = nextClass === "SS1";

  const classStudents = students.filter((s) => s.className === className && (isSS && department ? s.department === department : true));
  const rows = classStudents.map((s) => {
    const subjects = subjectsForStudent(s);
    const avg = subjects.length ? annualAverage(s.id, subjects, results, exams, examAttempts) : null;
    const passed = avg !== null ? avg >= Number(passMark) : null;
    return { student: s, average: avg, passed };
  });

  useEffect(() => {
    const defaults = {};
    rows.forEach((r) => { defaults[r.student.id] = r.passed !== false; });
    setSelected(defaults);
    setRowDept({});
    setResultMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, department]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const doPromote = () => {
    if (!nextClass) return;
    let count = 0, skippedNoDept = 0;
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const updated = students.map((s) => {
      if (!classStudentIds.has(s.id) || !selected[s.id]) return s;
      if (needsDeptChoice && !rowDept[s.id]) { skippedNoDept++; return s; }
      count++;
      const patch = { className: nextClass };
      if (needsDeptChoice) patch.department = rowDept[s.id];
      return { ...s, ...patch };
    });
    setStudents(updated);
    setResultMsg(`Promoted ${count} student${count === 1 ? "" : "s"} to ${nextClass}.${skippedNoDept > 0 ? ` ${skippedNoDept} skipped — department not selected.` : ""}`);
  };

  return (
    <Section title="End of Year Promotion">
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 grid sm:grid-cols-3 gap-3">
        <select value={className} onChange={(e) => { setClassName(e.target.value); setDepartment(""); }} className={inputCls}>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isSS && (
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#6E8F80] whitespace-nowrap">Pass mark</label>
          <input type="number" min="0" max="100" value={passMark} onChange={(e) => setPassMark(e.target.value)} className={`w-20 ${inputCls}`} />
        </div>
      </div>

      <p className="text-xs text-[#6E8F80] mb-3">
        {nextClass === "Graduated"
          ? "Students in this class will be marked as Graduated rather than moved to a new class."
          : needsDeptChoice
          ? "Promoting to SS1 requires choosing a department for each student."
          : `Promoting from ${className} to ${nextClass}.`}
        {" "}Annual average is calculated across all three terms — you can override any checkbox manually.
      </p>

      {classStudents.length === 0 ? <EmptyState text="No students found for this class." /> : (
        <>
          <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Promote</th>
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-left">Annual Avg</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {needsDeptChoice && <th className="px-3 py-2 text-left">New Department</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, average, passed }) => (
                  <tr key={student.id} className="border-t border-[#EFE9DA]">
                    <td className="px-3 py-2"><input type="checkbox" checked={!!selected[student.id]} onChange={() => toggle(student.id)} className="accent-[#0B4F3C]" /></td>
                    <td className="px-3 py-2">{student.name}</td>
                    <td className="px-3 py-2">{average === null ? "No data" : `${Math.round(average * 10) / 10}/100`}</td>
                    <td className="px-3 py-2">
                      {passed === null
                        ? <span className="text-xs text-[#6E8F80] bg-[#6E8F80]/10 px-2 py-0.5 rounded-full">No data</span>
                        : passed
                        ? <span className="text-xs text-[#0B4F3C] bg-[#0B4F3C]/10 px-2 py-0.5 rounded-full">Pass</span>
                        : <span className="text-xs text-[#B0532B] bg-[#B0532B]/10 px-2 py-0.5 rounded-full">Fail</span>}
                    </td>
                    {needsDeptChoice && (
                      <td className="px-3 py-2">
                        <select value={rowDept[student.id] || ""} onChange={(e) => setRowDept((rd) => ({ ...rd, [student.id]: e.target.value }))} className="text-xs border border-[#EFE9DA] rounded-md px-2 py-1 bg-white focus:outline-none focus:border-[#C9A227]">
                          <option value="">Select</option>
                          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={doPromote} className="flex items-center gap-2 bg-[#C9A227] text-[#0B4F3C] font-medium text-sm px-4 py-2.5 rounded-md hover:brightness-95 transition-all">
            <ChevronRight size={14} /> Promote selected students
          </button>
          {resultMsg && <p className="text-xs text-[#0B4F3C] mt-3 bg-[#0B4F3C]/5 rounded-md px-3 py-2">{resultMsg}</p>}
        </>
      )}
    </Section>
  );
}

function IdCardsPanel({ students, teachers, onOpenIdCards }) {
  const [type, setType] = useState("student");
  const [className, setClassName] = useState("");
  const [selected, setSelected] = useState({});

  const pool = type === "student"
    ? students.filter((s) => !className || s.className === className)
    : teachers;

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => { const all = {}; pool.forEach((p) => { all[p.id] = true; }); setSelected(all); };
  const selectNone = () => setSelected({});
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  return (
    <Section title="ID Cards">
      <div className="flex gap-1 mb-4 bg-[#EFE9DA] p-1 rounded-lg w-fit">
        {[{ key: "student", label: "Students" }, { key: "teacher", label: "Teachers" }].map((t) => (
          <button key={t.key} onClick={() => { setType(t.key); setSelected({}); }} className={`px-4 py-2 text-sm rounded-md transition-colors ${type === t.key ? "bg-[#0B4F3C] text-[#FBF8F1]" : "text-[#6E8F80]"}`}>{t.label}</button>
        ))}
      </div>

      {type === "student" && (
        <select value={className} onChange={(e) => { setClassName(e.target.value); setSelected({}); }} className={`${inputCls} mb-3`}>
          <option value="">All classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {pool.length === 0 ? <EmptyState text={`No ${type === "student" ? "students" : "teachers"} found.`} /> : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#6E8F80]">{selectedIds.length} of {pool.length} selected</p>
            <div className="flex gap-3">
              <button onClick={selectAll} className="text-xs text-[#0B4F3C] hover:underline">Select all</button>
              <button onClick={selectNone} className="text-xs text-[#6E8F80] hover:underline">Clear</button>
            </div>
          </div>
          <div className="bg-white border border-[#EFE9DA] rounded-lg divide-y divide-[#EFE9DA] max-h-80 overflow-y-auto mb-4">
            {pool.map((p) => (
              <label key={p.id} className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={!!selected[p.id]} onChange={() => toggle(p.id)} className="accent-[#0B4F3C]" />
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-[#6E8F80]">{type === "student" ? `${p.className}${p.department ? ` · ${p.department}` : ""}` : (p.subjects || []).slice(0, 2).join(", ")}</span>
              </label>
            ))}
          </div>
          <button disabled={selectedIds.length === 0} onClick={() => onOpenIdCards(type, selectedIds)} className="flex items-center gap-2 bg-[#C9A227] text-[#0B4F3C] font-medium text-sm px-4 py-2.5 rounded-md hover:brightness-95 transition-all disabled:opacity-50">
            <CreditCard size={14} /> Generate {selectedIds.length} ID card{selectedIds.length === 1 ? "" : "s"}
          </button>
        </>
      )}
    </Section>
  );
}

function SettingsPanel({ adminAuth, setAdminAuth, schoolSettings, setSchoolSettings }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ss, setSs] = useState(schoolSettings);
  const [ssMsg, setSsMsg] = useState("");

  const change = async () => {
    setMsg("");
    const currentHash = await hashCode(current);
    if (currentHash !== adminAuth.hash) return setMsg("Current password is incorrect.");
    if (next.length < 4) return setMsg("New password should be at least 4 characters.");
    if (next !== confirm) return setMsg("New passwords don't match.");
    const hash = await hashCode(next);
    setAdminAuth({ hash });
    setCurrent(""); setNext(""); setConfirm("");
    setMsg("Password updated.");
  };

  const saveSchoolSettings = () => {
    setSchoolSettings(ss);
    setSsMsg("Saved.");
    setTimeout(() => setSsMsg(""), 2000);
  };

  return (
    <Section title="Settings">
      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 max-w-sm space-y-3 mb-4">
        <p className="text-sm font-medium text-[#1D2B26] mb-1">ID Card &amp; School Details</p>
        <p className="text-xs text-[#6E8F80]">Used on the back of ID cards and other official documents.</p>
        <input placeholder="Director of Studies — full name" value={ss.directorName} onChange={(e) => setSs({ ...ss, directorName: e.target.value })} className={`w-full ${inputCls}`} />
        <input placeholder="Title (e.g. Director of Studies)" value={ss.directorTitle} onChange={(e) => setSs({ ...ss, directorTitle: e.target.value })} className={`w-full ${inputCls}`} />
        <div>
          <p className="text-xs text-[#6E8F80] mb-1">Director's signature</p>
          <PhotoUpload value={ss.directorSignature} onChange={(v) => setSs({ ...ss, directorSignature: v })} label="Signature" shape="square" maxSize={220} />
        </div>
        <input placeholder="School phone" value={ss.phone} onChange={(e) => setSs({ ...ss, phone: e.target.value })} className={`w-full ${inputCls}`} />
        <input placeholder="School address" value={ss.address} onChange={(e) => setSs({ ...ss, address: e.target.value })} className={`w-full ${inputCls}`} />
        <textarea placeholder="Short statement about the school (shown on the ID card back)" value={ss.statement} onChange={(e) => setSs({ ...ss, statement: e.target.value })} rows={3} className={`w-full ${inputCls}`} />
        {ssMsg && <p className="text-xs text-[#0B4F3C]">{ssMsg}</p>}
        <button onClick={saveSchoolSettings} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2 hover:brightness-95 transition-all">Save school details</button>
      </div>

      <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 max-w-sm space-y-2">
        <p className="text-sm font-medium text-[#1D2B26] mb-1">Change admin password</p>
        <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`w-full ${inputCls}`} />
        <input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} className={`w-full ${inputCls}`} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`w-full ${inputCls}`} />
        {msg && <p className={`text-xs ${msg.includes("updated") ? "text-[#0B4F3C]" : "text-[#B0532B]"}`}>{msg}</p>}
        <button onClick={change} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2 hover:bg-[#136B50] transition-colors">Update password</button>
      </div>
    </Section>
  );
                                 }
// ================= TEACHER =================
function TeacherView({ teacher, students, attendance, setAttendance, results, setResults, exams, setExams, examAttempts, theoryExams, setTheoryExams, questionBank, setQuestionBank, notes, setNotes, liveClasses, setLiveClasses }) {
  const [tab, setTab] = useState("attendance");
  const [className, setClassName] = useState(teacher?.classes?.[0] || "");
  const classStudents = students.filter((s) => s.className === className);

  if (!teacher) return <div className="max-w-md mx-auto px-4 py-10"><EmptyState text="Your account could not be found. Contact admin." /></div>;
  if (!teacher.classes || teacher.classes.length === 0) return <div className="max-w-md mx-auto px-4 py-10"><EmptyState text="No classes have been assigned to you yet. Ask admin to update your access." /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="text-sm text-[#6E8F80] mb-4">Welcome, <span className="text-[#0B4F3C] font-medium">{teacher.name}</span></div>
      <div className="flex gap-1 mb-4 bg-[#EFE9DA] p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        {[{ key: "attendance", label: "Attendance" }, { key: "results", label: "Results" }, { key: "cbt", label: "CBT Exams" }, { key: "theory", label: "Theory Marking" }, { key: "notes", label: "E-Notes" }, { key: "live", label: "Live Classes" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#0B4F3C] text-[#FBF8F1]" : "text-[#6E8F80]"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "cbt" ? (
        <CbtExamsTab teacher={teacher} students={students} exams={exams} setExams={setExams} examAttempts={examAttempts} questionBank={questionBank} setQuestionBank={setQuestionBank} />
      ) : tab === "theory" ? (
        <TheoryMarkingTab teacher={teacher} students={students} results={results} setResults={setResults} theoryExams={theoryExams} setTheoryExams={setTheoryExams} />
      ) : tab === "notes" ? (
        <TeacherNotesTab teacher={teacher} notes={notes} setNotes={setNotes} />
      ) : tab === "live" ? (
        <TeacherLiveClassesTab teacher={teacher} liveClasses={liveClasses} setLiveClasses={setLiveClasses} />
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs text-[#6E8F80] block mb-1">Class</label>
            <select value={className} onChange={(e) => setClassName(e.target.value)} className={inputCls}>
              {teacher.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {classStudents.length === 0 ? <EmptyState text={`No students recorded in ${className} yet. Ask admin to add them.`} />
            : tab === "attendance" ? <AttendanceTab students={classStudents} attendance={attendance} setAttendance={setAttendance} />
            : <ResultsTab students={classStudents} results={results} setResults={setResults} subjects={teacher.subjects} exams={exams} examAttempts={examAttempts} />}
        </>
      )}
    </div>
  );
}

function AttendanceTab({ students, attendance, setAttendance }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const getStatus = (studentId) => attendance.find((a) => a.studentId === studentId && a.date === date)?.status;
  const setStatus = (studentId, status) => {
    const existing = attendance.find((a) => a.studentId === studentId && a.date === date);
    if (existing) setAttendance(attendance.map((a) => a.id === existing.id ? { ...a, status } : a));
    else setAttendance([...attendance, { id: uid(), studentId, date, status }]);
  };
  return (
    <Section title="Mark attendance">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mb-4`} />
      <div className="bg-white border border-[#EFE9DA] rounded-lg divide-y divide-[#EFE9DA]">
        {students.map((s) => {
          const status = getStatus(s.id);
          return (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{s.name}</span>
              <div className="flex gap-1.5">
                {["Present", "Absent", "Late"].map((opt) => (
                  <button key={opt} onClick={() => setStatus(s.id, opt)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${status === opt
                      ? opt === "Present" ? "bg-[#0B4F3C] text-white border-[#0B4F3C]" : opt === "Absent" ? "bg-[#B0532B] text-white border-[#B0532B]" : "bg-[#C9A227] text-[#0B4F3C] border-[#C9A227]"
                      : "border-[#EFE9DA] text-[#6E8F80]"}`}>{opt}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ResultsTab({ students, results, setResults, subjects, exams, examAttempts }) {
  const [subject, setSubject] = useState(subjects?.[0] || ALL_SUBJECTS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const getResult = (studentId) => results.find((r) => r.studentId === studentId && r.subject === subject && r.term === term);
  const updateResult = (studentId, patch) => {
    const existing = getResult(studentId);
    if (existing) setResults(results.map((r) => r.id === existing.id ? { ...r, ...patch } : r));
    else setResults([...results, { id: uid(), studentId, subject, term, ca: "", theory: "", ...patch }]);
  };
  if (!subjects || subjects.length === 0) return <EmptyState text="No subjects assigned to you yet. Ask admin to update your access." />;
  const eligibleStudents = students.filter((s) => subjectsForStudent(s).includes(subject));
  const classIsCbt = eligibleStudents.length > 0 ? isCbtClass(eligibleStudents[0].className) : true;
  const theoryMax = eligibleStudents.length > 0 ? theoryMaxFor(eligibleStudents[0].className) : 40;
  return (
    <Section title="Enter results">
      <div className="grid sm:grid-cols-2 gap-3 mb-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls}>{TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
      </div>
      <p className="text-xs text-[#6E8F80] mb-3">
        {classIsCbt
          ? `C.A (40) is entered manually · CBT (20) auto-fills from a matching exam if one exists · Paper-based (${theoryMax}) is entered manually.`
          : `This class does not sit CBT. C.A (40) is entered manually · Paper-based exam (${theoryMax}) is entered manually.`}
        {" "}Only students who take this subject (including electives) are listed.
      </p>
      {eligibleStudents.length === 0 ? <EmptyState text="No students in this class take this subject." /> : (
      <div className="bg-white border border-[#EFE9DA] rounded-lg divide-y divide-[#EFE9DA]">
        <div className="hidden sm:flex items-center px-4 py-2 text-[10px] uppercase tracking-wide text-[#6E8F80] bg-[#F5F1E6]">
          <span className="flex-1">Student</span>
          <span className="w-16 text-center">C.A /40</span>
          {classIsCbt && <span className="w-16 text-center">CBT /20</span>}
          <span className="w-16 text-center">Paper /{theoryMax}</span>
          <span className="w-20 text-center">Total</span>
        </div>
        {eligibleStudents.map((s) => {
          const r = getResult(s.id);
          const cbt = classIsCbt ? getCbtScore(s.id, subject, term, exams, examAttempts) : 0;
          const total = resultTotal(r, cbt);
          return (
            <div key={s.id} className="flex items-center gap-2 px-4 py-3">
              <span className="text-sm flex-1">{s.name}</span>
              <input type="number" min="0" max="40" placeholder="—" value={r?.ca ?? ""} onChange={(e) => updateResult(s.id, { ca: e.target.value })} className="w-16 border border-[#EFE9DA] rounded-md px-1.5 py-1.5 text-sm text-center focus:outline-none focus:border-[#C9A227]" />
              {classIsCbt && (
                <span className={`w-16 text-center text-sm ${cbt === null ? "text-[#6E8F80] italic" : "font-medium"}`}>{cbt === null ? "no exam" : cbt}</span>
              )}
              <input type="number" min="0" max={theoryMax} placeholder="—" value={r?.theory ?? ""} onChange={(e) => updateResult(s.id, { theory: e.target.value })} className="w-16 border border-[#EFE9DA] rounded-md px-1.5 py-1.5 text-sm text-center focus:outline-none focus:border-[#C9A227]" />
              <span className="w-20 text-center text-sm font-medium text-[#0B4F3C]">{total}/100</span>
            </div>
          );
        })}
      </div>
      )}
    </Section>
  );
}
const emptyQuestion = () => ({ id: uid(), text: "", options: ["", "", "", ""], correctIndex: 0 });
const emptyExamForm = (teacher) => ({
  title: "", subject: teacher?.subjects?.[0] || "", className: teacher?.classes?.[0] || "",
  term: TERMS[0], timeLimitMinutes: 20, totalMarks: 20, questions: [emptyQuestion()],
});

function CbtExamsTab({ teacher, students, exams, setExams, examAttempts, questionBank, setQuestionBank }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyExamForm(teacher));
  const [viewingId, setViewingId] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [bankPicks, setBankPicks] = useState([]);
  const [savedToBank, setSavedToBank] = useState([]);

  const myExams = exams.filter((e) => e.teacherId === teacher.id);
  const myBankQuestions = questionBank.filter((q) => q.teacherId === teacher.id && q.subject === form.subject);

  const updateQuestion = (qid, patch) => setForm({ ...form, questions: form.questions.map((q) => q.id === qid ? { ...q, ...patch } : q) });
  const updateOption = (qid, idx, value) => setForm({ ...form, questions: form.questions.map((q) => q.id === qid ? { ...q, options: q.options.map((o, i) => i === idx ? value : o) } : q) });
  const addQuestion = () => setForm({ ...form, questions: [...form.questions, emptyQuestion()] });
  const removeQuestion = (qid) => setForm({ ...form, questions: form.questions.filter((q) => q.id !== qid) });

  const saveQuestionToBank = (q) => {
    if (!q.text.trim() || !q.options.every((o) => o.trim())) return;
    setQuestionBank([...questionBank, { id: uid(), teacherId: teacher.id, subject: form.subject, text: q.text, options: q.options, correctIndex: q.correctIndex }]);
    setSavedToBank((s) => [...s, q.id]);
  };
  const toggleBankPick = (id) => setBankPicks((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const insertFromBank = () => {
    const toInsert = myBankQuestions.filter((q) => bankPicks.includes(q.id)).map((q) => ({ id: uid(), text: q.text, options: [...q.options], correctIndex: q.correctIndex }));
    setForm((f) => ({ ...f, questions: [...f.questions.filter((q) => q.text.trim() || q.options.some((o) => o.trim())), ...toInsert] }));
    setBankPicks([]);
    setShowBank(false);
  };
  const deleteBankQuestion = (id) => setQuestionBank(questionBank.filter((q) => q.id !== id));

  const canSave = form.title.trim() && form.questions.length > 0 && form.questions.every((q) => q.text.trim() && q.options.every((o) => o.trim()));

  const saveExam = () => {
    if (!canSave) return;
    setExams([...exams, { id: uid(), teacherId: teacher.id, ...form }]);
    setForm(emptyExamForm(teacher));
    setSavedToBank([]);
    setCreating(false);
  };
  const deleteExam = (id) => setExams(exams.filter((e) => e.id !== id));

  if (viewingId) {
    const exam = exams.find((e) => e.id === viewingId);
    const attempts = examAttempts.filter((a) => a.examId === viewingId);
    return (
      <Section title={`Results — ${exam.title}`} action={<button onClick={() => setViewingId(null)} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C]">Back to exams</button>}>
        {attempts.length === 0 ? <EmptyState text="No students have attempted this exam yet." /> : (
          <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">Student</th><th className="text-left px-4 py-2.5">Score</th><th className="text-left px-4 py-2.5">Submitted</th>
              </tr></thead>
              <tbody>
                {attempts.map((a) => {
                  const student = students.find((s) => s.id === a.studentId);
                  return (
                    <tr key={a.id} className="border-t border-[#EFE9DA]">
                      <td className="px-4 py-2.5">{student ? student.name : "Unknown"}</td>
                      <td className="px-4 py-2.5 font-medium">{a.score}/{exam.totalMarks}</td>
                      <td className="px-4 py-2.5 text-[#6E8F80] text-xs">{new Date(a.submittedAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );
  }

  return (
    <Section title="CBT Exams" action={
      <button onClick={() => { setCreating(!creating); setForm(emptyExamForm(teacher)); }} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> New exam
      </button>
    }>
      {creating && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <input placeholder="Exam title (e.g. Mathematics 1st CA Test)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
              {teacher.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={inputCls}>
              {teacher.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputCls}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="1" placeholder="Minutes" value={form.timeLimitMinutes} onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value })} className={inputCls} />
              <input type="number" min="1" placeholder="Total marks" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6E8F80]">Questions</p>
            <button type="button" onClick={() => setShowBank(!showBank)} className="text-xs text-[#0B4F3C] hover:underline">
              {showBank ? "Hide question bank" : `Insert from question bank (${myBankQuestions.length})`}
            </button>
          </div>

          {showBank && (
            <div className="border border-[#C9A227]/40 bg-[#C9A227]/5 rounded-lg p-3 space-y-2">
              {myBankQuestions.length === 0 ? (
                <p className="text-xs text-[#6E8F80]">No saved questions for {form.subject} yet. Use "Save to bank" on a question below to build your bank.</p>
              ) : (
                <>
                  {myBankQuestions.map((q) => (
                    <label key={q.id} className="flex items-start gap-2 text-xs bg-white border border-[#EFE9DA] rounded-md px-2.5 py-2 cursor-pointer">
                      <input type="checkbox" checked={bankPicks.includes(q.id)} onChange={() => toggleBankPick(q.id)} className="accent-[#0B4F3C] mt-0.5" />
                      <span className="flex-1">{q.text}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); deleteBankQuestion(q.id); }} className="text-[#B0532B]"><Trash2 size={12} /></button>
                    </label>
                  ))}
                  <button type="button" disabled={bankPicks.length === 0} onClick={insertFromBank} className="text-xs bg-[#0B4F3C] text-white px-3 py-1.5 rounded-md disabled:opacity-50">Add {bankPicks.length || ""} selected to this exam</button>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {form.questions.map((q, qi) => (
              <div key={q.id} className="border border-[#EFE9DA] rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs text-[#6E8F80] mt-2">Q{qi + 1}</span>
                  <input placeholder="Question text" value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className={`flex-1 ${inputCls}`} />
                  {form.questions.length > 1 && <button onClick={() => removeQuestion(q.id)} className="text-[#B0532B] mt-2"><Trash2 size={14} /></button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === oi} onChange={() => updateQuestion(q.id, { correctIndex: oi })} className="accent-[#0B4F3C]" />
                      <input placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updateOption(q.id, oi, e.target.value)} className={`flex-1 ${inputCls} py-1.5`} />
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1 pl-6">
                  <p className="text-[10px] text-[#6E8F80]">Select the radio button next to the correct option.</p>
                  <button type="button" disabled={savedToBank.includes(q.id)} onClick={() => saveQuestionToBank(q)} className="text-[10px] text-[#0B4F3C] hover:underline disabled:opacity-50 disabled:no-underline whitespace-nowrap">
                    {savedToBank.includes(q.id) ? "Saved to bank" : "Save to bank"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addQuestion} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline"><Plus size={13} /> Add question</button>
          <button disabled={!canSave} onClick={saveExam} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all disabled:opacity-50">Save exam</button>
        </div>
      )}

      {myExams.length === 0 ? <EmptyState text="No CBT exams created yet." /> : (
        <div className="space-y-2">
          {myExams.map((e) => {
            const attemptCount = examAttempts.filter((a) => a.examId === e.id).length;
            return (
              <div key={e.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e.title}</div>
                  <div className="text-xs text-[#6E8F80] mt-0.5">{e.subject} · {e.className} · {e.term} · {e.questions.length} questions · {e.timeLimitMinutes} min</div>
                  <div className="text-xs text-[#C9A227] mt-0.5">{attemptCount} student{attemptCount === 1 ? "" : "s"} attempted</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setViewingId(e.id)} className="text-xs text-[#0B4F3C] hover:underline">View scores</button>
                  <button onClick={() => deleteExam(e.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ================= AI THEORY MARKING =================
// ================= AI THEORY MARKING =================
async function callClaudeOld(prompt) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-theory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    throw new Error(`AI marking request failed (${response.status})`);
  }
  const data = await response.json();
  return data.text || "";
}

const emptyTheoryExamFormOld = (teacher) => ({
  title: "", subject: teacher?.subjects?.[0] || "", className: teacher?.classes?.[0] || "",
  term: TERMS[0], questions: "", markingScheme: "",
  maxMarks: theoryMaxFor(teacher?.classes?.[0] || ""),
});

function TheoryMarkingTabOld({ teacher, students, results, setResults, theoryExams, setTheoryExams }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyTheoryExamForm(teacher));
  const [generating, setGenerating] = useState(false);
  const [gradingExamId, setGradingExamId] = useState(null);

  const myExams = theoryExams.filter((e) => e.teacherId === teacher.id);

  const generateScheme = async () => {
    if (!form.questions.trim()) return;
    setGenerating(true);
    try {
      const text = await callClaude(
        `You are an experienced Nigerian secondary school examiner. Based on the following theory exam questions (total obtainable marks: ${form.maxMarks}), write a clear, concise marking scheme allocating marks per question or per expected key point. Keep it practical for a teacher to mark against. Do not add any preamble or headings — just the marking scheme itself.\n\nQUESTIONS:\n${form.questions}`
      );
      setForm((f) => ({ ...f, markingScheme: text.trim() }));
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const saveExam = () => {
    if (!form.title.trim() || !form.questions.trim()) return;
    setTheoryExams([...theoryExams, { id: uid(), teacherId: teacher.id, ...form }]);
    setForm(emptyTheoryExamForm(teacher));
    setCreating(false);
  };
  const deleteExam = (id) => setTheoryExams(theoryExams.filter((e) => e.id !== id));

  if (gradingExamId) {
    const exam = theoryExams.find((e) => e.id === gradingExamId);
    return (
      <TheoryGradingView
        exam={exam}
        students={students.filter((s) => s.className === exam.className)}
        results={results} setResults={setResults}
        onBack={() => setGradingExamId(null)}
      />
    );
  }

  return (
    <Section title="AI Theory Marking" action={
      <button onClick={() => { setCreating(!creating); setForm(emptyTheoryExamForm(teacher)); }} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> New theory exam
      </button>
    }>
      <p className="text-xs text-[#6E8F80] mb-4">Set your theory questions once, then paste each student's typed script to get an AI-suggested score. You always review and confirm the score before it's saved — nothing posts automatically.</p>
      {creating && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <input placeholder="Exam title (e.g. Mathematics 1st Term Theory)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
              {teacher.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value, maxMarks: theoryMaxFor(e.target.value) })} className={inputCls}>
              {teacher.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputCls}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" min="1" placeholder="Max marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} className={inputCls} />
          </div>
          <p className="text-[10px] text-[#6E8F80] -mt-1">Max marks auto-fills based on class: 40 for JSS/SS (CBT classes), 60 for Basic/Nursery/KG (no CBT). You can still adjust it manually if needed.</p>
          <textarea placeholder="Paste or type the theory questions here" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} rows={4} className={`w-full ${inputCls}`} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6E8F80]">Marking scheme (optional — used to guide the AI's grading)</p>
            <button disabled={generating || !form.questions.trim()} onClick={generateScheme} className="text-xs text-[#0B4F3C] hover:underline disabled:opacity-50 disabled:no-underline">
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <textarea placeholder="Leave blank to let the AI infer one from the questions, or write your own" value={form.markingScheme} onChange={(e) => setForm({ ...form, markingScheme: e.target.value })} rows={4} className={`w-full ${inputCls}`} />
          <button disabled={!form.title.trim() || !form.questions.trim()} onClick={saveExam} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all disabled:opacity-50">Save theory exam</button>
        </div>
      )}
      {myExams.length === 0 ? <EmptyState text="No theory exams set up yet." /> : (
        <div className="space-y-2">
          {myExams.map((e) => (
            <div key={e.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-[#6E8F80] mt-0.5">{e.subject} · {e.className} · {e.term} · /{e.maxMarks}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setGradingExamId(e.id)} className="text-xs text-[#0B4F3C] hover:underline">Grade scripts</button>
                <button onClick={() => deleteExam(e.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function TheoryGradingViewOld({ exam, students, results, setResults, onBack }) {
  const [scripts, setScripts] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [scores, setScores] = useState({});

  const gradeStudent = async (studentId) => {
    const answer = (scripts[studentId] || "").trim();
    if (!answer) return;
    setSuggestions((s) => ({ ...s, [studentId]: { grading: true } }));
    try {
      const text = await callClaude(
        `You are grading a Nigerian secondary school student's theory exam script. Maximum obtainable marks: ${exam.maxMarks}.\n\nQUESTIONS:\n${exam.questions}\n\nMARKING SCHEME:\n${exam.markingScheme || "(none provided — use your best judgement based on the questions and typical curriculum expectations)"}\n\nSTUDENT'S ANSWER:\n${answer}\n\nReturn ONLY a JSON object in exactly this shape, with no markdown formatting and no extra text: {"score": <number between 0 and ${exam.maxMarks}>, "feedback": "<one or two sentence justification for the score>"}`
      );
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSuggestions((s) => ({ ...s, [studentId]: { score: parsed.score, feedback: parsed.feedback, grading: false } }));
      setScores((sc) => ({ ...sc, [studentId]: parsed.score }));
    } catch (e) {
      setSuggestions((s) => ({ ...s, [studentId]: { error: true, grading: false } }));
    }
  };

  const saveScore = (studentId) => {
    const score = Number(scores[studentId]);
    if (Number.isNaN(score)) return;
    const existing = results.find((r) => r.studentId === studentId && r.subject === exam.subject && r.term === exam.term);
    if (existing) setResults(results.map((r) => r.id === existing.id ? { ...r, theory: score } : r));
    else setResults([...results, { id: uid(), studentId, subject: exam.subject, term: exam.term, ca: "", theory: score }]);
  };

  return (
    <Section title={`Grade — ${exam.title}`} action={<button onClick={onBack} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C]">Back to theory exams</button>}>
      <div className="bg-[#F5F1E6] border border-[#EFE9DA] rounded-lg p-3 mb-4 text-xs text-[#6E8F80]">
        <p className="font-medium text-[#0B4F3C] mb-1">Questions</p>
        <p className="whitespace-pre-wrap">{exam.questions}</p>
      </div>
      {students.length === 0 ? <EmptyState text={`No students recorded in ${exam.className} yet.`} /> : (
        <div className="space-y-4">
          {students.map((s) => {
            const sug = suggestions[s.id];
            const existingResult = results.find((r) => r.studentId === s.id && r.subject === exam.subject && r.term === exam.term);
            const savedTheory = existingResult?.theory;
            return (
              <div key={s.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4">
                <p className="text-sm font-medium mb-2">{s.name}{savedTheory !== undefined && savedTheory !== "" ? <span className="text-xs text-[#0B4F3C] font-normal"> — saved: {savedTheory}/{exam.maxMarks}</span> : ""}</p>
                <textarea placeholder="Paste or type the student's typed script here…" value={scripts[s.id] || ""} onChange={(e) => setScripts((sc) => ({ ...sc, [s.id]: e.target.value }))} rows={3} className={`w-full ${inputCls} mb-2`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled={sug?.grading || !(scripts[s.id] || "").trim()} onClick={() => gradeStudent(s.id)} className="text-xs bg-[#0B4F3C] text-white px-3 py-1.5 rounded-md disabled:opacity-50">
                    {sug?.grading ? "Grading…" : "Grade with AI"}
                  </button>
                  {sug && !sug.grading && !sug.error && (
                    <>
                      <span className="text-xs text-[#6E8F80]">Score:</span>
                      <input type="number" min="0" max={exam.maxMarks} value={scores[s.id] ?? sug.score} onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))} className="w-16 border border-[#EFE9DA] rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:border-[#C9A227]" />
                      <span className="text-xs text-[#6E8F80]">/{exam.maxMarks}</span>
                      <button onClick={() => saveScore(s.id)} className="text-xs bg-[#C9A227] text-[#0B4F3C] font-medium px-3 py-1 rounded-md hover:brightness-95 transition-all">Save score</button>
                    </>
                  )}
                  {sug?.error && <span className="text-xs text-[#B0532B]">Couldn't grade that — try again.</span>}
                </div>
                {sug?.feedback && <p className="text-xs text-[#6E8F80] italic mt-2">AI note: {sug.feedback}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
      }
// ================= AI THEORY MARKING (v2) =================
// Secondary classes only (JSS1-SS3). Teachers can upload photos of the
// handwritten script, or paste typed text. The AI returns a score, a short
// note and a transcription, and the teacher confirms before anything saves.

const MAX_SCRIPT_PHOTOS = 4;

// Shrinks a phone photo to ~1600px so handwriting stays readable but uploads fast.
function compressScriptPhoto(file, maxSize = 1600, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not open photo"));
      img.onload = () => {
        let w = img.width, h = img.height;
        const longest = Math.max(w, h);
        if (longest > maxSize) {
          const scale = maxSize / longest;
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ mimeType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function callClaude(prompt, { images, asJson } = {}) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-theory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ prompt, images, asJson }),
  });
  if (!response.ok) {
    throw new Error(`AI marking request failed (${response.status})`);
  }
  const data = await response.json();
  return data.text || "";
}

const secondaryClassesOf = (teacher) => (teacher?.classes || []).filter(isCbtClass);

const emptyTheoryExamForm = (teacher) => {
  const cls = secondaryClassesOf(teacher)[0] || "";
  return {
    title: "", subject: teacher?.subjects?.[0] || "", className: cls,
    term: TERMS[0], questions: "", markingScheme: "",
    maxMarks: theoryMaxFor(cls),
  };
};

function TheoryMarkingTab({ teacher, students, results, setResults, theoryExams, setTheoryExams }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyTheoryExamForm(teacher));
  const [generating, setGenerating] = useState(false);
  const [gradingExamId, setGradingExamId] = useState(null);

  const secondaryClasses = secondaryClassesOf(teacher);
  const myExams = theoryExams.filter((e) => e.teacherId === teacher.id && isCbtClass(e.className));

  const generateScheme = async () => {
    if (!form.questions.trim()) return;
    setGenerating(true);
    try {
      const text = await callClaude(
        `You are an experienced Nigerian secondary school examiner. Based on the following theory exam questions (total obtainable marks: ${form.maxMarks}), write a clear, concise marking scheme allocating marks per question or per expected key point. Keep it practical for a teacher to mark against. Do not add any preamble or headings — just the marking scheme itself.\n\nQUESTIONS:\n${form.questions}`
      );
      setForm((f) => ({ ...f, markingScheme: text.trim() }));
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const saveExam = () => {
    if (!form.title.trim() || !form.questions.trim() || !form.className) return;
    setTheoryExams([...theoryExams, { id: uid(), teacherId: teacher.id, ...form }]);
    setForm(emptyTheoryExamForm(teacher));
    setCreating(false);
  };
  const deleteExam = (id) => setTheoryExams(theoryExams.filter((e) => e.id !== id));

  if (gradingExamId) {
    const exam = theoryExams.find((e) => e.id === gradingExamId);
    return (
      <TheoryGradingView
        exam={exam}
        students={students.filter((s) => s.className === exam.className)}
        results={results} setResults={setResults}
        onBack={() => setGradingExamId(null)}
      />
    );
  }

  if (secondaryClasses.length === 0) {
    return (
      <Section title="AI Theory Marking">
        <EmptyState text="AI theory marking is for JSS1 to SS3 only. You have no secondary classes assigned." />
      </Section>
    );
  }

  return (
    <Section title="AI Theory Marking" action={
      <button onClick={() => { setCreating(!creating); setForm(emptyTheoryExamForm(teacher)); }} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> New theory exam
      </button>
    }>
      <p className="text-xs text-[#6E8F80] mb-4">Set your theory questions once, then upload photos of each student's written script (or paste typed text) to get an AI-suggested score. You always review and confirm the score before it's saved — nothing posts automatically.</p>
      {creating && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <input placeholder="Exam title (e.g. Mathematics 1st Term Theory)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
              {teacher.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value, maxMarks: theoryMaxFor(e.target.value) })} className={inputCls}>
              {secondaryClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputCls}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" min="1" placeholder="Max marks" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} className={inputCls} />
          </div>
          <p className="text-[10px] text-[#6E8F80] -mt-1">Max marks is 40 for JSS and SS (CA 40 + CBT 20 + Paper 40). You can still adjust it manually if needed.</p>
          <textarea placeholder="Paste or type the theory questions here" value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} rows={4} className={`w-full ${inputCls}`} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6E8F80]">Marking scheme (optional — used to guide the AI's grading)</p>
            <button disabled={generating || !form.questions.trim()} onClick={generateScheme} className="text-xs text-[#0B4F3C] hover:underline disabled:opacity-50 disabled:no-underline">
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <textarea placeholder="Leave blank to let the AI infer one from the questions, or write your own" value={form.markingScheme} onChange={(e) => setForm({ ...form, markingScheme: e.target.value })} rows={4} className={`w-full ${inputCls}`} />
          <button disabled={!form.title.trim() || !form.questions.trim()} onClick={saveExam} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all disabled:opacity-50">Save theory exam</button>
        </div>
      )}
      {myExams.length === 0 ? <EmptyState text="No theory exams set up yet." /> : (
        <div className="space-y-2">
          {myExams.map((e) => (
            <div key={e.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-[#6E8F80] mt-0.5">{e.subject} · {e.className} · {e.term} · /{e.maxMarks}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setGradingExamId(e.id)} className="text-xs text-[#0B4F3C] hover:underline">Grade scripts</button>
                <button onClick={() => deleteExam(e.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function TheoryGradingView({ exam, students, results, setResults, onBack }) {
  const [scripts, setScripts] = useState({});
  const [photos, setPhotos] = useState({});
  const [photoBusy, setPhotoBusy] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [scores, setScores] = useState({});

  const addPhotos = async (studentId, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setPhotoBusy(studentId);
    try {
      const added = [];
      for (const f of files) added.push(await compressScriptPhoto(f));
      setPhotos((p) => ({ ...p, [studentId]: [...(p[studentId] || []), ...added].slice(0, MAX_SCRIPT_PHOTOS) }));
    } catch (e) {
      console.error(e);
    }
    setPhotoBusy(null);
  };
  const removePhoto = (studentId, idx) =>
    setPhotos((p) => ({ ...p, [studentId]: (p[studentId] || []).filter((_, i) => i !== idx) }));

  const gradeStudent = async (studentId) => {
    const answer = (scripts[studentId] || "").trim();
    const pics = photos[studentId] || [];
    if (!answer && pics.length === 0) return;
    setSuggestions((s) => ({ ...s, [studentId]: { grading: true } }));
    try {
      const hasPhotos = pics.length > 0;
      const answerPart = hasPhotos
        ? `The student's answers are in the attached photo(s) of their handwritten script, in page order. First read the handwriting carefully and transcribe what the student wrote. If any word or figure is unclear, write [unclear] instead of guessing.${answer ? `\n\nADDITIONAL TYPED ANSWER:\n${answer}` : ""}`
        : `STUDENT'S ANSWER:\n${answer}`;
      const text = await callClaude(
        `You are grading a Nigerian secondary school student's theory exam script. Maximum obtainable marks: ${exam.maxMarks}.\n\nQUESTIONS:\n${exam.questions}\n\nMARKING SCHEME:\n${exam.markingScheme || "(none provided — use your best judgement based on the questions and typical curriculum expectations)"}\n\n${answerPart}\n\nReturn ONLY a JSON object in exactly this shape, with no markdown formatting and no extra text: {"transcription": "<what the student wrote, or an empty string if the script was typed>", "score": <number between 0 and ${exam.maxMarks}>, "feedback": "<one or two sentence justification for the score>"}`,
        { images: pics.map(({ mimeType, data }) => ({ mimeType, data })), asJson: true }
      );
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const score = Math.max(0, Math.min(Number(exam.maxMarks), Number(parsed.score) || 0));
      setSuggestions((s) => ({ ...s, [studentId]: { score, feedback: parsed.feedback, transcription: parsed.transcription, grading: false } }));
      setScores((sc) => ({ ...sc, [studentId]: score }));
    } catch (e) {
      console.error(e);
      setSuggestions((s) => ({ ...s, [studentId]: { error: true, grading: false } }));
    }
  };

  const saveScore = (studentId) => {
    const raw = Number(scores[studentId]);
    if (Number.isNaN(raw)) return;
    const score = Math.max(0, Math.min(Number(exam.maxMarks), raw));
    const existing = results.find((r) => r.studentId === studentId && r.subject === exam.subject && r.term === exam.term);
    if (existing) setResults(results.map((r) => r.id === existing.id ? { ...r, theory: score } : r));
    else setResults([...results, { id: uid(), studentId, subject: exam.subject, term: exam.term, ca: "", theory: score }]);
  };

  return (
    <Section title={`Grade — ${exam.title}`} action={<button onClick={onBack} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C]">Back to theory exams</button>}>
      <div className="bg-[#F5F1E6] border border-[#EFE9DA] rounded-lg p-3 mb-4 text-xs text-[#6E8F80]">
        <p className="font-medium text-[#0B4F3C] mb-1">Questions</p>
        <p className="whitespace-pre-wrap">{exam.questions}</p>
      </div>
      {students.length === 0 ? <EmptyState text={`No students recorded in ${exam.className} yet.`} /> : (
        <div className="space-y-4">
          {students.map((s) => {
            const sug = suggestions[s.id];
            const pics = photos[s.id] || [];
            const existingResult = results.find((r) => r.studentId === s.id && r.subject === exam.subject && r.term === exam.term);
            const savedTheory = existingResult?.theory;
            const hasInput = pics.length > 0 || (scripts[s.id] || "").trim();
            return (
              <div key={s.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4">
                <p className="text-sm font-medium mb-2">{s.name}{savedTheory !== undefined && savedTheory !== "" ? <span className="text-xs text-[#0B4F3C] font-normal"> — saved: {savedTheory}/{exam.maxMarks}</span> : ""}</p>

                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <label className={`text-xs border border-[#0B4F3C] text-[#0B4F3C] px-3 py-1.5 rounded-md cursor-pointer hover:bg-[#F5F1E6] ${pics.length >= MAX_SCRIPT_PHOTOS || photoBusy === s.id ? "opacity-50 pointer-events-none" : ""}`}>
                    {photoBusy === s.id ? "Preparing photo…" : "Upload photo of script"}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(s.id, e.target.files); e.target.value = ""; }} />
                  </label>
                  <span className="text-[10px] text-[#6E8F80]">Up to {MAX_SCRIPT_PHOTOS} photos, one page each, flat and well lit.</span>
                </div>
                {pics.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {pics.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p.preview} alt={`Page ${i + 1}`} className="h-20 w-16 object-cover rounded-md border border-[#EFE9DA]" />
                        <button onClick={() => removePhoto(s.id, i)} className="absolute -top-1.5 -right-1.5 bg-[#B0532B] text-white rounded-full p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea placeholder="Or paste or type the student's script here…" value={scripts[s.id] || ""} onChange={(e) => setScripts((sc) => ({ ...sc, [s.id]: e.target.value }))} rows={2} className={`w-full ${inputCls} mb-2`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled={sug?.grading || photoBusy === s.id || !hasInput} onClick={() => gradeStudent(s.id)} className="text-xs bg-[#0B4F3C] text-white px-3 py-1.5 rounded-md disabled:opacity-50">
                    {sug?.grading ? "Grading…" : "Grade with AI"}
                  </button>
                  {sug && !sug.grading && !sug.error && (
                    <>
                      <span className="text-xs text-[#6E8F80]">Score:</span>
                      <input type="number" min="0" max={exam.maxMarks} value={scores[s.id] ?? sug.score} onChange={(e) => setScores((sc) => ({ ...sc, [s.id]: e.target.value }))} className="w-16 border border-[#EFE9DA] rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:border-[#C9A227]" />
                      <span className="text-xs text-[#6E8F80]">/{exam.maxMarks}</span>
                      <button onClick={() => saveScore(s.id)} className="text-xs bg-[#C9A227] text-[#0B4F3C] font-medium px-3 py-1 rounded-md hover:brightness-95 transition-all">Save score</button>
                    </>
                  )}
                  {sug?.error && <span className="text-xs text-[#B0532B]">Couldn't grade that — try again{pics.length > 0 ? ", or retake the photo in better light." : "."}</span>}
                </div>
                {sug?.feedback && <p className="text-xs text-[#6E8F80] italic mt-2">AI note: {sug.feedback}</p>}
                {sug?.transcription && (
                  <details className="mt-2">
                    <summary className="text-xs text-[#0B4F3C] cursor-pointer">Check what the AI read from the script</summary>
                    <p className="text-xs text-[#6E8F80] mt-1 whitespace-pre-wrap">{sug.transcription}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ================= E-NOTES =================
const emptyNoteForm = (teacher) => ({ title: "", subject: teacher?.subjects?.[0] || "", className: teacher?.classes?.[0] || "", term: TERMS[0], content: "" });

function TeacherNotesTab({ teacher, notes, setNotes }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyNoteForm(teacher));

  const myNotes = notes.filter((n) => n.teacherId === teacher.id).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const startAdd = () => { setForm(emptyNoteForm(teacher)); setEditingId(null); setCreating(true); };
  const startEdit = (n) => { setForm({ title: n.title, subject: n.subject, className: n.className, term: n.term, content: n.content }); setEditingId(n.id); setCreating(true); };

  const save = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingId) {
      setNotes(notes.map((n) => n.id === editingId ? { ...n, ...form } : n));
    } else {
      setNotes([...notes, { id: uid(), teacherId: teacher.id, ...form, createdAt: new Date().toISOString() }]);
    }
    setCreating(false);
    setEditingId(null);
  };
  const deleteNote = (id) => setNotes(notes.filter((n) => n.id !== id));

  return (
    <Section title="E-Notes" action={
      <button onClick={() => creating ? setCreating(false) : startAdd()} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> New note
      </button>
    }>
      {creating && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <input placeholder="Note title (e.g. Introduction to Fractions)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
              {teacher.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={inputCls}>
              {teacher.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={`col-span-2 ${inputCls}`}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea placeholder="Write the lecture note here…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} className={`w-full ${inputCls}`} />
          <button onClick={save} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all">{editingId ? "Save changes" : "Publish note"}</button>
        </div>
      )}
      {myNotes.length === 0 ? <EmptyState text="No notes published yet." /> : (
        <div className="space-y-2">
          {myNotes.map((n) => (
            <div key={n.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-[#6E8F80] mt-0.5">{n.subject} · {n.className} · {n.term}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(n)} className="text-xs text-[#0B4F3C] hover:underline">Edit</button>
                  <button onClick={() => deleteNote(n.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-[#6E8F80] mt-2 line-clamp-2 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ================= LIVE CLASSES =================
const emptyLiveClassForm = (teacher) => ({ title: "", subject: teacher?.subjects?.[0] || "", className: teacher?.classes?.[0] || "", term: TERMS[0], dateTime: "", link: "", details: "" });

function TeacherLiveClassesTab({ teacher, liveClasses, setLiveClasses }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyLiveClassForm(teacher));

  const myClasses = liveClasses.filter((c) => c.teacherId === teacher.id).sort((a, b) => (a.dateTime || "").localeCompare(b.dateTime || ""));

  const startAdd = () => { setForm(emptyLiveClassForm(teacher)); setEditingId(null); setCreating(true); };
  const startEdit = (c) => { setForm({ title: c.title, subject: c.subject, className: c.className, term: c.term, dateTime: c.dateTime, link: c.link, details: c.details || "" }); setEditingId(c.id); setCreating(true); };

  const save = () => {
    if (!form.title.trim() || !form.dateTime || !form.link.trim()) return;
    if (editingId) {
      setLiveClasses(liveClasses.map((c) => c.id === editingId ? { ...c, ...form } : c));
    } else {
      setLiveClasses([...liveClasses, { id: uid(), teacherId: teacher.id, ...form }]);
    }
    setCreating(false);
    setEditingId(null);
  };
  const deleteClass = (id) => setLiveClasses(liveClasses.filter((c) => c.id !== id));

  return (
    <Section title="Live Classes" action={
      <button onClick={() => creating ? setCreating(false) : startAdd()} className="flex items-center gap-1.5 bg-[#0B4F3C] text-[#FBF8F1] text-sm px-3 py-1.5 rounded-md hover:bg-[#136B50] transition-colors">
        <Plus size={14} /> Schedule class
      </button>
    }>
      <p className="text-xs text-[#6E8F80] mb-3">This schedules a class with a link to your video platform of choice (Zoom, Google Meet, WhatsApp video, etc.) — it doesn't host video calls itself.</p>
      {creating && (
        <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 mb-4 space-y-3">
          <input placeholder="Class title (e.g. Algebra Revision)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls}>
              {teacher.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={inputCls}>
              {teacher.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} className={inputCls} />
            <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className={inputCls}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input placeholder="Meeting link (Zoom, Google Meet, etc.)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={`w-full ${inputCls}`} />
          <textarea placeholder="Notes for students (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={2} className={`w-full ${inputCls}`} />
          <button onClick={save} className="w-full bg-[#C9A227] text-[#0B4F3C] font-medium text-sm rounded-md py-2.5 hover:brightness-95 transition-all">{editingId ? "Save changes" : "Schedule class"}</button>
        </div>
      )}
      {myClasses.length === 0 ? <EmptyState text="No live classes scheduled yet." /> : (
        <div className="space-y-2">
          {myClasses.map((c) => {
            const isPast = c.dateTime && new Date(c.dateTime) < new Date();
            return (
              <div key={c.id} className={`bg-white border rounded-lg p-4 ${isPast ? "border-[#EFE9DA] opacity-60" : "border-[#EFE9DA]"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-[#6E8F80] mt-0.5">{c.subject} · {c.className} · {c.dateTime ? new Date(c.dateTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "No time set"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(c)} className="text-xs text-[#0B4F3C] hover:underline">Edit</button>
                    <button onClick={() => deleteClass(c.id)} className="text-[#B0532B] hover:text-[#8a3f21]"><Trash2 size={14} /></button>
                  </div>
                </div>
                {isPast && <span className="text-[10px] text-[#6E8F80] bg-[#F5F1E6] px-2 py-0.5 rounded-full mt-2 inline-block">Ended</span>}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ================= PARENT =================
function ParentView({ students, attendance, results, feeLedger, exams, examAttempts, notes, liveClasses, onOpenReportCard, onOpenBill }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const matches = query.length > 1 ? students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.admissionNo.toLowerCase().includes(query.toLowerCase())) : [];

  if (!selected) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Section title="Find your child">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8F80]" />
            <input autoFocus placeholder="Search by name or admission number" value={query} onChange={(e) => setQuery(e.target.value)} className={`w-full pl-9 ${inputCls}`} />
          </div>
          {matches.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)} className="w-full text-left bg-white border border-[#EFE9DA] rounded-lg px-4 py-3 mb-2 hover:border-[#C9A227] transition-colors">
              <div className="font-medium text-sm">{s.name}</div>
              <div className="text-xs text-[#6E8F80]">{s.className} · {s.admissionNo}</div>
            </button>
          ))}
          {query.length > 1 && matches.length === 0 && <EmptyState text="No student found with that name or admission number." />}
        </Section>
      </div>
    );
  }

  const studentAttendance = attendance.filter((a) => a.studentId === selected.id);
  const present = studentAttendance.filter((a) => a.status === "Present").length;
  const attendanceRate = studentAttendance.length ? Math.round((present / studentAttendance.length) * 100) : null;
  const studentResults = results.filter((r) => r.studentId === selected.id);
  const studentNotes = notes.filter((n) => n.className === selected.className).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const studentLiveClasses = liveClasses.filter((c) => c.className === selected.className).sort((a, b) => (a.dateTime || "").localeCompare(b.dateTime || ""));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <button onClick={() => setSelected(null)} className="text-xs text-[#6E8F80] hover:text-[#0B4F3C] mb-4 flex items-center gap-1"><X size={12} /> Search another child</button>
      <div className="bg-[#0B4F3C] text-white rounded-lg p-5 mb-6">
        <div className="font-serif text-xl">{selected.name}</div>
        <div className="text-[#8FB5A5] text-sm mt-1">{selected.className} · Adm. No. {selected.admissionNo}</div>
      </div>
      <Section title="Attendance">
        {attendanceRate === null ? <EmptyState text="No attendance recorded yet." /> : (
          <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-[#6E8F80]">{present} of {studentAttendance.length} days present</span>
            <span className="font-serif text-2xl text-[#0B4F3C]">{attendanceRate}%</span>
          </div>
        )}
      </Section>
      <Section title="Results">
        {studentResults.length === 0 ? <EmptyState text="No results entered yet." /> : (
          <>
            <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5">Subject</th><th className="text-left px-3 py-2.5">Term</th>
                  <th className="text-left px-3 py-2.5">C.A</th><th className="text-left px-3 py-2.5">CBT</th><th className="text-left px-3 py-2.5">Theory</th><th className="text-left px-3 py-2.5">Total</th>
                </tr></thead>
                <tbody>
                  {studentResults.map((r) => {
                    const cbt = getCbtScore(selected.id, r.subject, r.term, exams, examAttempts);
                    const total = resultTotal(r, cbt);
                    return (
                      <tr key={r.id} className="border-t border-[#EFE9DA]">
                        <td className="px-3 py-2.5">{r.subject}</td>
                        <td className="px-3 py-2.5 text-[#6E8F80]">{r.term}</td>
                        <td className="px-3 py-2.5">{r.ca || 0}</td>
                        <td className="px-3 py-2.5">{cbt === null ? "—" : cbt}</td>
                        <td className="px-3 py-2.5">{r.theory || 0}</td>
                        <td className="px-3 py-2.5 font-medium">{total}/100</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              {TERMS.filter((t) => studentResults.some((r) => r.term === t)).map((t) => (
                <button key={t} onClick={() => onOpenReportCard(selected.id, t)}
                  className="flex items-center gap-1.5 text-xs border border-[#0B4F3C]/30 text-[#0B4F3C] px-3 py-1.5 rounded-full hover:bg-[#0B4F3C]/5 transition-colors">
                  <Printer size={12} /> {t} report card
                </button>
              ))}
            </div>
          </>
        )}
      </Section>
      <Section title="Fees">
        {(() => {
          const studentEntries = ledgerFor(selected.id, feeLedger);
          const accountTotals = ledgerTotals(studentEntries);
          if (studentEntries.length === 0) return <EmptyState text="No fee records yet." />;
          return (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white border border-[#EFE9DA] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#6E8F80] uppercase">Charged</p>
                  <p className="text-sm font-medium text-[#1D2B26]">₦{accountTotals.charged.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-[#EFE9DA] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-[#6E8F80] uppercase">Paid</p>
                  <p className="text-sm font-medium text-[#1D2B26]">₦{accountTotals.paid.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg p-3 text-center border ${accountTotals.balance > 0 ? "bg-[#B0532B]/5 border-[#B0532B]/30" : "bg-white border-[#EFE9DA]"}`}>
                  <p className="text-[10px] text-[#6E8F80] uppercase">Balance</p>
                  <p className={`text-sm font-medium ${accountTotals.balance > 0 ? "text-[#B0532B]" : "text-[#0B4F3C]"}`}>{accountTotals.balance > 0 ? `₦${accountTotals.balance.toLocaleString()}` : "Clear"}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#6E8F80] mb-3">This balance covers all terms — a part-payment made in any term reduces it, even if it started as a previous term's bill.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {TERMS.map((t) => (
                  <button key={t} onClick={() => onOpenBill(selected.id, t)} className="flex items-center gap-1.5 text-xs border border-[#0B4F3C]/30 text-[#0B4F3C] px-3 py-1.5 rounded-full hover:bg-[#0B4F3C]/5 transition-colors">
                    <Printer size={12} /> {t} bill
                  </button>
                ))}
              </div>
              <div className="bg-white border border-[#EFE9DA] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {studentEntries.map((e) => (
                      <tr key={e.id} className="border-t border-[#EFE9DA] first:border-t-0">
                        <td className="px-3 py-2 text-[#6E8F80] whitespace-nowrap">{e.date}</td>
                        <td className="px-3 py-2">{e.description}</td>
                        <td className={`px-3 py-2 text-right whitespace-nowrap ${e.type === "payment" ? "text-[#0B4F3C]" : "text-[#B0532B]"}`}>
                          {e.type === "payment" ? `+₦${Number(e.amount).toLocaleString()}` : `₦${Number(e.amount).toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </Section>

      <Section title="Live Classes">
        {studentLiveClasses.length === 0 ? <EmptyState text="No live classes scheduled for this class yet." /> : (
          <div className="space-y-2">
            {studentLiveClasses.map((c) => <LiveClassCard key={c.id} liveClass={c} />)}
          </div>
        )}
      </Section>

      <Section title="E-Notes">
        {studentNotes.length === 0 ? <EmptyState text="No notes have been published for this class yet." /> : (
          <div className="space-y-2">
            {studentNotes.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </Section>
    </div>
  );
}
// ================= REPORT CARD (PRINT) =================
function ReportCardPrint({ student, term, results, attendance, feeLedger, exams, examAttempts, onBack }) {
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F1]">
        <div className="text-center">
          <p className="text-[#6E8F80] mb-3">Student not found.</p>
          <button onClick={onBack} className="text-sm text-[#0B4F3C] underline">Go back</button>
        </div>
      </div>
    );
  }

  const totalForSubjectTerm = (subject, t) => {
    const r = results.find((rr) => rr.studentId === student.id && rr.subject === subject && rr.term === t);
    if (!r) return null;
    const cbt = getCbtScore(student.id, subject, t, exams, examAttempts);
    return resultTotal(r, cbt);
  };

  const subjectsInTerm = [...new Set(results.filter((r) => r.studentId === student.id && r.term === term).map((r) => r.subject))];
  const termRows = subjectsInTerm.map((subject) => ({ subject, total: totalForSubjectTerm(subject, term) }));
  const average = termRows.length ? (termRows.reduce((sum, row) => sum + row.total, 0) / termRows.length).toFixed(1) : null;

  const isThirdTerm = term === "3rd Term";
  const allSubjects = isThirdTerm ? [...new Set(results.filter((r) => r.studentId === student.id).map((r) => r.subject))] : [];
  const cumulativeRows = isThirdTerm ? allSubjects.map((subject) => {
    const perTerm = TERMS.map((t) => totalForSubjectTerm(subject, t)).filter((v) => v !== null);
    return { subject, average: perTerm.length ? (perTerm.reduce((a, b) => a + b, 0) / perTerm.length).toFixed(1) : null };
  }).filter((r) => r.average !== null) : [];
  const cumulativeAverage = cumulativeRows.length ? (cumulativeRows.reduce((sum, r) => sum + Number(r.average), 0) / cumulativeRows.length).toFixed(1) : null;

  const studentAttendance = attendance.filter((a) => a.studentId === student.id);
  const present = studentAttendance.filter((a) => a.status === "Present").length;
  const attendanceRate = studentAttendance.length ? Math.round((present / studentAttendance.length) * 100) : null;
  const accountBalance = ledgerTotals(ledgerFor(student.id, feeLedger));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#E9E4D6] py-6 px-3">
      <style>{"@media print { .no-print { display: none !important; } .report-page { box-shadow: none !important; margin: 0 !important; } body { background: white !important; } }"}</style>

      <div className="no-print max-w-2xl mx-auto flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#136B50] transition-colors">
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="report-page max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="text-center border-b-2 border-[#0B4F3C] pb-4 mb-5">
          <p className="text-[#C9A227] text-xs tracking-[0.25em] uppercase mb-1">Bismillah</p>
          <h1 className="font-serif text-2xl text-[#0B4F3C]">Sealed Nectar Academy</h1>
          <p className="text-[#6E8F80] text-xs mt-1">Ota, Ogun State, Nigeria</p>
          <p className="text-[#1D2B26] text-sm font-medium mt-3 tracking-wide uppercase">Student Report Card — {term}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-6">
          <div><span className="text-[#6E8F80]">Name: </span><span className="font-medium">{student.name}</span></div>
          <div><span className="text-[#6E8F80]">Admission No: </span><span className="font-medium">{student.admissionNo}</span></div>
          <div><span className="text-[#6E8F80]">Class: </span><span className="font-medium">{student.className}{student.department ? ` (${student.department})` : ""}</span></div>
          <div><span className="text-[#6E8F80]">Date: </span><span className="font-medium">{today}</span></div>
        </div>

        {termRows.length === 0 ? (
          <p className="text-sm text-[#6E8F80] italic mb-6">No results have been entered for {term} yet.</p>
        ) : (
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2 border border-[#EFE9DA]">Subject</th>
                <th className="text-left px-3 py-2 border border-[#EFE9DA]">Total /100</th>
                <th className="text-left px-3 py-2 border border-[#EFE9DA]">Grade</th>
                <th className="text-left px-3 py-2 border border-[#EFE9DA]">Remark</th>
              </tr>
            </thead>
            <tbody>
              {termRows.map((row) => {
                const g = gradeFor(row.total);
                return (
                  <tr key={row.subject}>
                    <td className="px-3 py-2 border border-[#EFE9DA]">{row.subject}</td>
                    <td className="px-3 py-2 border border-[#EFE9DA]">{row.total}/100</td>
                    <td className="px-3 py-2 border border-[#EFE9DA] font-medium">{g.grade}</td>
                    <td className="px-3 py-2 border border-[#EFE9DA] text-[#6E8F80]">{g.remark}</td>
                  </tr>
                );
              })}
              <tr className="bg-[#F5F1E6] font-medium">
                <td className="px-3 py-2 border border-[#EFE9DA]">Average</td>
                <td className="px-3 py-2 border border-[#EFE9DA]" colSpan={3}>{average}/100 — {gradeFor(average).grade} ({gradeFor(average).remark})</td>
              </tr>
            </tbody>
          </table>
        )}

        {isThirdTerm && cumulativeRows.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-[#0B4F3C] uppercase tracking-wide mb-2">Annual Summary — Average of 1st, 2nd &amp; 3rd Term</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2 border border-[#EFE9DA]">Subject</th>
                  <th className="text-left px-3 py-2 border border-[#EFE9DA]">Annual Average /100</th>
                  <th className="text-left px-3 py-2 border border-[#EFE9DA]">Grade</th>
                </tr>
              </thead>
              <tbody>
                {cumulativeRows.map((row) => {
                  const g = gradeFor(row.average);
                  return (
                    <tr key={row.subject}>
                      <td className="px-3 py-2 border border-[#EFE9DA]">{row.subject}</td>
                      <td className="px-3 py-2 border border-[#EFE9DA]">{row.average}/100</td>
                      <td className="px-3 py-2 border border-[#EFE9DA] font-medium">{g.grade}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#F5F1E6] font-medium">
                  <td className="px-3 py-2 border border-[#EFE9DA]">Overall Annual Average</td>
                  <td className="px-3 py-2 border border-[#EFE9DA]" colSpan={2}>{cumulativeAverage}/100 — {gradeFor(cumulativeAverage).grade} ({gradeFor(cumulativeAverage).remark})</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div className="border border-[#EFE9DA] rounded-md p-3">
            <p className="text-[#6E8F80] text-xs uppercase mb-1">Attendance</p>
            <p className="font-medium">{attendanceRate === null ? "No record" : `${present}/${studentAttendance.length} days (${attendanceRate}%)`}</p>
          </div>
          <div className="border border-[#EFE9DA] rounded-md p-3">
            <p className="text-[#6E8F80] text-xs uppercase mb-1">Account Balance</p>
            <p className="font-medium">
              {accountBalance.charged === 0 && accountBalance.paid === 0 ? "No record" : (accountBalance.balance <= 0 ? "Fully paid" : `₦${accountBalance.balance.toLocaleString()} owing`)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-10 text-sm">
          <div className="border-t border-[#1D2B26] pt-1.5 text-[#6E8F80]">Class Teacher's Signature</div>
          <div className="border-t border-[#1D2B26] pt-1.5 text-[#6E8F80]">Principal's Signature</div>
        </div>
      </div>
    </div>
  );
    }
// ================= STUDENT =================
function StudentView({ student, exams, examAttempts, setExamAttempts, notes, liveClasses }) {
  const [activeExamId, setActiveExamId] = useState(null);
  const [tab, setTab] = useState("cbt");

  if (!student) return <div className="max-w-md mx-auto px-4 py-10"><EmptyState text="Your account could not be found. Contact admin." /></div>;

  if (activeExamId) {
    const exam = exams.find((e) => e.id === activeExamId);
    return <ExamTaker exam={exam} student={student} examAttempts={examAttempts} setExamAttempts={setExamAttempts} onDone={() => setActiveExamId(null)} />;
  }

  const myExams = exams.filter((e) => e.className === student.className);
  const attemptFor = (examId) => examAttempts.find((a) => a.studentId === student.id && a.examId === examId);
  const myNotes = notes.filter((n) => n.className === student.className).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const myLiveClasses = liveClasses.filter((c) => c.className === student.className).sort((a, b) => (a.dateTime || "").localeCompare(b.dateTime || ""));

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="text-sm text-[#6E8F80] mb-4">Welcome, <span className="text-[#0B4F3C] font-medium">{student.name}</span> · {student.className}</div>
      <div className="flex gap-1 mb-4 bg-[#EFE9DA] p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        {[{ key: "cbt", label: "CBT Exams" }, { key: "notes", label: "E-Notes" }, { key: "live", label: "Live Classes" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#0B4F3C] text-[#FBF8F1]" : "text-[#6E8F80]"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "cbt" && (
        <Section title="CBT Exams">
          {myExams.length === 0 ? <EmptyState text="No CBT exams available for your class yet." /> : (
            <div className="space-y-2">
              {myExams.map((e) => {
                const attempt = attemptFor(e.id);
                return (
                  <div key={e.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0B4F3C]/10 flex items-center justify-center flex-shrink-0"><HelpCircle size={16} className="text-[#0B4F3C]" /></div>
                      <div>
                        <div className="font-medium text-sm">{e.title}</div>
                        <div className="text-xs text-[#6E8F80] mt-0.5">{e.subject} · {e.term} · {e.questions.length} questions · {e.timeLimitMinutes} min</div>
                      </div>
                    </div>
                    {attempt ? (
                      <span className="text-xs bg-[#0B4F3C]/10 text-[#0B4F3C] px-2.5 py-1 rounded-full whitespace-nowrap">Score: {attempt.score}/{e.totalMarks}</span>
                    ) : (
                      <button onClick={() => setActiveExamId(e.id)} className="text-xs bg-[#C9A227] text-[#0B4F3C] font-medium px-3 py-1.5 rounded-full hover:brightness-95 transition-all whitespace-nowrap">Start exam</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {tab === "notes" && (
        <Section title="E-Notes">
          {myNotes.length === 0 ? <EmptyState text="No notes have been published for your class yet." /> : (
            <div className="space-y-2">
              {myNotes.map((n) => <NoteCard key={n.id} note={n} />)}
            </div>
          )}
        </Section>
      )}

      {tab === "live" && (
        <Section title="Live Classes">
          {myLiveClasses.length === 0 ? <EmptyState text="No live classes scheduled for your class yet." /> : (
            <div className="space-y-2">
              {myLiveClasses.map((c) => <LiveClassCard key={c.id} liveClass={c} />)}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function NoteCard({ note }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#EFE9DA] rounded-lg p-4">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <p className="font-medium text-sm">{note.title}</p>
        <p className="text-xs text-[#6E8F80] mt-0.5">{note.subject} · {note.term}</p>
      </button>
      {open ? (
        <p className="text-sm text-[#1D2B26] mt-3 whitespace-pre-wrap">{note.content}</p>
      ) : (
        <p className="text-xs text-[#6E8F80] mt-2 line-clamp-2 whitespace-pre-wrap">{note.content}</p>
      )}
      <button onClick={() => setOpen(!open)} className="text-xs text-[#0B4F3C] hover:underline mt-2">{open ? "Show less" : "Read more"}</button>
    </div>
  );
}

function LiveClassCard({ liveClass }) {
  const isPast = liveClass.dateTime && new Date(liveClass.dateTime) < new Date();
  return (
    <div className={`bg-white border border-[#EFE9DA] rounded-lg p-4 ${isPast ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{liveClass.title}</p>
          <p className="text-xs text-[#6E8F80] mt-0.5">{liveClass.subject} · {liveClass.dateTime ? new Date(liveClass.dateTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "No time set"}</p>
          {liveClass.details && <p className="text-xs text-[#6E8F80] mt-1">{liveClass.details}</p>}
        </div>
        {isPast ? (
          <span className="text-[10px] text-[#6E8F80] bg-[#F5F1E6] px-2.5 py-1 rounded-full whitespace-nowrap">Ended</span>
        ) : (
          <a href={liveClass.link} target="_blank" rel="noopener noreferrer" className="text-xs bg-[#C9A227] text-[#0B4F3C] font-medium px-3 py-1.5 rounded-full hover:brightness-95 transition-all whitespace-nowrap">Join</a>
        )}
      </div>
    </div>
  );
}

function ExamTaker({ exam, student, examAttempts, setExamAttempts, onDone }) {
  const [answers, setAnswers] = useState(Array(exam.questions.length).fill(null));
  const [secondsLeft, setSecondsLeft] = useState(Number(exam.timeLimitMinutes) * 60);
  const [result, setResult] = useState(null);
  const answersRef = useRef(answers);
  const submittedRef = useRef(false);

  const setAnswer = (qi, oi) => {
    const next = [...answersRef.current];
    next[qi] = oi;
    answersRef.current = next;
    setAnswers(next);
  };

  const handleSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const correct = exam.questions.reduce((count, q, i) => count + (answersRef.current[i] === q.correctIndex ? 1 : 0), 0);
    const score = Math.round((correct / exam.questions.length) * Number(exam.totalMarks));
    const attempt = { id: uid(), examId: exam.id, studentId: student.id, score, correctCount: correct, totalQuestions: exam.questions.length, submittedAt: new Date().toISOString() };
    setExamAttempts([...examAttempts, attempt]);
    setResult({ score, correct, total: exam.questions.length });
  };

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white border border-[#EFE9DA] rounded-xl p-6">
          <p className="text-sm text-[#6E8F80] mb-1">{exam.title}</p>
          <p className="font-serif text-4xl text-[#0B4F3C] my-3">{result.score}/{exam.totalMarks}</p>
          <p className="text-xs text-[#6E8F80] mb-5">{result.correct} of {result.total} answered correctly</p>
          <button onClick={onDone} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-2.5 hover:bg-[#136B50] transition-colors">Back to exams</button>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="sticky top-0 z-10 bg-[#FBF8F1] pb-3 pt-1 flex items-center justify-between border-b border-[#EFE9DA] mb-4">
        <div>
          <p className="font-serif text-lg text-[#0B4F3C]">{exam.title}</p>
          <p className="text-xs text-[#6E8F80]">{exam.subject} · {exam.questions.length} questions</p>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${secondsLeft < 60 ? "bg-[#B0532B]/10 text-[#B0532B]" : "bg-[#0B4F3C]/10 text-[#0B4F3C]"}`}>
          <Clock size={14} /> {mm}:{ss}
        </div>
      </div>
      <div className="space-y-4 mb-6">
        {exam.questions.map((q, qi) => (
          <div key={q.id} className="bg-white border border-[#EFE9DA] rounded-lg p-4">
            <p className="text-sm font-medium mb-3">{qi + 1}. {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${answers[qi] === oi ? "border-[#0B4F3C] bg-[#0B4F3C]/5" : "border-[#EFE9DA]"}`}>
                  <input type="radio" name={`q-${q.id}`} checked={answers[qi] === oi} onChange={() => setAnswer(qi, oi)} className="accent-[#0B4F3C]" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSubmit} className="w-full bg-[#0B4F3C] text-white text-sm font-medium rounded-md py-3 hover:bg-[#136B50] transition-colors">Submit exam</button>
    </div>
  );
}

// ================= BROADSHEET (PRINT) =================
function rankRows(rows) {
  const ranked = [...rows].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  let rank = 0;
  let prevAvg = null;
  ranked.forEach((row, i) => {
    if (row.average === null) { row.position = "—"; return; }
    if (row.average !== prevAvg) { rank = i + 1; prevAvg = row.average; }
    row.position = rank;
  });
  return ranked;
}

function BillPrint({ student, term, feeLedger, feeStructures, onBack }) {
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F1]">
        <div className="text-center">
          <p className="text-[#6E8F80] mb-3">Student not found.</p>
          <button onClick={onBack} className="text-sm text-[#0B4F3C] underline">Go back</button>
        </div>
      </div>
    );
  }
  const structure = feeStructures.find((f) => f.className === student.className && f.term === term);
  const items = structure ? structure.items : [];
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const entries = ledgerFor(student.id, feeLedger);
  const account = ledgerTotals(entries);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#E9E4D6] py-6 px-3">
      <style>{"@media print { .no-print { display: none !important; } .bill-page { box-shadow: none !important; margin: 0 !important; } body { background: white !important; } }"}</style>

      <div className="no-print max-w-md mx-auto flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#136B50] transition-colors">
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="bill-page max-w-md mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="text-center border-b-2 border-[#0B4F3C] pb-4 mb-5">
          <p className="text-[#C9A227] text-xs tracking-[0.25em] uppercase mb-1">Bismillah</p>
          <h1 className="font-serif text-2xl text-[#0B4F3C]">Sealed Nectar Academy</h1>
          <p className="text-[#6E8F80] text-xs mt-1">Ota, Ogun State, Nigeria</p>
          <p className="text-[#1D2B26] text-sm font-medium mt-3 tracking-wide uppercase">School Bill — {term}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-6">
          <div><span className="text-[#6E8F80]">Name: </span><span className="font-medium">{student.name}</span></div>
          <div><span className="text-[#6E8F80]">Admission No: </span><span className="font-medium">{student.admissionNo}</span></div>
          <div><span className="text-[#6E8F80]">Class: </span><span className="font-medium">{student.className}{student.department ? ` (${student.department})` : ""}</span></div>
          <div><span className="text-[#6E8F80]">Date: </span><span className="font-medium">{today}</span></div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[#6E8F80] italic mb-6">No fee items have been set for {student.className} — {term} yet.</p>
        ) : (
          <table className="w-full text-sm mb-4 border-collapse">
            <thead>
              <tr className="bg-[#F5F1E6] text-[#6E8F80] text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2 border border-[#EFE9DA]">Item</th>
                <th className="text-right px-3 py-2 border border-[#EFE9DA]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 border border-[#EFE9DA]">{it.name}</td>
                  <td className="px-3 py-2 border border-[#EFE9DA] text-right">₦{Number(it.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-[#F5F1E6] font-medium">
                <td className="px-3 py-2 border border-[#EFE9DA]">Total</td>
                <td className="px-3 py-2 border border-[#EFE9DA] text-right">₦{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="border border-[#EFE9DA] rounded-md p-3">
            <p className="text-[#6E8F80] text-xs uppercase mb-1">Total Charged</p>
            <p className="font-medium">₦{account.charged.toLocaleString()}</p>
          </div>
          <div className="border border-[#EFE9DA] rounded-md p-3">
            <p className="text-[#6E8F80] text-xs uppercase mb-1">Total Paid</p>
            <p className="font-medium">₦{account.paid.toLocaleString()}</p>
          </div>
          <div className={`border rounded-md p-3 ${account.balance > 0 ? "border-[#B0532B]/30 bg-[#B0532B]/5" : "border-[#EFE9DA]"}`}>
            <p className="text-[#6E8F80] text-xs uppercase mb-1">Account Balance</p>
            <p className={`font-medium ${account.balance > 0 ? "text-[#B0532B]" : "text-[#0B4F3C]"}`}>{account.balance > 0 ? `₦${account.balance.toLocaleString()} owing` : "Fully paid"}</p>
          </div>
        </div>
        <p className="text-[10px] text-[#6E8F80] mb-6">Account balance covers all terms to date — payments made in any term reduce this total.</p>

        {entries.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-[#0B4F3C] uppercase tracking-wide mb-2">Payment History</p>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-[#EFE9DA]">
                    <td className="px-2 py-1.5 text-[#6E8F80]">{e.date}</td>
                    <td className="px-2 py-1.5">{e.description}</td>
                    <td className="px-2 py-1.5 text-right">{e.type === "charge" ? `₦${Number(e.amount).toLocaleString()} charged` : `₦${Number(e.amount).toLocaleString()} paid`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-6 text-sm">
          <div className="border-t border-[#1D2B26] pt-1.5 text-[#6E8F80]">Bursar's Signature</div>
          <div className="border-t border-[#1D2B26] pt-1.5 text-[#6E8F80]">Parent/Guardian Signature</div>
        </div>
      </div>
    </div>
  );
}

function BroadsheetPrint({ className, department, term, students, results, exams, examAttempts, onBack }) {
  const classStudents = students.filter((s) => s.className === className && (department ? s.department === department : true));
  const subjects = [...new Set(classStudents.flatMap((s) => subjectsForStudent(s)))];

  const studentSubjectTotal = (studentId, subject, t) => {
    const r = results.find((rr) => rr.studentId === studentId && rr.subject === subject && rr.term === t);
    if (!r) return null;
    const cbt = getCbtScore(studentId, subject, t, exams, examAttempts);
    return resultTotal(r, cbt);
  };

  const rows = classStudents.map((s) => {
    const subjectTotals = subjects.map((subj) => studentSubjectTotal(s.id, subj, term));
    const valid = subjectTotals.filter((v) => v !== null);
    const average = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    return { student: s, subjectTotals, average: average !== null ? Math.round(average * 10) / 10 : null };
  });
  const ranked = rankRows(rows);

  const isThirdTerm = term === "3rd Term";
  let cumulativeRanked = [];
  if (isThirdTerm) {
    const cumulativeSubjectAvg = (studentId, subject) => {
      const perTerm = TERMS.map((t) => studentSubjectTotal(studentId, subject, t)).filter((v) => v !== null);
      return perTerm.length ? perTerm.reduce((a, b) => a + b, 0) / perTerm.length : null;
    };
    const cumRows = classStudents.map((s) => {
      const subjectAvgs = subjects.map((subj) => cumulativeSubjectAvg(s.id, subj));
      const valid = subjectAvgs.filter((v) => v !== null);
      const average = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
      return { student: s, subjectTotals: subjectAvgs.map((v) => v !== null ? Math.round(v * 10) / 10 : null), average: average !== null ? Math.round(average * 10) / 10 : null };
    });
    cumulativeRanked = rankRows(cumRows);
  }

  const heading = `${className}${department ? ` — ${department}` : ""}`;

  const Table = ({ rows: tableRows, title }) => (
    <div className="mb-8">
      {title && <p className="text-xs font-medium text-[#0B4F3C] uppercase tracking-wide mb-2">{title}</p>}
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-[#F5F1E6] text-[#6E8F80] text-[10px] uppercase tracking-wide">
              <th className="text-left px-2 py-2 border border-[#EFE9DA] sticky left-0 bg-[#F5F1E6] z-10">Student</th>
              {subjects.map((subj) => <th key={subj} className="text-center px-2 py-2 border border-[#EFE9DA] whitespace-nowrap">{subj}</th>)}
              <th className="text-center px-2 py-2 border border-[#EFE9DA]">Avg</th>
              <th className="text-center px-2 py-2 border border-[#EFE9DA]">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.student.id}>
                <td className="px-2 py-2 border border-[#EFE9DA] font-medium whitespace-nowrap sticky left-0 bg-white z-10">{row.student.name}</td>
                {row.subjectTotals.map((v, i) => <td key={i} className="text-center px-2 py-2 border border-[#EFE9DA]">{v === null ? "—" : v}</td>)}
                <td className="text-center px-2 py-2 border border-[#EFE9DA] font-medium">{row.average === null ? "—" : row.average}</td>
                <td className="text-center px-2 py-2 border border-[#EFE9DA] font-medium text-[#0B4F3C]">{row.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#E9E4D6] py-6 px-3">
      <style>{"@media print { .no-print { display: none !important; } .report-page { box-shadow: none !important; margin: 0 !important; } body { background: white !important; } }"}</style>

      <div className="no-print max-w-4xl mx-auto flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#136B50] transition-colors">
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="report-page max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <div className="text-center border-b-2 border-[#0B4F3C] pb-4 mb-6">
          <p className="text-[#C9A227] text-xs tracking-[0.25em] uppercase mb-1">Bismillah</p>
          <h1 className="font-serif text-2xl text-[#0B4F3C]">Sealed Nectar Academy</h1>
          <p className="text-[#6E8F80] text-xs mt-1">Ota, Ogun State, Nigeria</p>
          <p className="text-[#1D2B26] text-sm font-medium mt-3 tracking-wide uppercase">{heading} — {term} Broadsheet</p>
        </div>

        {classStudents.length === 0 ? (
          <EmptyState text="No students found for this class/department." />
        ) : (
          <>
            <Table rows={ranked} />
            {isThirdTerm && cumulativeRanked.length > 0 && (
              <Table rows={cumulativeRanked} title="Annual Broadsheet — Average of 1st, 2nd & 3rd Term" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ================= ID CARDS (PRINT) =================
function initials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}
function academicSession() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
const CARD_STYLE = { width: "3.375in", height: "2.125in", breakInside: "avoid" };

function IdCardFront({ type, item }) {
  const isStudent = type === "student";
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#EFE9DA] shadow-sm" style={CARD_STYLE}>
      <div className="bg-[#0B4F3C] px-3 py-2 flex items-center gap-1.5">
        <Rosette size={12} className="text-[#C9A227]" />
        <span className="text-[#FBF8F1] text-[10px] font-serif tracking-wide">Sealed Nectar Academy</span>
      </div>
      <div className="flex gap-3 px-3 py-2.5">
        {item.photo ? (
          <img src={item.photo} alt={item.name} className="w-14 h-16 rounded-md object-cover border-2 border-[#C9A227] flex-shrink-0" />
        ) : (
          <div className="w-14 h-16 rounded-md bg-[#C9A227]/20 border-2 border-[#C9A227] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0B4F3C] font-serif text-lg">{initials(item.name)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[#1D2B26] font-medium text-sm leading-tight truncate">{item.name}</p>
          <p className="text-[9px] uppercase tracking-wide text-[#C9A227] font-medium mt-0.5">{isStudent ? "Student" : "Staff"}</p>
          {isStudent ? (
            <>
              <p className="text-[10px] text-[#6E8F80] mt-1.5">Class: <span className="text-[#1D2B26]">{item.className}{item.department ? ` (${item.department})` : ""}</span></p>
              <p className="text-[10px] text-[#6E8F80]">Adm. No: <span className="text-[#1D2B26]">{item.admissionNo}</span></p>
            </>
          ) : (
            <>
              <p className="text-[10px] text-[#6E8F80] mt-1.5 truncate">Subjects: <span className="text-[#1D2B26]">{(item.subjects || []).slice(0, 2).join(", ") || "—"}</span></p>
              <p className="text-[10px] text-[#6E8F80] truncate">Classes: <span className="text-[#1D2B26]">{(item.classes || []).join(", ") || "—"}</span></p>
            </>
          )}
        </div>
      </div>
      <div className="px-3 py-1 bg-[#F5F1E6] border-t border-[#EFE9DA] flex items-center justify-between">
        <span className="text-[8px] text-[#6E8F80]">Ota, Ogun State</span>
        <span className="text-[8px] text-[#6E8F80]">{academicSession()} Session</span>
      </div>
    </div>
  );
}

function IdCardBack({ item, schoolSettings }) {
  const statement = schoolSettings.statement?.trim() ||
    "This card certifies that the bearer is a bona fide member of Sealed Nectar Academy. If found, kindly return to the school address below.";
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#EFE9DA] shadow-sm flex flex-col justify-between px-3 py-2.5" style={CARD_STYLE}>
      <div>
        <p className="text-[8px] text-[#1D2B26] leading-snug">{statement}</p>
        <div className="mt-2 text-[8px] text-[#6E8F80] leading-snug">
          <p>{schoolSettings.address}</p>
          {schoolSettings.phone && <p>Tel: {schoolSettings.phone}</p>}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div className="flex-1">
          <div className="h-8 flex items-end">
            {item.signature && <img src={item.signature} alt="Holder signature" className="h-7 object-contain" />}
          </div>
          <div className="border-t border-[#1D2B26] pt-0.5"><span className="text-[7px] text-[#6E8F80]">Holder's Signature</span></div>
        </div>
        <div className="flex-1">
          <div className="h-8 flex items-end">
            {schoolSettings.directorSignature && <img src={schoolSettings.directorSignature} alt="Director signature" className="h-7 object-contain" />}
          </div>
          <div className="border-t border-[#1D2B26] pt-0.5">
            <span className="text-[7px] text-[#6E8F80]">{schoolSettings.directorName || schoolSettings.directorTitle || "Director of Studies"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdCardPrint({ type, items, schoolSettings, onBack }) {
  return (
    <div className="min-h-screen bg-[#E9E4D6] py-6 px-3">
      <style>{"@media print { .no-print { display: none !important; } body { background: white !important; } }"}</style>

      <div className="no-print max-w-3xl mx-auto flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B4F3C] hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#0B4F3C] text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#136B50] transition-colors">
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      {items.length === 0 ? (
        <div className="max-w-md mx-auto"><EmptyState text="No records selected." /></div>
      ) : (
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 justify-center">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2">
              <IdCardFront type={type} item={item} />
              <IdCardBack item={item} schoolSettings={schoolSettings} />
            </div>
          ))}
        </div>
      )}
      <p className="no-print max-w-3xl mx-auto text-center text-xs text-[#6E8F80] mt-4">Front (left) and back (right) print together — laminate both sides per card.</p>
    </div>
  );
                                                    }
