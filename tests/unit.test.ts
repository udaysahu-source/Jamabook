// tests/unit.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineAmount, amountToIndianWords, formatIndianDecimals } from '../src/lib/formatters.ts';
import { todayIST, isBillDateValid } from '../src/lib/dates.ts';
import { sanitizeCsvCell, generateCsv } from '../src/lib/csv.ts';

describe('Jamabook Unit Test Suite', () => {
  describe('Bill Calculation Formula (AGENTS.md & SPEC.md)', () => {
    it('calculates amount per quintal correctly (50 bags @ 30kg @ 11050/qtl = 1,65,750)', () => {
      // 50 bags * 30 kg = 1500 kg = 15.00 Qtl * 11050 = 1,65,750
      const amount = calculateLineAmount(50, 30, 11050, 'per_quintal');
      assert.equal(amount, 165750);
    });

    it('calculates amount per kg correctly (100 bags @ 50kg @ 58/kg = 2,90,000)', () => {
      const amount = calculateLineAmount(100, 50, 58, 'per_kg');
      assert.equal(amount, 290000);
    });

    it('calculates amount per piece correctly (200 pieces @ 150/piece = 30,000)', () => {
      const amount = calculateLineAmount(200, 50, 150, 'per_piece');
      assert.equal(amount, 30000);
    });

    it('returns 0 for non-positive pieces or rate', () => {
      assert.equal(calculateLineAmount(0, 30, 11050, 'per_quintal'), 0);
      assert.equal(calculateLineAmount(-10, 30, 11050, 'per_quintal'), 0);
      assert.equal(calculateLineAmount(50, 30, 0, 'per_quintal'), 0);
    });
  });

  describe('Amount to Indian Words', () => {
    it('converts 1,65,800 correctly', () => {
      const words = amountToIndianWords(165800);
      assert.equal(words, 'Indian Rupees One Lakh Sixty-Five Thousand Eight Hundred Only');
    });

    it('converts 0 correctly', () => {
      assert.equal(amountToIndianWords(0), 'Indian Rupees Zero Only');
    });

    it('converts small amounts with paise', () => {
      const words = amountToIndianWords(1250.50);
      assert.equal(words, 'Indian Rupees One Thousand Two Hundred Fifty and Fifty Paise Only');
    });
  });

  describe('Indian Number Formatting', () => {
    it('formats Indian decimals correctly with two decimal places', () => {
      assert.equal(formatIndianDecimals(123456), '1,23,456.00');
      assert.equal(formatIndianDecimals(165750.5), '1,65,750.50');
      assert.equal(formatIndianDecimals(0), '0.00');
    });
  });

  describe('Indian Date Asia/Kolkata (todayIST)', () => {
    it('correctly handles Indian midnight rollover (00:30 IST returns India date)', () => {
      // 2026-11-18 at 19:00:00 UTC is 2026-11-19 at 00:30:00 IST (+05:30)
      const lateUtc = new Date('2026-11-18T19:00:00Z');
      const dateInIndia = todayIST(lateUtc);
      assert.equal(dateInIndia, '2026-11-19');
    });

    it('validates bill date bounds', () => {
      const today = new Date().toISOString().split('T')[0];
      assert.equal(isBillDateValid(today), true);
      // 2 years in past should fail
      assert.equal(isBillDateValid('2020-01-01'), false);
      // 1 month in future should fail
      assert.equal(isBillDateValid('2028-01-01'), false);
    });
  });

  describe('CSV Sanitizer (Formula Injection Protection)', () => {
    it('prefixes formula triggers =, +, -, @, \\t, \\r with a single quote', () => {
      assert.equal(sanitizeCsvCell('=SUM(A1:A10)'), '"\'=SUM(A1:A10)"');
      assert.equal(sanitizeCsvCell('+12345'), '"\'+12345"');
      assert.equal(sanitizeCsvCell('-500'), '"\'-500"');
      assert.equal(sanitizeCsvCell('@danger'), '"\'@danger"');
    });

    it('escapes internal quotes correctly', () => {
      assert.equal(sanitizeCsvCell('RTC "Special" Mandi'), '"RTC ""Special"" Mandi"');
    });

    it('generates a full sanitized CSV', () => {
      const data = [{ name: '=CMD()', town: 'Jaipur', total: 1000 }];
      const csv = generateCsv([
        { key: 'name', label: 'Party Name' },
        { key: 'town', label: 'Town' },
        { key: 'total', label: 'Total' },
      ], data);

      assert.match(csv, /"Party Name","Town","Total"/);
      assert.match(csv, /"'=CMD\(\)","Jaipur","1000"/);
    });
  });
});
