// src/context/JamabookContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Business,
  Party,
  Item,
  Invoice,
  StockMovement,
  Enquiry,
  LanguageMode,
  InvoiceItemLine,
  InvoiceCharge,
  AppUser,
} from '@/types';
import { calculateLineAmount } from '@/lib/formatters';
import {
  CreateInvoiceSchema,
  CancelInvoiceSchema,
  CreateEnquirySchema,
  StockMovementSchema,
  PartySchema,
  ItemSchema,
  BusinessProfileSchema,
} from '@/lib/validations';
import {
  DEMO_BUSINESS,
  DEMO_PARTIES,
  DEMO_ITEMS,
  DEMO_STOCK_MOVEMENTS,
  DEMO_INVOICES,
  DEMO_ENQUIRIES,
} from '@/lib/demoData';

export type AppView =
  | 'home'
  | 'bill-new'
  | 'bill-saved'
  | 'stock'
  | 'follow-ups'
  | 'bot'
  | 'settings'
  | 'invoice-view';

interface JamabookContextType {
  user: AppUser | null;
  language: LanguageMode;
  toggleLanguage: () => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  business: Business;
  parties: Party[];
  items: (Item & { pieces_in_stock: number })[];
  invoices: Invoice[];
  stockMovements: StockMovement[];
  enquiries: Enquiry[];
  lastSavedInvoice: Invoice | null;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (inv: Invoice | null) => void;
  hasPinSetup: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; businessName: string; startingBillNo: number }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  unlockWithPin: (pin: string) => boolean;
  createInvoice: (data: {
    buyer_id: string;
    buyer_name: string;
    buyer_town?: string;
    buyer_phone?: string;
    transporter_id?: string;
    transporter_name?: string;
    broker_id?: string;
    broker_name?: string;
    bill_date: string;
    vehicle_no?: string;
    notes?: string;
    lines: Omit<InvoiceItemLine, 'id' | 'total_kg' | 'amount'>[];
    charges?: InvoiceCharge[];
  }) => { success: boolean; invoice?: Invoice; error?: string };
  cancelInvoice: (invoiceId: string, reason: string) => { success: boolean; error?: string };
  addStockIn: (itemId: string, pieces: number, note?: string) => { success: boolean; error?: string };
  addStockAdjustment: (itemId: string, pieces: number, note?: string) => { success: boolean; error?: string };
  addEnquiry: (data: {
    party_id?: string;
    contact_name: string;
    phone?: string;
    item_id: string;
    pieces_wanted: number;
    next_follow_up: string;
    note?: string;
  }) => { success: boolean; error?: string };
  updateEnquiryStatus: (id: string, status: Enquiry['status']) => void;
  snoozeEnquiry: (id: string, days: number) => void;
  addParty: (party: Omit<Party, 'id' | 'business_id' | 'created_at'>) => { success: boolean; party?: Party; error?: string };
  addItem: (item: Omit<Item, 'id' | 'business_id' | 'created_at' | 'pieces_in_stock'>) => { success: boolean; item?: Item; error?: string };
  updateBusinessProfile: (updates: Partial<Business>) => { success: boolean; error?: string };
  clearLedger: () => void;
  loadDemoData: () => void;
  getLastBillForBuyer: (buyerId: string) => Invoice | null;
}

const JamabookContext = createContext<JamabookContextType | null>(null);

const STORAGE_KEY = 'jamabook_v2_store';
const AUTH_KEY = 'jamabook_v2_auth';

export function JamabookProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageMode>('en');
  const [activeView, setActiveView] = useState<AppView>('home');
  const [hasPinSetup, setHasPinSetup] = useState(false);

  // Clean initial business without sample bills
  const [business, setBusiness] = useState<Business>({
    id: 'biz-001',
    name: 'RTC',
    address: 'Shop No. 14, Main Market Yard, Grain Market',
    phone: '+91 98765 43210',
    gstin: '36AABCR1234F1Z5',
    bill_prefix: '',
    next_bill_no: 4450,
    created_at: '2026-01-01T00:00:00Z',
  });

  // Master data and empty ledger
  const [parties, setParties] = useState<Party[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user session and stored ledger data
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_KEY);
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        if (parsedAuth.user) setUser(parsedAuth.user);
        if (parsedAuth.token) setToken(parsedAuth.token);
      }

      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.business) setBusiness(parsed.business);
        if (parsed.parties) setParties(parsed.parties);
        if (parsed.items) setRawItems(parsed.items);
        if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
        if (parsed.invoices) setInvoices(parsed.invoices);
        if (parsed.enquiries) setEnquiries(parsed.enquiries);
        if (parsed.language) setLanguage(parsed.language);

        // If previously logged into demo account with empty items, load full rich demo data
        if (savedAuth) {
          const parsedAuth = JSON.parse(savedAuth);
          if (
            parsedAuth?.user?.email === 'trader@rtc.com' &&
            (!parsed.items || parsed.items.length === 0)
          ) {
            setBusiness(DEMO_BUSINESS);
            setParties(DEMO_PARTIES);
            setRawItems(DEMO_ITEMS);
            setStockMovements(DEMO_STOCK_MOVEMENTS);
            setInvoices(DEMO_INVOICES);
            setEnquiries(DEMO_ENQUIRIES);
          }
        }
      }
    } catch {
      // Storage unavailable
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to LocalStorage on updates
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (user && token) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
      } else {
        localStorage.removeItem(AUTH_KEY);
      }

      const dataToSave = {
        business,
        parties,
        items: rawItems,
        stockMovements,
        invoices,
        enquiries,
        language,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [user, token, business, parties, rawItems, stockMovements, invoices, enquiries, language, isLoaded]);

  // Compute live stock levels strictly from stock_movements ledger
  const items = rawItems.map((item) => {
    const totalPieces = stockMovements
      .filter((m) => m.item_id === item.id)
      .reduce((sum, m) => sum + m.pieces, 0);
    return {
      ...item,
      pieces_in_stock: totalPieces,
    };
  });

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  // Populate realistic Indian Mandi demo data for live preview & Tally ledger
  const loadDemoData = () => {
    setBusiness(DEMO_BUSINESS);
    setParties(DEMO_PARTIES);
    setRawItems(DEMO_ITEMS);
    setStockMovements(DEMO_STOCK_MOVEMENTS);
    setInvoices(DEMO_INVOICES);
    setEnquiries(DEMO_ENQUIRIES);
    const mockUser: AppUser = {
      id: 'usr-owner-1',
      email: 'trader@rtc.com',
      role: 'owner',
      business_id: DEMO_BUSINESS.id,
    };
    setUser(mockUser);
    setToken(`mock-token::${mockUser.id}::${DEMO_BUSINESS.id}::owner::trader@rtc.com`);
    setActiveView('home');
  };

  // Authentication: Login
  const login = async (email: string, pass: string) => {
    if (email === 'trader@rtc.com') {
      loadDemoData();
      return { success: true };
    }
    const mockUser: AppUser = {
      id: 'usr-owner-1',
      email,
      role: 'owner',
      business_id: business.id,
    };
    const mockToken = `mock-token::${mockUser.id}::${business.id}::owner::${email}`;

    setUser(mockUser);
    setToken(mockToken);
    return { success: true };
  };

  // Authentication: Signup (starts with fresh empty ledger for this business)
  const signup = async (data: {
    email: string;
    password: string;
    businessName: string;
    startingBillNo: number;
  }) => {
    const newBizId = `biz-${Date.now()}`;
    const newUserId = `usr-${Date.now()}`;

    const newBusiness: Business = {
      id: newBizId,
      name: data.businessName,
      bill_prefix: '',
      next_bill_no: data.startingBillNo,
      created_at: new Date().toISOString(),
    };

    const newUser: AppUser = {
      id: newUserId,
      email: data.email,
      role: 'owner',
      business_id: newBizId,
    };

    const newToken = `mock-token::${newUserId}::${newBizId}::owner::${data.email}`;

    // Clean empty ledger for new business
    setBusiness(newBusiness);
    setUser(newUser);
    setToken(newToken);
    setParties([]);
    setRawItems([]);
    setStockMovements([]);
    setInvoices([]);
    setEnquiries([]);
    setActiveView('home');

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_KEY);
    setActiveView('home');
  };

  const unlockWithPin = (pin: string) => {
    return pin === '1234' || pin === '4450';
  };

  const getLastBillForBuyer = (buyerId: string): Invoice | null => {
    return (
      invoices
        .filter((inv) => inv.buyer_id === buyerId && inv.status === 'active')
        .sort((a, b) => b.bill_no - a.bill_no)[0] || null
    );
  };

  // Create Invoice (strictly validated with Zod, immutable, atomic stock deduction)
  const createInvoice = (data: {
    buyer_id: string;
    buyer_name: string;
    buyer_town?: string;
    buyer_phone?: string;
    transporter_id?: string;
    transporter_name?: string;
    broker_id?: string;
    broker_name?: string;
    bill_date: string;
    vehicle_no?: string;
    notes?: string;
    lines: Omit<InvoiceItemLine, 'id' | 'total_kg' | 'amount'>[];
    charges?: InvoiceCharge[];
  }) => {
    // Authorization check
    if (!user) {
      return { success: false, error: 'User must be signed in to create invoices' };
    }

    // 1. Zod Validation
    const validation = CreateInvoiceSchema.safeParse({
      ...data,
      lines: data.lines.map((l) => ({
        item_id: l.item_id,
        item_name: l.item_name,
        pieces: Number(l.pieces),
        kg_per_piece: Number(l.kg_per_piece),
        rate: Number(l.rate),
        rate_unit: l.rate_unit,
      })),
      charges: (data.charges || []).map((c) => ({
        label: c.label || 'Extra',
        amount: Number(c.amount) || 0,
      })),
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid invoice data',
      };
    }

    const validData = validation.data;
    const currentBillNo = business.next_bill_no;
    const invoiceId = `inv-${currentBillNo}`;

    // 2. Calculations
    let subtotal = 0;
    const processedLines: InvoiceItemLine[] = validData.lines.map((l, index) => {
      const totalKg = Math.round(l.pieces * l.kg_per_piece * 1000) / 1000;
      const amount = calculateLineAmount(l.pieces, l.kg_per_piece, l.rate, l.rate_unit);
      subtotal += amount;
      return {
        id: `line-${invoiceId}-${index}`,
        item_id: l.item_id,
        item_name: l.item_name,
        pieces: l.pieces,
        kg_per_piece: l.kg_per_piece,
        total_kg: totalKg,
        rate: l.rate,
        rate_unit: l.rate_unit,
        amount,
      };
    });

    const extraCharges = (validData.charges || []).reduce((sum, c) => sum + (c.amount || 0), 0);
    const grandTotal = subtotal + extraCharges;

    // 3. Immutable Snapshot
    const newInvoice: Invoice = {
      id: invoiceId,
      business_id: business.id,
      bill_no: currentBillNo,
      bill_date: validData.bill_date,
      buyer_id: validData.buyer_id,
      buyer_name: validData.buyer_name,
      buyer_town: validData.buyer_town,
      buyer_phone: validData.buyer_phone,
      transporter_id: validData.transporter_id,
      transporter_name: validData.transporter_name,
      broker_id: validData.broker_id,
      broker_name: validData.broker_name,
      vehicle_no: validData.vehicle_no,
      notes: validData.notes,
      subtotal,
      extra_charges: extraCharges,
      total: grandTotal,
      status: 'active',
      created_by: user.id,
      created_at: new Date().toISOString(),
      lines: processedLines,
      charges: validData.charges,
    };

    // 4. Ledger: Sale movement (negative pieces)
    const newMovements: StockMovement[] = processedLines.map((line, idx) => ({
      id: `mov-${invoiceId}-${idx}-${Date.now()}`,
      business_id: business.id,
      item_id: line.item_id,
      pieces: -line.pieces,
      movement_type: 'sale',
      invoice_id: invoiceId,
      moved_on: validData.bill_date,
      note: `Bill ${currentBillNo} · ${validData.buyer_name}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }));

    // 5. Update State atomically
    setInvoices((prev) => [newInvoice, ...prev]);
    setStockMovements((prev) => [...prev, ...newMovements]);
    setBusiness((prev) => ({
      ...prev,
      next_bill_no: prev.next_bill_no + 1,
    }));
    setLastSavedInvoice(newInvoice);
    setSelectedInvoice(newInvoice);
    setActiveView('bill-saved');

    return { success: true, invoice: newInvoice };
  };

  // Cancel Invoice (Role check: only owner, atomic stock reversal)
  const cancelInvoice = (invoiceId: string, reason: string) => {
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Role check
    if (user.role !== 'owner') {
      return { success: false, error: 'Only business owners are authorized to cancel bills' };
    }

    const validation = CancelInvoiceSchema.safeParse({ invoice_id: invoiceId, reason });
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const inv = invoices.find((i) => i.id === invoiceId && i.business_id === business.id);
    if (!inv) return { success: false, error: 'Invoice not found in your business' };
    if (inv.status === 'cancelled') return { success: false, error: 'Invoice is already cancelled' };

    // Compensating positive stock movements
    const reversalMovements: StockMovement[] = (inv.lines || []).map((line, idx) => ({
      id: `mov-cancel-${invoiceId}-${idx}-${Date.now()}`,
      business_id: business.id,
      item_id: line.item_id,
      pieces: line.pieces, // Positive restores pieces
      movement_type: 'sale_cancel',
      invoice_id: invoiceId,
      moved_on: new Date().toISOString().split('T')[0],
      note: `Bill ${inv.bill_no} cancelled: ${reason}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }));

    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancel_reason: reason,
            }
          : i
      )
    );

    setStockMovements((prev) => [...prev, ...reversalMovements]);

    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancel_reason: reason,
            }
          : null
      );
    }

    return { success: true };
  };

  // Stock In (Purchase)
  const addStockIn = (itemId: string, pieces: number, note?: string) => {
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = StockMovementSchema.safeParse({
      item_id: itemId,
      pieces: Number(pieces),
      movement_type: 'purchase',
      note,
      moved_on: new Date().toISOString().split('T')[0],
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const item = items.find((i) => i.id === itemId);
    const movement: StockMovement = {
      id: `mov-pur-${Date.now()}`,
      business_id: business.id,
      item_id: itemId,
      pieces: Number(pieces),
      movement_type: 'purchase',
      moved_on: new Date().toISOString().split('T')[0],
      note: note || `Purchase for ${item?.name || 'commodity'}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    setStockMovements((prev) => [...prev, movement]);
    return { success: true };
  };

  // Stock Adjustment
  const addStockAdjustment = (itemId: string, pieces: number, note?: string) => {
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = StockMovementSchema.safeParse({
      item_id: itemId,
      pieces: Number(pieces),
      movement_type: 'adjustment',
      note,
      moved_on: new Date().toISOString().split('T')[0],
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const movement: StockMovement = {
      id: `mov-adj-${Date.now()}`,
      business_id: business.id,
      item_id: itemId,
      pieces: Number(pieces),
      movement_type: 'adjustment',
      moved_on: new Date().toISOString().split('T')[0],
      note: note || 'Inventory audit adjustment',
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    setStockMovements((prev) => [...prev, movement]);
    return { success: true };
  };

  // Add Enquiry
  const addEnquiry = (data: {
    party_id?: string;
    contact_name: string;
    phone?: string;
    item_id: string;
    pieces_wanted: number;
    next_follow_up: string;
    note?: string;
  }) => {
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = CreateEnquirySchema.safeParse({
      ...data,
      pieces_wanted: Number(data.pieces_wanted),
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const newEnq: Enquiry = {
      id: `enq-${Date.now()}`,
      business_id: business.id,
      party_id: data.party_id,
      contact_name: data.contact_name,
      phone: data.phone,
      item_id: data.item_id,
      pieces_wanted: Number(data.pieces_wanted),
      status: 'open',
      next_follow_up: data.next_follow_up,
      note: data.note,
      created_at: new Date().toISOString(),
    };

    setEnquiries((prev) => [newEnq, ...prev]);
    return { success: true };
  };

  const updateEnquiryStatus = (id: string, status: Enquiry['status']) => {
    setEnquiries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status,
              last_contacted_at: new Date().toISOString(),
            }
          : e
      )
    );
  };

  const snoozeEnquiry = (id: string, days: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split('T')[0];

    setEnquiries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              next_follow_up: dateStr,
              last_contacted_at: new Date().toISOString(),
            }
          : e
      )
    );
  };

  // Add Party (Master data validation)
  const addParty = (data: Omit<Party, 'id' | 'business_id' | 'created_at'>) => {
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = PartySchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const newParty: Party = {
      ...data,
      id: `party-${Date.now()}`,
      business_id: business.id,
      created_at: new Date().toISOString(),
    };

    setParties((prev) => [...prev, newParty]);
    return { success: true, party: newParty };
  };

  // Add Item (Master data validation)
  const addItem = (data: Omit<Item, 'id' | 'business_id' | 'created_at' | 'pieces_in_stock'>) => {
    if (!user) return { success: false, error: 'Unauthorized' };

    const validation = ItemSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    const newItem: Item = {
      ...data,
      id: `item-${Date.now()}`,
      business_id: business.id,
      created_at: new Date().toISOString(),
    };

    setRawItems((prev) => [...prev, newItem]);
    return { success: true, item: newItem };
  };

  // Update Business Profile (Role check: only owner)
  const updateBusinessProfile = (updates: Partial<Business>) => {
    if (!user || user.role !== 'owner') {
      return { success: false, error: 'Only owners can modify business profile' };
    }

    const validation = BusinessProfileSchema.safeParse({
      name: updates.name ?? business.name,
      address: updates.address ?? business.address,
      phone: updates.phone ?? business.phone,
      gstin: updates.gstin ?? business.gstin,
      bill_prefix: updates.bill_prefix ?? business.bill_prefix,
      next_bill_no: updates.next_bill_no ?? business.next_bill_no,
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message };
    }

    setBusiness((prev) => ({ ...prev, ...validation.data }));
    return { success: true };
  };

  // Wipe / Reset to completely clean ledger
  const clearLedger = () => {
    setParties([]);
    setRawItems([]);
    setStockMovements([]);
    setInvoices([]);
    setEnquiries([]);
    setLastSavedInvoice(null);
    setSelectedInvoice(null);
  };

  return (
    <JamabookContext.Provider
      value={{
        user,
        language,
        toggleLanguage,
        activeView,
        setActiveView,
        business,
        parties,
        items,
        invoices,
        stockMovements,
        enquiries,
        lastSavedInvoice,
        selectedInvoice,
        setSelectedInvoice,
        hasPinSetup,
        login,
        signup,
        logout,
        unlockWithPin,
        createInvoice,
        cancelInvoice,
        addStockIn,
        addStockAdjustment,
        addEnquiry,
        updateEnquiryStatus,
        snoozeEnquiry,
        addParty,
        addItem,
        updateBusinessProfile,
        clearLedger,
        loadDemoData,
        getLastBillForBuyer,
      }}
    >
      {children}
    </JamabookContext.Provider>
  );
}

export function useJamabook() {
  const context = useContext(JamabookContext);
  if (!context) {
    throw new Error('useJamabook must be used within a JamabookProvider');
  }
  return context;
}
