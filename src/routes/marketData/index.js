import { Router } from "express";
import { insertMarketDataController } from "../../controllers/marketData";

export const marketDataRouter = (app) => {
  app.post("/api/market-data/insert", insertMarketDataController);
};
