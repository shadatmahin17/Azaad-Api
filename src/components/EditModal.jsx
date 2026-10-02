import React, { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';

const CATEGORY_OPTIONS = ['Electronic', 'Pop', 'Hip-Hop/Rap', 'Rock', 'R&B/Soul', 'Ambient', 'Hindi', 'Bangla', 'English', 'Other'];

export default function EditModal({ song, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    title: song.title || '',
    artist: song.artist || '',
    singers: song.singers || '',
    category: song.category || 'Other',
    genre: song.genre || '',
    type: song.type || '',
    vibe: song.vibe || '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(song.id, form);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--primary)]/10 text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--text)]">Edit Track</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-[var(--text-light)] mb-1 block">Title *</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Artist *</label>
              <input name="artist" value={form.artist} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Singer(s)</label>
              <input name="singers" value={form.singers} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Genre</label>
              <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Type</label>
              <input name="type" value={form.type} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Vibe</label>
              <input name="vibe" value={form.vibe} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[var(--primary)]/20 text-[var(--text-light)] hover:bg-white/5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
