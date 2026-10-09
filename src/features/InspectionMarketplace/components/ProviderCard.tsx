// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER CARD
// ============================================================

import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Shield, CheckCircle, Car, ChevronRight } from 'lucide-react';
import type { InspectionProvider, ServiceTaxonomy } from '../types/inspection';
import CapabilityBadges from './CapabilityBadges';

const KAYAD_COLORS = {
  lightNavy: '#12576D',
  warmBeige: '#F5F8F8',
  white: '#ffffff',
  emerald: '#13B8A6',
  mutedTerracotta: '#B8EEE7',
  softBlue: '#64748b',
};

interface ProviderCardProps {
  provider: InspectionProvider;
  onSelect?: (provider: InspectionProvider) => void;
  taxonomy?: ServiceTaxonomy | null;
}

export default function ProviderCard({ provider, onSelect, taxonomy = null }: ProviderCardProps) {
  const {
    companyName,
    logo,
    location,
    stats,
    verification,
    operatingModel,
    specializations,
    experience,
    packages,
  } = provider;

  // Get lowest price from packages
  const lowestPrice = packages?.length
    ? Math.min(...packages.map(p => p.price))
    : (provider.startingPrice ?? null);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-xl overflow-hidden shadow-md h-full flex flex-col"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      {/* Header with Logo */}
      <div
        className="h-32 relative"
        style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
      >
        {/* Logo */}
        <div className="absolute -bottom-8 left-4">
          <div
            className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold"
            style={{
              backgroundColor: KAYAD_COLORS.white,
              borderColor: KAYAD_COLORS.warmBeige
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={companyName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span style={{ color: KAYAD_COLORS.lightNavy }}>
                {companyName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Verification Badge */}
        {verification.status === 'verified' && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
          >
            <Shield size={12} />
            Verified business
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-12 flex-1 flex flex-col">
        {/* Name and Location */}
        <div className="mb-3">
          <h3
            className="text-lg font-bold mb-1"
            style={{ color: KAYAD_COLORS.lightNavy }}
          >
            {companyName}
          </h3>
          <div
            className="flex items-center gap-1 text-sm"
            style={{ color: KAYAD_COLORS.softBlue }}
          >
            <MapPin size={14} />
            <span>{location.town}, {location.county}</span>
          </div>
        </div>

        {/* Stats: only what exists. No review means no rating, never 0.0. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          {stats.totalReviews > 0 && stats.averageRating != null ? (
            <div className="flex items-center gap-1">
              <Star size={16} fill={KAYAD_COLORS.mutedTerracotta} color={KAYAD_COLORS.mutedTerracotta} aria-hidden />
              <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{stats.averageRating.toFixed(1)}</span>
              <span style={{ color: KAYAD_COLORS.softBlue }}>({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
            </div>
          ) : (
            <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>No reviews yet</span>
          )}
          {stats.completedInspections > 0 && (
            <div className="flex items-center gap-1 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
              <CheckCircle size={14} className="text-[#13B8A6]" aria-hidden />
              <span>{stats.completedInspections} inspections completed</span>
            </div>
          )}
        </div>

        {/* Services: verified vs declared are visibly different */}
        <div className="mb-3">
          <CapabilityBadges capabilities={provider.capabilities} taxonomy={taxonomy} max={4} />
        </div>

        {typeof provider.distanceKm === 'number' && (
          <p className="text-xs mb-3" style={{ color: KAYAD_COLORS.softBlue }}>
            About {provider.distanceKm} km away in a straight line
            {provider.withinServiceRadius === true && ' · inside their stated service area'}
            {provider.withinServiceRadius === false && ' · outside their stated service area'}
          </p>
        )}

        {/* Operating model the business declared */}
        <div className="flex flex-wrap gap-2 mb-4">
          {specializations.luxuryVehicles && <SpecializationBadge icon={<Car size={12} />} label="Luxury (declared)" />}
          {specializations.commercialVehicles && <SpecializationBadge icon={<Car size={12} />} label="Commercial (declared)" />}
          {operatingModel.offersMobile && <SpecializationBadge icon={<MapPin size={12} />} label="Mobile" />}
          {operatingModel.hasWorkshop && <SpecializationBadge icon={<Shield size={12} />} label="Workshop" />}
          {operatingModel.sameDayAvailable && <SpecializationBadge icon={<Clock size={12} />} label="Same day (declared)" />}
        </div>

        {/* Experience */}
        <div className="text-sm mb-4" style={{ color: KAYAD_COLORS.softBlue }}>
          {experience.yearsInBusiness > 0 && (
            <span>{experience.yearsInBusiness} years in business (as stated by the business)</span>
          )}
        </div>

        {/* Price and CTA */}
        <div className="mt-auto pt-4 border-t flex items-center justify-between" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <div>
            {lowestPrice ? (
              <>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Inspection from (set by the business)</p>
                <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>KES {lowestPrice.toLocaleString()}</p>
              </>
            ) : (
              <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Prices set by the business</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelect?.(provider)}
            className="flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: '#0F766E',
              color: KAYAD_COLORS.white
            }}
          >
            View business
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SpecializationBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
    >
      {icon}
      {label}
    </span>
  );
}
