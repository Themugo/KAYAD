export type Auction = {
  id: string;
  title: string;
  year: number;
  price: number;
  image: string;
  timeLeft: string;
  live: boolean;
  location: string;
  bids: number;
};

export const DEMO_AUCTIONS: Auction[] = [
  {
    id: "vw-tiguan-2022",
    title: "Volkswagen Tiguan",
    year: 2022,
    price: 3450000,
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    timeLeft: "43h 53m",
    live: true,
    location: "Nairobi",
    bids: 14,
  },
  {
    id: "chevy-camaro-2021",
    title: "Chevrolet Camaro SS",
    year: 2021,
    price: 4850000,
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80",
    timeLeft: "18h 53m",
    live: true,
    location: "Mombasa",
    bids: 22,
  },
  {
    id: "bmw-330i-2020",
    title: "BMW 330i M Sport",
    year: 2020,
    price: 4200000,
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    timeLeft: "5h 53m",
    live: true,
    location: "Nairobi",
    bids: 31,
  },
  {
    id: "tlc-v8-2021",
    title: "Toyota Land Cruiser V8",
    year: 2021,
    price: 9250000,
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80",
    timeLeft: "2h 23m",
    live: true,
    location: "Karen",
    bids: 47,
  },
  {
    id: "mercedes-c200-2021",
    title: "Mercedes-Benz C200",
    year: 2021,
    price: 5100000,
    image: "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=900&q=80",
    timeLeft: "12h 04m",
    live: true,
    location: "Westlands",
    bids: 19,
  },
  {
    id: "mazda-cx5-2022",
    title: "Mazda CX-5",
    year: 2022,
    price: 3950000,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
    timeLeft: "1d 03h",
    live: false,
    location: "Nakuru",
    bids: 6,
  },
];

export const STATS = [
  { label: "Cars Listed", value: 14 },
  { label: "Brands", value: 11 },
  { label: "Live Auctions", value: 4 },
  { label: "Buy Now", value: 10 },
];

export const formatKES = (n: number) =>
  `KSh ${n.toLocaleString("en-KE")}`;
