import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calendar, Clock, BarChart3, Save, Briefcase, Download, Loader2, LogOut, User, Lock, Mail, Building2, ChevronDown, Check } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';

const WorkLogApp = () => {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- App Data State ---
  const [entries, setEntries] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  
  // --- View State (Context) ---
  const [currentJob, setCurrentJob] = useState(''); // העבודה שנבחרה כרגע לצפייה
  const [isJobMenuOpen, setIsJobMenuOpen] = useState(false); // לפתיחת תפריט העבודות
  const [newJobName, setNewJobName] = useState(''); // ליצירת עבודה חדשה
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // --- Form State ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    setDataLoading(true);
    
    // מביאים את הכל - הסינון יתבצע בקוד כדי לאפשר מעבר מהיר בין עבודות
    const q = query(
      collection(db, "workEntries"), 
      where("uid", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        job: doc.data().job || 'עבודה 1' // תאימות לאחור
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)); 

      setEntries(entriesData);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. חישוב רשימת העבודות + הגדרת ברירת מחדל
  const jobList = useMemo(() => {
    const jobs = new Set(['עבודה 1']); // תמיד תהיה לפחות אחת
    entries.forEach(entry => {
      if (entry.job) jobs.add(entry.job);
    });
    return Array.from(jobs).sort();
  }, [entries]);

  // אם אין עבודה נבחרה (בטעינה ראשונית), בחר את הראשונה ברשימה
  useEffect(() => {
    if (!currentJob && jobList.length > 0) {
      setCurrentJob(jobList[0]);
    }
  }, [jobList, currentJob]);

  // 4. נתונים מסוננים לפי העבודה הנוכחית
  const currentJobEntries = useMemo(() => {
    return entries.filter(entry => entry.job === currentJob);
  }, [entries, currentJob]);

  const totalHours = currentJobEntries.reduce((sum, entry) => sum + entry.hours, 0);

  // --- Handlers ---

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה בהתחברות/הרשמה. בדוק את הפרטים ונסה שוב.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setCurrentJob('');
  };

  const handleCreateJob = () => {
    if (newJobName.trim()) {
      setCurrentJob(newJobName.trim()); // מעבר לעבודה החדשה
      setNewJobName('');
      setIsCreatingJob(false);
      setIsJobMenuOpen(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!date || !hours || parseFloat(hours) <= 0) return;

    try {
      await addDoc(collection(db, "workEntries"), {
        uid: user.uid,
        date,
        hours: parseFloat(hours),
        description: description || 'ללא תיאור',
        job: currentJob, // הוספה אוטומטית למסך הנוכחי!
        createdAt: new Date()
      });
      setHours('');
      setDescription('');
    } catch (error) {
      alert("שגיאה בשמירה");
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('למחוק רשומה זו?')) {
      await deleteDoc(doc(db, "workEntries", id));
    }
  };

  const handleExportToExcel = () => {
    const selectedDate = new Date(date);
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    
    // מייצאים רק את העבודה הנוכחית!
    const monthlyEntries = currentJobEntries.filter(entry => {
      const d = new Date(entry.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (monthlyEntries.length === 0) {
      alert(`אין נתונים ב-${currentJob} לחודש זה`);
      return;
    }

    const dataForExcel = monthlyEntries.map(e => ({
      "תאריך": e.date,
      "שעות": e.hours,
      "תיאור": e.description
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    worksheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentJob); // שם הגיליון כשם העבודה
    XLSX.writeFile(workbook, `${currentJob}_${targetYear}_${targetMonth + 1}.xlsx`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });

  // --- Views ---

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <Loader2 className="animate-spin w-10 h-10" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          {/* מסך לוגין זהה לקודם */}
          <div className="text-center mb-8">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isLoginView ? 'התחברות למערכת' : 'הרשמה חדשה'}
            </h1>
            <p className="text-slate-500 mt-2">ניהול שעות עבודה בענן</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">אימייל</label>
              <input type="email" required className="w-full px-4 py-3 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">סיסמה</label>
              <input type="password" required minLength="6" className="w-full px-4 py-3 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">
              {isLoginView ? 'התחבר' : 'הירשם'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLoginView(!isLoginView)} className="text-emerald-600 hover:underline text-sm font-medium">
              {isLoginView ? 'אין לך חשבון? הירשם כאן' : 'יש לך חשבון? התחבר כאן'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex justify-center bg-slate-900 p-4 md:p-8 font-sans items-start pt-10" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-visible border border-slate-700 relative">
        
        {/* --- Header & Navigation --- */}
        <header className="bg-emerald-600 text-white p-6 rounded-t-2xl relative z-20">
          <div className="flex justify-between items-start mb-6">
            <div className="relative">
              <p className="text-emerald-100 text-xs opacity-90 mb-1">עבודה נוכחית:</p>
              
              {/* Dropdown Toggle */}
              <button 
                onClick={() => setIsJobMenuOpen(!isJobMenuOpen)}
                className="flex items-center gap-2 text-2xl font-bold hover:text-emerald-100 transition-colors focus:outline-none"
              >
                <Briefcase className="w-6 h-6" />
                {currentJob}
                <ChevronDown className={`w-5 h-5 transition-transform ${isJobMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isJobMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {jobList.map((job) => (
                      <button
                        key={job}
                        onClick={() => { setCurrentJob(job); setIsJobMenuOpen(false); }}
                        className={`w-full text-right px-4 py-2 rounded-lg flex items-center justify-between ${currentJob === job ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        {job}
                        {currentJob === job && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                  
                  {/* Create New Job Area */}
                  <div className="border-t border-slate-100 p-3 bg-slate-50">
                    {isCreatingJob ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="שם עבודה חדשה..."
                          className="w-full px-3 py-2 text-sm border rounded bg-white outline-none focus:border-emerald-500"
                          value={newJobName}
                          onChange={(e) => setNewJobName(e.target.value)}
                        />
                        <button 
                          onClick={handleCreateJob}
                          className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded hover:bg-emerald-700"
                        >
                          צור עבודה
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsCreatingJob(true)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-emerald-600 font-bold py-2 hover:bg-emerald-100 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" /> עבודה חדשה
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleLogout} title="התנתק" className="bg-emerald-800/50 p-2 rounded-lg hover:bg-emerald-800 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Stats for Current Job */}
          <div className="flex gap-4">
             <div className="bg-white/10 px-5 py-3 rounded-xl backdrop-blur-md flex-1">
                <span className="text-emerald-100 text-xs font-bold uppercase block mb-1">סה״כ שעות ({currentJob})</span>
                <span className="text-3xl font-bold">{totalHours}</span>
             </div>
          </div>
        </header>

        <div className="p-6 bg-slate-50 min-h-[500px]">
          
          {/* Input Form (Simplified - No Job Selection!) */}
          <section className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600"/> דיווח ל-{currentJob}
              </h2>
              <button onClick={handleExportToExcel} className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50">
                <Download className="w-3 h-3" /> אקסל
              </button>
            </div>
            
            <form onSubmit={handleAddEntry} className="flex flex-col md:grid md:grid-cols-12 gap-4">
              <div className="w-full md:col-span-5 relative">
                <label className="sr-only">תאריך</label>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                <input 
                  type="date" required value={date} onChange={(e) => setDate(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded-lg py-3 pr-10 pl-4 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none min-h-[50px] text-base"
                  style={{ WebkitAppearance: 'none' }} 
                />
              </div>

              <div className="w-full md:col-span-3 relative">
                <label className="sr-only">שעות</label>
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none md:hidden" />
                <input 
                  type="number" step="0.5" min="0" required placeholder="שעות" 
                  value={hours} onChange={(e) => setHours(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded-lg py-3 pr-10 pl-4 md:pr-4 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[50px] text-base" 
                />
              </div>

              <div className="w-full md:col-span-4">
                <label className="sr-only">תיאור</label>
                <input 
                  type="text" placeholder="תיאור (מה עשית?)" 
                  value={description} onChange={(e) => setDescription(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[50px] text-base" 
                />
              </div>

              <div className="w-full md:col-span-12 mt-2">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow transition-all flex justify-center gap-2 items-center min-h-[50px]">
                  <Save className="w-5 h-5" /> הוסף דיווח ל-{currentJob}
                </button>
              </div>
            </form>
          </section>

          {/* List Section (Filtered) */}
          <section>
             <h2 className="font-bold text-slate-700 mb-2 flex justify-between">
               <span>היסטוריה ({currentJob})</span>
               <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">{currentJobEntries.length}</span>
             </h2>
             <div className="space-y-2 max-h-[350px] overflow-y-auto pl-1 custom-scrollbar">
               {dataLoading ? (
                  <div className="text-center py-4"><Loader2 className="animate-spin w-6 h-6 mx-auto text-emerald-600"/></div>
               ) : currentJobEntries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm">עדיין לא דווחו שעות ב-{currentJob}</p>
                    <p className="text-xs mt-1">השתמש בטופס למעלה כדי להתחיל</p>
                  </div>
               ) : (
                currentJobEntries.map((entry) => (
                  <div key={entry.id} className="bg-white p-3 rounded border flex justify-between items-center hover:shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-emerald-50 text-emerald-700 font-bold w-10 h-10 rounded flex items-center justify-center shrink-0">
                        {entry.hours}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-700 text-sm">
                          <span className="md:hidden">
                            {new Date(entry.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="hidden md:inline">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs truncate max-w-[200px]">{entry.description}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEntry(entry.id)} 
                      className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors shrink-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
               )}
             </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default WorkLogApp;