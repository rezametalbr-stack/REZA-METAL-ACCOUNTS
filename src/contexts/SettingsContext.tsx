import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setCurrencySymbol } from '../lib/utils';

interface BusinessSettings {
  businessName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  showLogo?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
  showTaxId?: boolean;
  currencySymbol?: string;
  defaultVatRate?: number;
  invoiceFooter?: string;
}

interface SettingsContextType {
  settings: BusinessSettings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for real-time changes to the settings document
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BusinessSettings;
        setSettings(data);
        if (data.currencySymbol) {
          setCurrencySymbol(data.currencySymbol);
        }
      } else {
        // Fallback for new accounts
        setSettings({
          businessName: 'Reza Metal Industries',
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
