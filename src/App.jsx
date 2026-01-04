import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, BarChart3, Save, Briefcase, Download, Loader2, LogOut, User, Lock, Mail } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';

const WorkLogApp = () => {
  // --- ניהול משתמשים (Auth) ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- ניהול הנתונים (App) ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    setDataLoading(true);
    
    // שאילתה ללא מיון כדי למנוע שגיאת אינדקס בהתחלה
    const q = query(
      collection(db, "workEntries"), 
      where("uid", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // מיון בצד לקוח (JavaScript)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); 

      setEntries(entriesData);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
      alert(isLoginView ? "שגיאה בהתחברות (בדוק אימייל וסיסמה)" : "שגיאה בהרשמה (הסיסמה צריכה להיות לפחות 6 תווים)");
    }
  };

  const handleLogout = () => {
    signOut(auth);
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
        createdAt: new Date()
      });
      setHours('');
      setDescription('');
      
      // הודעה לקוראי מסך על הצלחה (אופציונלי - ניתן להוסיף רכיב Live Region בעתיד)
    } catch (error) {
      alert("שגיאה בשמירה");
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק רשומה זו?')) {
      await deleteDoc(doc(db, "workEntries", id));
    }
  };

  const handleExportToExcel = () => {
    const selectedDate = new Date(date);
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    const monthlyEntries = entries.filter(entry => {
      const d = new Date(entry.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (monthlyEntries.length === 0) {
      alert("אין נתונים לייצוא בחודש זה");
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "שעות");
    XLSX.writeFile(workbook, `work_log_${targetYear}_${targetMonth + 1}.xlsx`);
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const formatDate = (d) => new Date(d).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });

  // --- מסך טעינה נגיש ---
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white" role="status" aria-label="טוען נתונים">
      <Loader2 className="animate-spin w-10 h-10" aria-hidden="true" />
      <span className="sr-only">טוען...</span>
    </div>
  );

  // --- מסך התחברות נגיש ---
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800" tabIndex="-1">
              {isLoginView ? 'התחברות למערכת' : 'הרשמה חדשה'}
            </h1>
            <p className="text-slate-500 mt-2">ניהול שעות עבודה בענן</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input 
                  id="email"
                  type="email" 
                  required 
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                <input 
                  id="password"
                  type="password" 
                  required 
                  minLength="6"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none"
            >
              {isLoginView ? 'התחבר' : 'הירשם'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-emerald-600 hover:underline text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2"
            >
              {isLoginView ? 'אין לך חשבון? הירשם כאן' : 'יש לך חשבון? התחבר כאן'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- מסך אפליקציה נגיש ---
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 md:p-8 font-sans" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header */}
        <header className="bg-emerald-600 text-white p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6" aria-hidden="true" />
              יומן שעות
            </h1>
            <p className="text-emerald-100 text-sm opacity-90 mt-1">
              מחובר בתור: <span className="font-semibold">{user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md" role="status" aria-label={`סה"כ שעות: ${totalHours}`}>
                <span className="block text-xl font-bold text-center" aria-hidden="true">{totalHours}</span>
                <span className="text-[10px] uppercase opacity-80" aria-hidden="true">סה״כ</span>
             </div>
             <button 
                onClick={handleLogout} 
                className="bg-emerald-800/50 p-2 rounded-lg hover:bg-emerald-800 transition-colors focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 outline-none" 
                aria-label="התנתק מהמערכת"
                title="התנתק"
             >
               <LogOut className="w-5 h-5" aria-hidden="true" />
             </button>
          </div>
        </header>

        <div className="p-6 bg-slate-50">
          {/* Input Form Section */}
          <section className="bg-white rounded-xl shadow-sm border p-6 mb-6" aria-labelledby="new-entry-title">
            <div className="flex justify-between items-center mb-4">
              <h2 id="new-entry-title" className="font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" aria-hidden="true"/> 
                דיווח חדש
              </h2>
              <button 
                onClick={handleExportToExcel} 
                className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 outline-none"
                aria-label="ייצא נתונים לקובץ אקסל"
              >
                <Download className="w-3 h-3" aria-hidden="true" /> אקסל
              </button>
            </div>
            
            <form onSubmit={handleAddEntry} className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <label htmlFor="date-input" className="sr-only">תאריך</label>
                <input 
                  id="date-input"
                  type="date" 
                  required 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 outline-none" 
                />
              </div>
              <div className="col-span-3">
                <label htmlFor="hours-input" className="sr-only">שעות</label>
                <input 
                  id="hours-input"
                  type="number" 
                  step="0.5" 
                  min="0" 
                  required 
                  placeholder="שעות" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 outline-none" 
                />
              </div>
              <div className="col-span-4">
                <label htmlFor="desc-input" className="sr-only">תיאור</label>
                <input 
                  id="desc-input"
                  type="text" 
                  placeholder="תיאור" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 outline-none" 
                />
              </div>
              <div className="col-span-12">
                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded shadow transition-all flex justify-center gap-2 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 outline-none"
                >
                  <Save className="w-4 h-4" aria-hidden="true" /> שמירה
                </button>
              </div>
            </form>
          </section>

          {/* List Section */}
          <section aria-labelledby="history-title">
             <h2 id="history-title" className="font-bold text-slate-700 mb-2 flex justify-between">
               <span>היסטוריה</span>
               <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full" aria-label={`${entries.length} רשומות`}>{entries.length}</span>
             </h2>
             <div className="space-y-2 max-h-[350px] overflow-y-auto pl-1 custom-scrollbar" role="list">
               {dataLoading ? (
                  <div className="text-center py-4" role="status">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-emerald-600" aria-hidden="true"/>
                    <span className="sr-only">טוען נתונים...</span>
                  </div>
               ) : entries.length === 0 ? (
                  <p className="text-center text-slate-400 py-4 text-sm">אין נתונים להצגה</p>
               ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="bg-white p-3 rounded border flex justify-between items-center hover:shadow-sm" role="listitem">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 text-emerald-700 font-bold w-10 h-10 rounded flex items-center justify-center" aria-label={`${entry.hours} שעות`}>
                        {entry.hours}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{formatDate(entry.date)}</div>
                        <div className="text-slate-500 text-xs">{entry.description}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEntry(entry.id)} 
                      className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 focus:ring-2 focus:ring-red-500 outline-none transition-colors"
                      aria-label={`מחק רשומה מתאריך ${formatDate(entry.date)}`}
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
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