-- LOCAL TEST FIXTURES ONLY (disposable DB). Never shipped. Titles carry a [LOCAL TEST] label.
insert into cars (title, brand, model, year, price, mileage, fuel, transmission, body_type, color, condition, description, images, location_city, status, approved, inspection_status)
values
('[LOCAL TEST] Toyota Land Cruiser 300','Toyota','Land Cruiser 300',2024,14500000,12000,'Diesel','Automatic','SUV','White','Used','Local test fixture','[{"url":"/hero/kayad-land-cruiser-cutout.png"}]','Nairobi','available',true,'passed'),
('[LOCAL TEST] Mercedes-Benz GLE','Mercedes-Benz','GLE',2023,11900000,18000,'Petrol','Automatic','SUV','Black','Used','Local test fixture','[{"url":"/hero/kayad-mercedes-gle-cutout.png"}]','Mombasa','available',true,'passed'),
('[LOCAL TEST] Subaru Forester','Subaru','Forester',2019,3200000,64000,'Petrol','Automatic','SUV','Grey','Used','Local test fixture','[]','Nakuru','available',true,'pending');
