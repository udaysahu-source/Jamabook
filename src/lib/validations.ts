// src/lib/validations.ts
import { z } from 'zod';

// Indian phone regex: optional +91, 10 digits
export const IndianPhoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

// Indian GSTIN regex: 15 alphanumeric characters
export const GstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Date format YYYY-MM-DD
export const IsoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

// --- Authentication Schemas ---
export const SignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  startingBillNo: z.number().int().positive('Starting bill number must be greater than 0').default(4450),
});

export const SignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const PinAuthSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

// --- Business Profile Schema ---
export const BusinessProfileSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  address: z.string().max(250).optional(),
  phone: z
    .string()
    .refine((val) => !val || IndianPhoneRegex.test(val.replace(/\s+/g, '')), {
      message: 'Invalid phone number format',
    })
    .optional(),
  gstin: z
    .string()
    .refine((val) => !val || GstinRegex.test(val), {
      message: 'Invalid GSTIN format (15 characters alphanumeric)',
    })
    .optional(),
  bill_prefix: z.string().max(10).default(''),
  next_bill_no: z.number().int().positive('Next bill number must be greater than 0'),
  bank_name: z.string().max(100).optional(),
  bank_account: z.string().max(50).optional(),
  bank_ifsc: z.string().max(20).optional(),
  bank_branch: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  state_code: z.string().max(10).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  is_onboarded: z.boolean().optional(),
  logo_url: z.string().max(500).optional(),
});

// --- Master Data Schemas ---
export const PartySchema = z.object({
  name: z.string().min(2, 'Party name must be at least 2 characters').max(100),
  town: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(250).optional(),
  gstin: z
    .string()
    .refine((val) => !val || GstinRegex.test(val), {
      message: 'Invalid GSTIN format',
    })
    .optional(),
  is_buyer: z.boolean().default(false),
  is_transporter: z.boolean().default(false),
  is_broker: z.boolean().default(false),
  is_active: z.boolean().default(true),
}).refine((data) => data.is_buyer || data.is_transporter || data.is_broker, {
  message: 'Party must be assigned at least one role (Buyer, Transporter, or Broker)',
});

export const RateUnitSchema = z.enum(['per_quintal', 'per_kg', 'per_piece']);

export const ItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100),
  kg_per_piece: z.number().positive('Kg per piece must be greater than 0'),
  default_rate: z.number().nonnegative('Rate cannot be negative').optional(),
  rate_unit: RateUnitSchema.default('per_quintal'),
  low_stock_pieces: z.number().int().nonnegative('Low stock threshold cannot be negative').optional(),
  is_active: z.boolean().default(true),
});

// --- Transaction Schemas ---
export const InvoiceLineSchema = z.object({
  item_id: z.string().min(1, 'Item is required'),
  item_name: z.string().min(1, 'Item name is required'),
  pieces: z.number().int().positive('Pieces must be a positive integer'),
  kg_per_piece: z.number().positive('Kg per piece must be greater than 0'),
  rate: z.number().positive('Rate must be greater than 0'),
  rate_unit: RateUnitSchema,
});

export const InvoiceChargeSchema = z.object({
  label: z.string().min(1, 'Charge label is required').max(50),
  amount: z.number().nonnegative('Charge amount cannot be negative'),
});

export const CreateInvoiceSchema = z.object({
  buyer_id: z.string().min(1, 'Buyer is required'),
  buyer_name: z.string().min(1, 'Buyer name is required'),
  buyer_town: z.string().optional(),
  buyer_phone: z.string().optional(),
  transporter_id: z.string().optional(),
  transporter_name: z.string().optional(),
  broker_id: z.string().optional(),
  broker_name: z.string().optional(),
  bill_date: z.string().regex(IsoDateRegex, 'Bill date must be in YYYY-MM-DD format'),
  vehicle_no: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  lines: z.array(InvoiceLineSchema).min(1, 'At least one item line is required'),
  charges: z.array(InvoiceChargeSchema).optional().default([]),
});

export const CancelInvoiceSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice ID is required'),
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters'),
});

// --- Stock Schemas ---
export const StockMovementSchema = z.object({
  item_id: z.string().min(1, 'Item is required'),
  pieces: z.number().int().refine((n) => n !== 0, 'Pieces cannot be zero'),
  movement_type: z.enum(['purchase', 'adjustment']),
  note: z.string().max(200).optional(),
  moved_on: z.string().regex(IsoDateRegex, 'Date must be in YYYY-MM-DD format'),
});

// --- Enquiry Schemas ---
export const CreateEnquirySchema = z.object({
  party_id: z.string().optional(),
  contact_name: z.string().min(2, 'Contact name must be at least 2 characters'),
  phone: z.string().optional(),
  item_id: z.string().min(1, 'Material is required'),
  pieces_wanted: z.number().int().positive('Pieces wanted must be greater than 0'),
  next_follow_up: z.string().regex(IsoDateRegex, 'Follow-up date must be in YYYY-MM-DD format'),
  note: z.string().max(300).optional(),
});

export const UpdateEnquiryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'quoted', 'won', 'lost']),
});

// --- Telegram Bot Schema ---
export const BotParseSchema = z.object({
  buyer_name: z.string().min(1),
  transporter_name: z.string().optional(),
  broker_name: z.string().optional(),
  item_name: z.string().min(1),
  pieces: z.number().int().positive(),
  kg_per_piece: z.number().positive().default(30),
  rate: z.number().positive(),
  rate_unit: RateUnitSchema.default('per_quintal'),
  extra_amount: z.number().default(0),
});
