import React from 'react';
import { Shield, Info, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';

export interface BuyerProtectionNoticeProps {
  variant?: 'compact' | 'full' | 'inline';
  organizerName?: string;
  showReadMore?: boolean;
}

export const BuyerProtectionNotice: React.FC<BuyerProtectionNoticeProps> = ({
  variant = 'inline',
  organizerName = 'the verified organizer',
  showReadMore = false,
}) => {
  const baseText = `This auction is conducted independently by the verified organizer shown above.`;

  const fullText = `This auction is conducted independently by the verified organizer shown above. KAYAD provides the digital marketplace and auction technology. Bid-confirmation payments may be processed through KAYAD's payment rail, while bid security and final vehicle settlement follow the auction's published organizer payment and settlement rules.`;

  // Compact variant - for use in headers
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3FAF9] border border-[#D7E7E4] rounded-lg">
        <Shield className="w-4 h-4 text-[#176B87] flex-shrink-0" />
        <span className="text-xs text-[#0E4655] font-medium">
          Auction conducted by organizer
        </span>
      </div>
    );
  }

  // Full variant - standalone card
  if (variant === 'full') {
    return (
      <Card className="p-5 bg-gradient-to-r from-[#F3FAF9] to-[#F6FAF9] border border-[#D7E7E4]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#DDF4F0] flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-[#176B87]" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-[#176B87] text-sm">Buyer Protection Notice</h4>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                ACTIVE
              </span>
            </div>
            <p className="text-sm text-[#12576D] leading-relaxed">
              {fullText}
            </p>
            <div className="pt-2 border-t border-[#D7E7E4]">
              <div className="flex items-center gap-4 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Secure Auction Technology
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Verified Organizers
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Direct Payment to Organizer
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Inline variant - default (for use within other cards)
  return (
    <div className="p-4 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#176B87]" />
        <span className="font-black text-sm text-[#176B87]">Auction Transparency Notice</span>
      </div>
      <p className="text-xs text-[#64748B] leading-relaxed">
        {showReadMore ? fullText : baseText}
      </p>
      <div className="pt-2 border-t border-[#D7E7E4]">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#176B87] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#0A3340] font-medium">
            Bid security and final vehicle settlement follow the published payment instructions for <strong>{organizerName}</strong>. A separate nominal bid-confirmation M-Pesa payment may be required when submitting a bid.
          </p>
        </div>
      </div>
    </div>
  );
};

// Compact inline notice for forms and modals
export const CompactProtectionNotice: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-2 bg-[#F3FAF9] border border-[#BDE5DE] rounded-lg">
    <Info className="w-4 h-4 text-[#176B87] flex-shrink-0" />
    <span className="text-xs text-[#0A3340]">
      Final settlement follows the published auction payment rule
    </span>
  </div>
);

// Trust statement footer for pages
export const TrustFooter: React.FC<{ organizerName?: string }> = ({
  organizerName = 'the auction organizer'
}) => (
  <div className="flex items-center justify-center gap-6 py-4 border-t border-[#D7E7E4] bg-[#F6FAF9]">
    <div className="flex items-center gap-2 text-xs text-[#64748B]">
      <Shield className="w-4 h-4 text-emerald-600" />
      <span>KAYAD Verified Marketplace</span>
    </div>
    <div className="w-px h-4 bg-[#BDE5DE]"></div>
    <div className="flex items-center gap-2 text-xs text-[#64748B]">
      <AlertCircle className="w-4 h-4 text-[#176B87]" />
      <span>Direct payment to {organizerName}</span>
    </div>
    <div className="w-px h-4 bg-[#BDE5DE]"></div>
    <div className="flex items-center gap-2 text-xs text-[#64748B]">
      <Info className="w-4 h-4 text-[#176B87]" />
      <span>Technology provider only</span>
    </div>
  </div>
);

export default BuyerProtectionNotice;
