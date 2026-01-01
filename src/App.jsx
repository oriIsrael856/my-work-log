import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, FileText, BarChart3, Save, Briefcase, Moon, Sun } from 'lucide-react';

const WorkLogApp = () => {
  // State for form inputs
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  
  // State for stored entries
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('workLogEntries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
    setLoading(false);
  }, []);

  // Save to local storage whenever entries change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('workLogEntries', JSON.stringify(entries));
    }
  }, [entries, loading]);

  const handleAddEntry = (e) => {
    e.preventDefault();

    if (!date || !hours || parseFloat(hours) <= 0) {
      alert('נא למלא תאריך וכמות שעות תקינה');
      return;
    }

    const newEntry = {
      id: Date.now(),
      date,
      hours: parseFloat(hours),
      description: description || 'ללא תיאור'
    };

    // Add new entry and sort by date (newest first)
    const updatedEntries = [...entries, newEntry].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setEntries(updatedEntries);
    setHours('');
    setDescription('');
  };

  const handleDeleteEntry = (id) => {
    if (window.confirm('האם למחוק רשומה זו?')) {
      const updatedEntries = entries.filter(entry => entry.id !== id);
      setEntries(updatedEntries);
    }
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' };
    return new Date(dateString).toLocaleDateString('he-IL', options);
  };

  return (
    // Main container with full centering and dark background for high contrast change
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 md:p-8 font-sans" dir="rtl">
      
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header Section */}
        <header className="bg-emerald-600 text-white p-6 md:p-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Briefcase className="w-8 h-8" />
              </div>
              יומן שעות
            </h1>
            <p className="text-emerald-100 mt-2 opacity-90">ניהול זמן חכם ופשוט</p>
          </div>
          
          <div className="text-center bg-white/10 px-6 py-3 rounded-xl backdrop-blur-md border border-emerald-400/30">
            <span className="block text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">סה״כ שעות</span>
            <span className="block text-3xl font-bold">{totalHours}</span>
          </div>
        </header>

        <div className="p-6 md:p-8 bg-slate-50">
          
          {/* Input Form */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              הוספת דיווח חדש
            </h2>
            
            <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-sm font-semibold text-slate-600">תאריך</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-sm font-semibold text-slate-600">שעות</label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    placeholder="0.0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-sm font-semibold text-slate-600">תיאור</label>
                <input
                  type="text"
                  placeholder="מה עשית?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-12 mt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <Save className="w-5 h-5" />
                  שמירת דיווח
                </button>
              </div>
            </form>
          </section>

          {/* History List */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                היסטוריית פעילות
              </h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                {entries.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {entries.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400">אין נתונים להצגה</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-50 text-emerald-700 font-bold w-12 h-12 rounded-lg flex items-center justify-center text-lg border border-emerald-100">
                        {entry.hours}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-sm">
                          {formatDate(entry.date)}
                        </div>
                        <div className="text-slate-500 text-sm mt-0.5">
                          {entry.description}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WorkLogApp;