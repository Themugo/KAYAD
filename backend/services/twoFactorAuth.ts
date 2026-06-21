// services/twoFactorAuth.ts - Two-Factor Authentication service
// @ts-expect-error no types
import speakeasy from 'speakeasy';
// @ts-expect-error no types
import QRCode from 'qrcode';
import { User } from '../db/index.js';

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResult {
  valid: boolean;
  message: string;
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateSecret(user: Record<string, unknown>): TwoFactorSetup {
  const secret = speakeasy.generateSecret({
    name: 'SimTrace',
    issuer: 'SimTrace',
    user: user.email as string,
  });

  return {
    secret: secret.base32!,
    qrCode: secret.otpauth_url!,
    backupCodes: generateBackupCodes(),
  };
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(speakeasy.generateSecret({ length: 20 }).base32!.substring(0, 8));
  }
  return codes;
}

/**
 * Generate QR code from secret
 */
export async function generateQRCode(secret: string): Promise<string> {
  const otpauthUrl = speakeasy.otpauthURL({
    secret,
    label: 'SimTrace',
    issuer: 'SimTrace',
  });
  return await QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify TOTP token
 */
export function verifyToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before and after
  });
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, backupCodes: string[]): boolean {
  return backupCodes.includes(code);
}

/**
 * Enable 2FA for a user
 */
export async function enableTwoFactorAuth(userId: string, secret: string, backupCodes: string[]): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    twoFactorEnabled: true,
    twoFactorSecret: secret,
    twoFactorBackupCodes: backupCodes,
  });
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactorAuth(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: undefined,
    twoFactorBackupCodes: undefined,
  });
}

/**
 * Verify 2FA during login
 */
export async function verifyTwoFactorAuth(userId: string, token: string): Promise<TwoFactorVerifyResult> {
  const user = await User.findById(userId).select("+twoFactorSecret +twoFactorBackupCodes");

  if (!user) {
    return { valid: false, message: 'User not found' };
  }

  const u = user as unknown as { twoFactorEnabled?: boolean; twoFactorSecret?: string; twoFactorBackupCodes?: string[] };

  if (!u.twoFactorEnabled) {
    return { valid: true, message: '2FA not enabled for this user' };
  }

  // Check TOTP token
  if (u.twoFactorSecret && verifyToken(token, u.twoFactorSecret)) {
    return { valid: true, message: '2FA verified successfully' };
  }

  // Check backup codes
  if (u.twoFactorBackupCodes && verifyBackupCode(token, u.twoFactorBackupCodes)) {
    // Remove used backup code
    await User.findByIdAndUpdate(userId, {
      $pull: { twoFactorBackupCodes: token },
    });
    return { valid: true, message: 'Backup code verified' };
  }

  return { valid: false, message: 'Invalid 2FA token' };
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const newCodes = generateBackupCodes();
  await User.findByIdAndUpdate(userId, {
    twoFactorBackupCodes: newCodes,
  });
  return newCodes;
}

/**
 * Check if user has 2FA enabled
 */
export async function hasTwoFactorEnabled(userId: string): Promise<boolean> {
  const user = await User.findById(userId);
  const u = user as unknown as { twoFactorEnabled?: boolean } | null;
  return u?.twoFactorEnabled || false;
}
