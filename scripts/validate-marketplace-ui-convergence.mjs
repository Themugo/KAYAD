import fs from 'fs';
import path from 'path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
const check=(name,ok)=>checks.push([name,ok]);
check('feature CarCard is compatibility-only',/Compatibility export/.test(read('src/components/features/car/CarCard.tsx'))&&!/useState/.test(read('src/components/features/car/CarCard.tsx')));
check('feature CartyGrid is compatibility-only',/Compatibility export/.test(read('src/components/features/car/CartyGrid.tsx'))&&!/function CarGridItem/.test(read('src/components/features/car/CartyGrid.tsx')));
check('mobile card is compatibility wrapper',/deprecated.*VehicleCard/i.test(read('src/components/mobile/MobileCarCard.jsx'))&&/VehicleCard/.test(read('src/components/mobile/MobileCarCard.jsx')));
check('Marketplace uses canonical VehicleCard',/import VehicleCard from ['"]\.\.\/\.\.\/\.\.\/components\/VehicleCard['"]/.test(read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx')));
check('Showroom has one grid authority',/import CartyGrid from ['"]\.\.\/components\/CartyGrid['"]/.test(read('src/pages/Showroom.jsx')));
check('SimilarCars reuses canonical grid path',/import CartyGrid from ['"]\.\.\/\.\.\/\.\.\/components\/CartyGrid['"]/.test(read('src/components/features/car/SimilarCars.tsx')));
check('no Marketplace purchase API was duplicated in UI',!/(createEscrow|initiatePayment\(|atomicSettlePurchasePayment)/.test(read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx')));
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok)pass++;}
console.log(`\nMarketplace UI convergence: ${pass}/${checks.length} PASS`); if(pass!==checks.length)process.exit(1);
