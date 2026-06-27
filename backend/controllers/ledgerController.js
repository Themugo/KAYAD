import * as ledgerService from "../services/ledgerService.js";

export async function createLedgerEntry(req, res, next) {
  try {
    const entry = await ledgerService.recordLedgerEntry(req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function listLedgerEntries(req, res, next) {
  try {
    const result = await ledgerService.getLedgerEntries(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getLedgerEntry(req, res, next) {
  try {
    const entry = await ledgerService.getLedgerEntryById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: "Ledger entry not found" });
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function reverseLedgerEntry(req, res, next) {
  try {
    const entry = await ledgerService.reverseLedgerEntry(req.params.id, req.user._id, req.body.reason);
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function getBalanceSheet(req, res, next) {
  try {
    const balanceSheet = await ledgerService.getBalanceSheet();
    res.status(200).json({ success: true, data: balanceSheet });
  } catch (err) {
    next(err);
  }
}

export async function getTrialBalance(req, res, next) {
  try {
    const trialBalance = await ledgerService.getTrialBalance();
    res.status(200).json({ success: true, data: trialBalance });
  } catch (err) {
    next(err);
  }
}

export async function getReconciliationReport(req, res, next) {
  try {
    const report = await ledgerService.getReconciliationReport(req.query);
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function seedAccounts(req, res, next) {
  try {
    const accounts = await ledgerService.seedAccounts();
    res.status(200).json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
}
