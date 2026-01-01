import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, FileText, BarChart3, Save } from 'lucide-react';

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
    
    // Reset form fields (keeping date as is for convenience, or reset to today)
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

  // Helper to format date for display (DD/MM/YYYY)
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('he-IL', options);
  };

  // Group entries by month for better visualization (optional logic, kept simple for now)
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8" />
            <h1 className="text-2xl font-bold">יומן שעות עבודה</h1>
          </div>
          <div className="bg-blue-500 bg-opacity-30 rounded-lg px-4 py-2 flex flex-col items-center">
            <span className="text-xs opacity-90">סה״כ שעות</span>
            <span className="text-xl font-bold">{totalHours}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* Input Form Card */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700">
            <Plus className="w-5 h-5 text-blue-500" />
            הוספת דיווח חדש
          </h2>
          
          <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            <div className="md:col-span-4 space-y-1">
              <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                תאריך
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                שעות
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              />
            </div>

            <div className="md:col-span-4 space-y-1">
              <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                תיאור (אופציונלי)
              </label>
              <input
                type="text"
                placeholder="מה עשית היום?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm active:transform active:scale-95"
              >
                <Save className="w-4 h-4" />
                שמור
              </button>
            </div>
          </form>
        </section>

        {/* History List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              היסטוריית דיווחים
            </h2>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {entries.length} רשומות
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">עדיין לא הוזנו שעות</p>
              <p className="text-slate-400 text-sm mt-1">השתמש בטופס למעלה כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="bg-blue-50 text-blue-700 font-bold px-4 py-3 rounded-lg min-w-[4.5rem] text-center flex flex-col justify-center">
                      <span className="text-xl leading-none">{entry.hours}</span>
                      <span className="text-[10px] uppercase font-medium mt-1">שעות</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-slate-800 font-medium mb-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(entry.date)}
                      </div>
                      <p className="text-slate-600 text-sm">
                        {entry.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="self-end sm:self-center text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    title="מחק רשומה"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default WorkLogApp;