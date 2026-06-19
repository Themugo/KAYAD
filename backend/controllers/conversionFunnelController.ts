import ConversionFunnel from "../models/ConversionFunnel.ts";
import Car from "../models/Car.ts";

// =============================
// 📊 TRACK FUNNEL EVENTS
// =============================

// Track car view
export const trackView = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.json({ success: true }); // Anonymous views are tracked separately if needed
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        currentStage: "viewed",
      });
    } else {
      funnel.viewCount += 1;
      funnel.lastViewedAt = new Date();
      if (funnel.currentStage === "viewed") {
        // Update time metrics if this is the first view
        if (!funnel.timeToFavorite) funnel.timeToFavorite = 0;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({ success: false, message: "Failed to track view" });
  }
};

// Track favorite
export const trackFavorite = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        favorited: true,
        favoritedAt: new Date(),
        currentStage: "favorited",
      });
    } else {
      funnel.favorited = true;
      funnel.favoritedAt = new Date();
      funnel.currentStage = "favorited";

      // Calculate time to favorite
      if (funnel.lastViewedAt) {
        const timeDiff = (new Date(funnel.favoritedAt) - new Date(funnel.lastViewedAt)) / (1000 * 60 * 60);
        funnel.timeToFavorite = timeDiff;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking favorite:", error);
    res.status(500).json({ success: false, message: "Failed to track favorite" });
  }
};

// Track chat initiation
export const trackChat = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        chatInitiated: true,
        chatInitiatedAt: new Date(),
        messageCount: 1,
        currentStage: "chatted",
      });
    } else {
      funnel.chatInitiated = true;
      funnel.chatInitiatedAt = funnel.chatInitiatedAt || new Date();
      funnel.messageCount += 1;
      funnel.currentStage = "chatted";

      // Calculate time to chat
      if (!funnel.timeToChat && funnel.lastViewedAt) {
        const timeDiff = (new Date(funnel.chatInitiatedAt) - new Date(funnel.lastViewedAt)) / (1000 * 60 * 60);
        funnel.timeToChat = timeDiff;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking chat:", error);
    res.status(500).json({ success: false, message: "Failed to track chat" });
  }
};

// Track offer
export const trackOffer = async (req, res) => {
  try {
    const { carId } = req.params;
    const { amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        offerMade: true,
        offerMadeAt: new Date(),
        offerAmount: amount,
        currentStage: "offered",
      });
    } else {
      funnel.offerMade = true;
      funnel.offerMadeAt = funnel.offerMadeAt || new Date();
      funnel.offerAmount = amount;
      funnel.currentStage = "offered";

      // Calculate time to offer
      if (!funnel.timeToOffer && funnel.lastViewedAt) {
        const timeDiff = (new Date(funnel.offerMadeAt) - new Date(funnel.lastViewedAt)) / (1000 * 60 * 60);
        funnel.timeToOffer = timeDiff;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking offer:", error);
    res.status(500).json({ success: false, message: "Failed to track offer" });
  }
};

// Track escrow
export const trackEscrow = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        escrowInitiated: true,
        escrowInitiatedAt: new Date(),
        currentStage: "escrow",
      });
    } else {
      funnel.escrowInitiated = true;
      funnel.escrowInitiatedAt = funnel.escrowInitiatedAt || new Date();
      funnel.currentStage = "escrow";

      // Calculate time to escrow
      if (!funnel.timeToEscrow && funnel.lastViewedAt) {
        const timeDiff = (new Date(funnel.escrowInitiatedAt) - new Date(funnel.lastViewedAt)) / (1000 * 60 * 60);
        funnel.timeToEscrow = timeDiff;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking escrow:", error);
    res.status(500).json({ success: false, message: "Failed to track escrow" });
  }
};

// Track sale
export const trackSale = async (req, res) => {
  try {
    const { carId } = req.params;
    const { amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let funnel = await ConversionFunnel.findOne({ car: carId, user: userId });

    if (!funnel) {
      const car = await Car.findById(carId).select("dealer");
      funnel = new ConversionFunnel({
        car: carId,
        dealer: car?.dealer,
        user: userId,
        viewCount: 1,
        lastViewedAt: new Date(),
        sold: true,
        soldAt: new Date(),
        saleAmount: amount,
        currentStage: "sold",
      });
    } else {
      funnel.sold = true;
      funnel.soldAt = funnel.soldAt || new Date();
      funnel.saleAmount = amount;
      funnel.currentStage = "sold";

      // Calculate time to sale
      if (!funnel.timeToSale && funnel.lastViewedAt) {
        const timeDiff = (new Date(funnel.soldAt) - new Date(funnel.lastViewedAt)) / (1000 * 60 * 60);
        funnel.timeToSale = timeDiff;
      }
    }

    await funnel.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking sale:", error);
    res.status(500).json({ success: false, message: "Failed to track sale" });
  }
};

// =============================
// 📊 GET FUNNEL ANALYTICS
// =============================

export const getFunnelAnalytics = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Get all funnel entries for this car
    const funnels = await ConversionFunnel.find({ car: carId });

    // Calculate funnel metrics
    const totalViews = funnels.length;
    const favorited = funnels.filter((f) => f.favorited).length;
    const chatted = funnels.filter((f) => f.chatInitiated).length;
    const offered = funnels.filter((f) => f.offerMade).length;
    const escrowInitiated = funnels.filter((f) => f.escrowInitiated).length;
    const sold = funnels.filter((f) => f.sold).length;

    // Calculate conversion rates
    const toFavoriteRate = totalViews > 0 ? (favorited / totalViews) * 100 : 0;
    const toChatRate = favorited > 0 ? (chatted / favorited) * 100 : 0;
    const toOfferRate = chatted > 0 ? (offered / chatted) * 100 : 0;
    const toEscrowRate = offered > 0 ? (escrowInitiated / offered) * 100 : 0;
    const toSaleRate = escrowInitiated > 0 ? (sold / escrowInitiated) * 100 : 0;

    // Calculate average time at each stage
    const avgTimeToFavorite =
      funnels.filter((f) => f.timeToFavorite).reduce((sum, f) => sum + f.timeToFavorite, 0) /
      (funnels.filter((f) => f.timeToFavorite).length || 1);
    const avgTimeToChat =
      funnels.filter((f) => f.timeToChat).reduce((sum, f) => sum + f.timeToChat, 0) /
      (funnels.filter((f) => f.timeToChat).length || 1);
    const avgTimeToOffer =
      funnels.filter((f) => f.timeToOffer).reduce((sum, f) => sum + f.timeToOffer, 0) /
      (funnels.filter((f) => f.timeToOffer).length || 1);
    const avgTimeToSale =
      funnels.filter((f) => f.timeToSale).reduce((sum, f) => sum + f.timeToSale, 0) /
      (funnels.filter((f) => f.timeToSale).length || 1);

    res.json({
      success: true,
      analytics: {
        funnel: {
          views: totalViews,
          favorited,
          chatted,
          offered,
          escrowInitiated,
          sold,
        },
        conversionRates: {
          toFavorite: toFavoriteRate.toFixed(1),
          toChat: toChatRate.toFixed(1),
          toOffer: toOfferRate.toFixed(1),
          toEscrow: toEscrowRate.toFixed(1),
          toSale: toSaleRate.toFixed(1),
        },
        avgTimeToStage: {
          toFavorite: avgTimeToFavorite.toFixed(1),
          toChat: avgTimeToChat.toFixed(1),
          toOffer: avgTimeToOffer.toFixed(1),
          toSale: avgTimeToSale.toFixed(1),
        },
      },
    });
  } catch (error) {
    console.error("Error getting funnel analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get funnel analytics" });
  }
};

export const getDealerFunnelAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Get all funnel entries for this dealer's cars
    const funnels = await ConversionFunnel.find({ dealer: userId });

    // Aggregate metrics across all cars
    const totalViews = funnels.reduce((sum, f) => sum + f.viewCount, 0);
    const favorited = funnels.filter((f) => f.favorited).length;
    const chatted = funnels.filter((f) => f.chatInitiated).length;
    const offered = funnels.filter((f) => f.offerMade).length;
    const escrowInitiated = funnels.filter((f) => f.escrowInitiated).length;
    const sold = funnels.filter((f) => f.sold).length;

    // Group by car for detailed breakdown
    const byCar = {};
    funnels.forEach((f) => {
      const carId = f.car.toString();
      if (!byCar[carId]) {
        byCar[carId] = {
          views: 0,
          favorited: 0,
          chatted: 0,
          offered: 0,
          escrowInitiated: 0,
          sold: 0,
        };
      }
      byCar[carId].views += f.viewCount;
      if (f.favorited) byCar[carId].favorited++;
      if (f.chatInitiated) byCar[carId].chatted++;
      if (f.offerMade) byCar[carId].offered++;
      if (f.escrowInitiated) byCar[carId].escrowInitiated++;
      if (f.sold) byCar[carId].sold++;
    });

    res.json({
      success: true,
      analytics: {
        total: {
          views: totalViews,
          favorited,
          chatted,
          offered,
          escrowInitiated,
          sold,
        },
        byCar,
      },
    });
  } catch (error) {
    console.error("Error getting dealer funnel analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get dealer funnel analytics" });
  }
};
