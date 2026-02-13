import { riskMeterController, getRiskMeterController } from "../../controllers/riskMeter";

export const riskMeterRouter = (app) => {
  app.get("/riskMeter", riskMeterController);
  //app.get("/riskMeter2", getRiskMeterController);
};
