import { riskMeterController } from "../../controllers/riskMeter";

export const riskMeterRouter = (app) => {
  app.get("/riskMeter", riskMeterController);
};
