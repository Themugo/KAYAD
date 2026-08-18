import { describe, it, expect } from 'vitest';
import { FAQ_DATA } from '../../features/SupportView/components/SupportFAQ';

describe('SupportFAQ - does not overclaim regulatory status or specific unverified bank partnerships', () => {
  // Found while auditing for fake/unverified trust claims (a production-
  // hardening spec's own "do not invent licences, banks, or regulatory
  // approvals" requirement): the escrow FAQ answers stated as
  // unconditional current fact that funds were "locked securely inside
  // Tier-1 Central Bank of Kenya (CBK) regulated bank trustee vaults
  // (NCBA Bank & Standard Chartered)" and referenced a "100%
  // money-back guarantee" - specific bank names and CBK regulation
  // presented as already-confirmed. This directly contradicts what's
  // actually true of this business (stated directly by the person
  // building it in an earlier request: not yet CBK-certified - see
  // escrowRulesConfig.ts's liveMode flag, built specifically for that
  // reason). Fixed to describe the system's intended design without
  // naming specific banks or claiming confirmed regulatory status.
  it('does not name specific banks as confirmed escrow partners anywhere in the FAQ data', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/NCBA Bank & Standard Chartered/);
    expect(fullText).not.toMatch(/NCBA Escrow Account/);
  });

  it('does not claim CBK regulation as an already-confirmed current fact', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/Central Bank of Kenya \(CBK\) regulated bank trustee vaults/);
  });

  it('does not make an unqualified "100% money-back guarantee" legal claim', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/100% money-back guarantee/);
  });

  it('the escrow FAQ still substantively explains fund protection (fix did not just delete the content)', () => {
    const escrowFaq = FAQ_DATA.find((f) => f.id === 'faq-esc-1');
    expect(escrowFaq).toBeTruthy();
    expect(escrowFaq!.answer.length).toBeGreaterThan(50);
    expect(escrowFaq!.answer).toMatch(/trustee|held|released/i);
  });

  // Found in a later pass, auditing this same file against language
  // already corrected elsewhere in this project (the inspection page
  // and homepage filters): "150-Point"/"150-Pt" named one specific,
  // fixed inspection depth as if every provider followed it - the
  // real, active inspection system has no such fixed standard, since
  // providers define their own checklist depth. "Escrow Vault" (vs.
  // this file's own already-correct "Escrow" elsewhere) was a second,
  // inconsistent label for the same real concept. Also found: the
  // financing FAQ separately named specific bank partners (NCBA,
  // Stanbic, Equity) and a specific interest rate (12.5% p.a.) as
  // confirmed fact - the same unverified-partnership pattern the tests
  // above already established as unacceptable for the escrow section,
  // just not yet applied to financing.
  it('does not name one fixed inspection point-count as a universal standard', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/150-Point|150-Pt|150-point/);
  });

  it('does not use "Escrow Vault" as an inconsistent second label for escrow', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/Escrow Vault/i);
  });

  it('does not name specific financing partner banks or a specific interest rate as confirmed fact', () => {
    const fullText = JSON.stringify(FAQ_DATA);
    expect(fullText).not.toMatch(/NCBA Bank Kenya|Stanbic Bank Kenya|Equity Bank Asset Finance/);
    expect(fullText).not.toMatch(/12\.5% p\.a\./);
  });
});
