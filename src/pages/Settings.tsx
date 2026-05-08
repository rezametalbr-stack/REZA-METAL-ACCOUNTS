import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Save, Globe, Phone, Mail, MapPin, Hash, Image as ImageIcon, Loader2, Upload, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';

export default function Settings() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    businessName: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showWebsite: true,
    showTaxId: true
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.email === 'rezametalbr@gmail.com';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB limit for Firestore doc size safety
      alert("Image is too large. Please select a logo under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now()
      });
      alert("Settings saved successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase">Business Settings</h1>
          <p className="text-[var(--text-secondary)] font-medium mt-1">Manage branding and company information</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSave} className="p-8 lg:p-12 space-y-10">
          {/* Logo Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 py-2 border-b border-[var(--border-color)]">
              <ImageIcon size={20} className="text-amber-500" />
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Brand Identity</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Logo Upload</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={settings.showLogo}
                        onChange={(e) => setSettings({ ...settings, showLogo: e.target.checked })}
                        className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                      />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                    </label>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-[var(--bg-page)] border border-[var(--border-color)] border-dashed rounded-2xl text-[var(--text-primary)] hover:border-amber-500 transition-all font-bold group"
                    >
                      <Upload size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      Choose Image File
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors group-focus-within:text-amber-500" size={18} />
                      <input 
                        type="url"
                        value={settings.logoUrl}
                        onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-600 font-medium"
                        placeholder="Or paste an image URL..."
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight px-1">
                    Upload your logo (under 500KB) or provide a link. This logo will appear on all invoices and reports if enabled.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-page)] rounded-3xl border border-[var(--border-color)] border-dashed aspect-square md:aspect-auto h-full min-h-[200px] relative group">
                {settings.logoUrl ? (
                  <>
                  <img 
                    src={settings.logoUrl} 
                    alt="Business Logo Preview" 
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL';
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, logoUrl: '' }))}
                    className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 size={14} />
                  </button>
                  </>
                ) : (
                  <div className="text-center space-y-2">
                    <ImageIcon size={40} className="mx-auto text-slate-800" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Logo Preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business Info Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 py-2 border-b border-[var(--border-color)]">
              <Building2 size={20} className="text-amber-500" />
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Company Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Legal Business Name</label>
                </div>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input 
                    required
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold"
                    placeholder="Reza Metal Industries"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Contact Phone</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.showPhone}
                      onChange={(e) => setSettings({ ...settings, showPhone: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                  </label>
                </div>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input 
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold"
                    placeholder="+880 1XXX XXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Official Email</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.showEmail}
                      onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                  </label>
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input 
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold"
                    placeholder="info@rezametal.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Website URL</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.showWebsite}
                      onChange={(e) => setSettings({ ...settings, showWebsite: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                  </label>
                </div>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input 
                    type="text"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold"
                    placeholder="www.rezametal.com"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Physical Address / Headquarters</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.showAddress}
                      onChange={(e) => setSettings({ ...settings, showAddress: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                  </label>
                </div>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-6 text-[var(--text-secondary)]" size={18} />
                  <textarea 
                    rows={3}
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold resize-none"
                    placeholder="Street, City, Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Tax ID / BIN Number (Optional)</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={settings.showTaxId}
                      onChange={(e) => setSettings({ ...settings, showTaxId: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-amber-500 focus:ring-amber-500 bg-[var(--bg-page)]"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-amber-500 transition-colors">Show on Invoice</span>
                  </label>
                </div>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input 
                    type="text"
                    value={settings.taxId}
                    onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-4 text-[var(--text-primary)] focus:border-amber-500 outline-none transition-all font-bold"
                    placeholder="BIN-12345678"
                  />
                </div>
              </div>
            </div>
          </div>

          {isAdmin ? (
            <div className="pt-8 flex justify-end border-t border-[var(--border-color)]">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-3 px-10 py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-900/50 text-black rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-amber-500/20 active:scale-95 min-w-[200px] justify-center"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Updating...' : 'Save Configuration'}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <p className="text-rose-500 font-bold text-xs uppercase tracking-widest text-center">
                Access Restricted: Only system administrators can modify business settings.
              </p>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
