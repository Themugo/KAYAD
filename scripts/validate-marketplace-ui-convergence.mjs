import fs from 'fs';
import path from 'path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
const check=(name,ok)=>checks.push([name,ok]);
check('feature CarCard is compatibility-only',/Compatibility export/.test(read('src/components/features/car/CarCard.tsx'))&&!/useState/.test(read('src/components/features/car/CarCard.tsx')));
check('feature CartyGrid is compatibility-only',/Compatibility export/.test(read('src/components/features/car/CartyGrid.tsx'))&&!/function CarGridItem/.test(read('src/components/features/car/CartyGrid.tsx')));
// STAGE 11 PHASE E: MobileCarCard.jsx (and its sole dependency,
// components/VehicleCard/VehicleCard.jsx, plus that directory's own
// index.js barrel) were proven genuinely dead code -- zero imports,
// dynamic imports, route/lazy/string refs, test refs, CSS refs, or
// build refs anywhere in the app -- and removed. This check now
// verifies that removal held (file gone, no longer re-exported) rather
// than asserting the old compatibility-wrapper shape, which no longer
// exists by design. See STAGE11_UX_HARDENING_AUDIT_20261008.md Phase E.
check('mobile card dead-code removal held (Stage 11 Phase E)',!fs.existsSync(path.join(root,'src/components/mobile/MobileCarCard.jsx'))&&!fs.existsSync(path.join(root,'src/components/VehicleCard/VehicleCard.jsx'))&&!fs.existsSync(path.join(root,'src/components/VehicleCard/index.js'))&&!/export.*from ['"]\.\/MobileCarCard['"]/.test(read('src/components/mobile/index.js')));
check('Marketplace uses canonical VehicleCard',/import VehicleCard from ['"]\.\.\/\.\.\/\.\.\/components\/VehicleCard['"]/.test(read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx')));
check('Showroom has one grid authority',/import CartyGrid from ['"]\.\.\/components\/CartyGrid['"]/.test(read('src/pages/Showroom.jsx')));
check('SimilarCars reuses canonical grid path',/import CartyGrid from ['"]\.\.\/\.\.\/\.\.\/components\/CartyGrid['"]/.test(read('src/components/features/car/SimilarCars.tsx')));
check('no Marketplace purchase API was duplicated in UI',!/(createEscrow|initiatePayment\(|atomicSettlePurchasePayment)/.test(read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx')));
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok)pass++;}
console.log(`\nMarketplace UI convergence: ${pass}/${checks.length} PASS`); if(pass!==checks.length)process.exit(1);
