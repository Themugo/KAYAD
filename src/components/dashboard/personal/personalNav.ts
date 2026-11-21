import { Activity, BarChart3, Car, LayoutDashboard, LifeBuoy, MessageCircle, PlusCircle, ShieldCheck, ShoppingBag, UserRound, BadgeCheck } from 'lucide-react';
import type React from 'react';

/**
 * Sections of the ONE personal dashboard. Every id maps to a view DashboardHub already renders
 * (no dead entries). Labels are the long-standing names the rest of the product and its tests use.
 */
export type PersonalSection = 'overview' | 'activity' | 'my-vehicles' | 'create-listing' | 'buying' | 'messages' | 'seller-enquiries' | 'auctions' | 'deals' | 'performance' | 'account' | 'trust' | 'help';

export type PersonalNavItem = { id: PersonalSection; label: string; icon: React.ElementType };
export type PersonalNavGroup = { id: string; label: string; items: PersonalNavItem[] };

export const personalNavGroups: PersonalNavGroup[] = [
  { id: 'overview', label: 'Overview', items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  { id: 'buying', label: 'Buying', items: [
    { id: 'buying', label: 'Buying', icon: ShoppingBag },
    { id: 'deals', label: 'Deals & escrow', icon: ShieldCheck },
  ] },
  { id: 'selling', label: 'Selling', items: [
    { id: 'create-listing', label: 'Create listing', icon: PlusCircle },
    { id: 'my-vehicles', label: 'My vehicles', icon: Car },
    { id: 'seller-enquiries', label: 'Seller enquiries', icon: MessageCircle },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ] },
  { id: 'activity', label: 'Activity', items: [
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'auctions', label: 'Auctions', icon: Activity },
    { id: 'activity', label: 'Activity', icon: Activity },
  ] },
  { id: 'account', label: 'Account', items: [
    { id: 'account', label: 'My Account', icon: UserRound },
    { id: 'trust', label: 'Verification & trust', icon: BadgeCheck },
    { id: 'help', label: 'Help & support', icon: LifeBuoy },
  ] },
];

export const personalNavItems: PersonalNavItem[] = personalNavGroups.flatMap((g) => g.items);
