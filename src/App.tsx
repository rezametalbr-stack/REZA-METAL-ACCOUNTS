import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Salespeople from './pages/Salespeople';
import Commissions from './pages/Commissions';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import StockAdjustmentReport from './pages/StockAdjustmentReport';
import ChartOfAccounts from './pages/ChartOfAccounts';
import JournalEntries from './pages/JournalEntries';
import InvoiceView from './pages/InvoiceView';
import Login from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="sales" element={<Sales />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="salespeople" element={<Salespeople />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="purchases" element={<Purchases />} />
          
          {/* Report Routes */}
          <Route path="reports/profit-loss" element={<Reports />} />
          <Route path="reports/purchase-sale" element={<Reports />} />
          <Route path="reports/supplier-customer" element={<Reports />} />
          <Route path="reports/stock" element={<Reports />} />
          <Route path="reports/stock-adjustment" element={<StockAdjustmentReport />} />
          <Route path="reports/item" element={<Reports />} />
          <Route path="reports/product-purchase" element={<Reports />} />
          <Route path="reports/product-sale" element={<Reports />} />
          <Route path="reports/purchase-payment" element={<Reports />} />
          <Route path="reports/sale-payment" element={<Reports />} />
          <Route path="reports/balance-sheet" element={<Reports />} />
          
          <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="accounting/journal-entries" element={<JournalEntries />} />
          
          <Route path="invoice/:id" element={<InvoiceView />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
