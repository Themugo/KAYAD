import { AuctionSession, Vehicle } from '../types';
import { INITIAL_VEHICLES } from './mockVehicles';

const nissanVehicle = INITIAL_VEHICLES.find(v => v.id === 'v4') || INITIAL_VEHICLES[3];
const mercVehicle = INITIAL_VEHICLES.find(v => v.id === 'v6') || INITIAL_VEHICLES[5];

export const INITIAL_AUCTION_SESSIONS: AuctionSession[] = [
  {
    id: 'AUC-2026-8801',
    vehicleId: nissanVehicle.id,
    vehicleTitle: nissanVehicle.title,
    vehicle: nissanVehicle,
    sellerId: 'd3',
    sellerName: nissanVehicle.sellerName,
    sellerType: nissanVehicle.sellerType,
    category: 'Bank Repossession',
    status: 'Live',
    startingPrice: 1800000,
    reservePrice: 2200000,
    currentBid: 2300000,
    buyoutPrice: 2450000,
    minimumIncrement: 25000,
    startsAt: '2026-07-28T09:00:00Z',
    endsAt: '2026-08-01T15:00:00Z',
    totalBidsCount: 14,
    uniqueBiddersCount: 6,
    reserveMet: true,
    termsAndConditions: [
      'NCBA Bank Repossession Asset Sale #4092.',
      '150-Point physical inspection report available for download.',
      'Logbook title transfer handled directly via KAYAD Escrow Vault & NTSA TIMS.',
      'Winning bidder must complete payment within 48 hours.'
    ],
    bidHistory: [
      { id: 'b1', bidderName: 'Francis M.', bidderLocation: 'Eldoret', amount: 2300000, timestamp: '10 mins ago', status: 'Highest Bid' },
      { id: 'b2', bidderName: 'Kevin K.', bidderLocation: 'Nakuru', amount: 2250000, timestamp: '45 mins ago', status: 'Outbid' },
      { id: 'b3', bidderName: 'Francis M.', bidderLocation: 'Eldoret', amount: 2200000, timestamp: '2 hours ago', status: 'Outbid' },
      { id: 'b4', bidderName: 'Daniel O.', bidderLocation: 'Nairobi', amount: 2100000, timestamp: '5 hours ago', status: 'Outbid' },
      { id: 'b5', bidderName: 'Kevin K.', bidderLocation: 'Nakuru', amount: 1950000, timestamp: 'Yesterday', status: 'Outbid' },
      { id: 'b6', bidderName: 'Initial Bidder', bidderLocation: 'Eldoret', amount: 1800000, timestamp: '2 days ago', status: 'Outbid' }
    ]
  },
  {
    id: 'AUC-2026-8802',
    vehicleId: mercVehicle.id,
    vehicleTitle: mercVehicle.title,
    vehicle: mercVehicle,
    sellerId: 'd1',
    sellerName: mercVehicle.sellerName,
    sellerType: mercVehicle.sellerType,
    category: 'Direct Import',
    status: 'Live',
    startingPrice: 3500000,
    reservePrice: 4000000,
    currentBid: 4100000,
    buyoutPrice: 4350000,
    minimumIncrement: 50000,
    startsAt: '2026-07-27T10:00:00Z',
    endsAt: '2026-07-30T18:00:00Z',
    totalBidsCount: 19,
    uniqueBiddersCount: 8,
    reserveMet: true,
    termsAndConditions: [
      'Direct Japan Import - Prestige Cars Showroom Clearance.',
      'Zero local accident history with verified mileage auction sheet.',
      'Escrow Vault protection active upon buyout or highest bid settlement.',
      'KRA Duty Paid and NTSA TIMS registration ready.'
    ],
    bidHistory: [
      { id: 'bm1', bidderName: 'Dr. Amina S.', bidderLocation: 'Nairobi', amount: 4100000, timestamp: '15 mins ago', status: 'Highest Bid' },
      { id: 'bm2', bidderName: 'Charles W.', bidderLocation: 'Mombasa', amount: 4050000, timestamp: '1 hour ago', status: 'Outbid' },
      { id: 'bm3', bidderName: 'Dr. Amina S.', bidderLocation: 'Nairobi', amount: 4000000, timestamp: '3 hours ago', status: 'Outbid' },
      { id: 'bm4', bidderName: 'George N.', bidderLocation: 'Kisumu', amount: 3850000, timestamp: 'Yesterday', status: 'Outbid' }
    ]
  },
  {
    id: 'AUC-2026-8803',
    vehicleId: 'v1',
    vehicleTitle: '2021 Toyota Land Cruiser Prado TX-L 2.8L',
    vehicle: INITIAL_VEHICLES[0],
    sellerId: 'd1',
    sellerName: 'Crown Motors Kenya',
    sellerType: 'Verified Dealer',
    category: 'Fleet Clearance',
    status: 'Upcoming',
    startingPrice: 5900000,
    reservePrice: 6500000,
    currentBid: 5900000,
    buyoutPrice: 6850000,
    minimumIncrement: 50000,
    startsAt: '2026-08-05T09:00:00Z',
    endsAt: '2026-08-08T18:00:00Z',
    totalBidsCount: 0,
    uniqueBiddersCount: 0,
    reserveMet: false,
    termsAndConditions: [
      'Corporate Ex-Lease Executive SUV Clearance.',
      'Complete Toyota Kenya maintenance logs attached.',
      'Auction begins automatically at countdown expiry.'
    ],
    bidHistory: []
  },
  {
    id: 'AUC-2026-8799',
    vehicleId: 'v2',
    vehicleTitle: '2019 Subaru Outback 2.5i EyeSight Limited',
    vehicle: INITIAL_VEHICLES[1],
    sellerId: 'd2',
    sellerName: 'Coastline Auto Ltd',
    sellerType: 'Verified Dealer',
    category: 'Direct Import',
    status: 'Ended',
    startingPrice: 2800000,
    reservePrice: 3100000,
    currentBid: 3200000,
    buyoutPrice: 3250000,
    minimumIncrement: 25000,
    startsAt: '2026-07-20T09:00:00Z',
    endsAt: '2026-07-25T18:00:00Z',
    totalBidsCount: 22,
    uniqueBiddersCount: 9,
    reserveMet: true,
    termsAndConditions: [
      'Auction completed and reserve met.',
      'Payment transferred via KAYAD Escrow Vault.'
    ],
    bidHistory: [
      { id: 'be1', bidderName: 'Peter O.', bidderLocation: 'Mombasa', amount: 3200000, timestamp: 'Ended 4 days ago', status: 'Winning' },
      { id: 'be2', bidderName: 'Sarah H.', bidderLocation: 'Nairobi', amount: 3150000, timestamp: 'Ended 4 days ago', status: 'Outbid' }
    ]
  }
];
