// src/types/index.ts

export type RateUnit = 'per_quintal' | 'per_kg' | 'per_piece';
export type UserRole = 'owner' | 'staff';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  business_id: string;
}

export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
  bill_prefix: string;
  next_bill_no: number;
  created_at: string;
  // Tally Prime & Banking metadata
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  state?: string;
  state_code?: string;
  email?: string;
  logo_url?: string;
  is_onboarded?: boolean;
}

export interface Party {
  id: string;
  business_id: string;
  name: string;
  town?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
  state_code?: string;
  is_buyer: boolean;
  is_transporter: boolean;
  is_broker: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  business_id: string;
  name: string;
  code?: string;
  hsn?: string;
  kg_per_piece: number;
  default_rate?: number;
  rate_unit: RateUnit;
  low_stock_pieces?: number;
  is_active: boolean;
  created_at: string;
  // Computed client-side or from view:
  pieces_in_stock?: number;
}

export interface InvoiceItemLine {
  id?: string;
  item_id: string;
  item_name: string;
  pieces: number;
  kg_per_piece: number;
  total_kg: number;
  rate: number;
  rate_unit: RateUnit;
  amount: number;
}

export interface InvoiceCharge {
  id?: string;
  label: string;
  amount: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  bill_no: number;
  bill_date: string;
  buyer_id?: string;
  buyer_name: string;
  buyer_town?: string;
  buyer_phone?: string;
  transporter_id?: string;
  transporter_name?: string;
  broker_id?: string;
  broker_name?: string;
  vehicle_no?: string;
  notes?: string;
  subtotal: number;
  extra_charges: number;
  total: number;
  status: 'active' | 'cancelled';
  cancelled_at?: string;
  cancel_reason?: string;
  created_by?: string;
  created_at: string;
  lines?: InvoiceItemLine[];
  charges?: InvoiceCharge[];
}

export interface StockMovement {
  id: string;
  business_id: string;
  item_id: string;
  pieces: number;
  movement_type: 'purchase' | 'sale' | 'sale_cancel' | 'adjustment';
  invoice_id?: string;
  moved_on: string;
  note?: string;
  created_by?: string;
  created_at: string;
  item_name?: string;
}

export type EnquiryStatus = 'open' | 'quoted' | 'won' | 'lost';

export interface Enquiry {
  id: string;
  business_id: string;
  party_id?: string;
  contact_name: string;
  phone?: string;
  item_id?: string;
  pieces_wanted?: number;
  status: EnquiryStatus;
  next_follow_up?: string;
  last_contacted_at?: string;
  note?: string;
  created_at: string;
  // Augmented
  item_name?: string;
  stock_in_hand?: number;
}

export type LanguageMode = 'en' | 'hi';
