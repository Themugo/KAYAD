/*
# Create update_car_bid_stats RPC function

Updates a car's current_bid and bids_count after a new bid is placed.
Called from the frontend after inserting a bid.
*/

CREATE OR REPLACE FUNCTION update_car_bid_stats(car_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE cars SET
    current_bid = COALESCE((SELECT MAX(amount) FROM bids WHERE bids.car_id = update_car_bid_stats.car_id), current_bid),
    bids_count = (SELECT COUNT(*) FROM bids WHERE bids.car_id = update_car_bid_stats.car_id)
  WHERE cars.id = update_car_bid_stats.car_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
