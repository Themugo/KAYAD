import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(here, '../../../supabase/migrations/20261110130000_inspection_payment_reject_cancelled_bookings.sql');
const sql = readFileSync(migrationPath, 'utf8');

describe('inspection payment/cancellation migration guard', () => {
  test('locks the booking and rejects terminal booking states before ledger posting', () => {
    expect(sql).toMatch(/WHERE id = p_booking_id\s+FOR UPDATE/i);
    expect(sql).toMatch(/b\.status IN \('cancelled', 'closed', 'no_show'\)/i);
    expect(sql.indexOf("b.status IN ('cancelled', 'closed', 'no_show')"))
      .toBeLessThan(sql.indexOf('kayad_post_ledger_entry_atomic'));
  });

  test('keeps the privileged payment RPC service-role-only', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.kayad_process_inspection_payment_atomic[\s\S]*FROM PUBLIC/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.kayad_process_inspection_payment_atomic[\s\S]*TO service_role/i);
  });
});
