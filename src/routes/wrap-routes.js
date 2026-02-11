import { healthRouter } from "./health";
import { testRouter } from "./test";
import { insertDataRouter } from "./insertData";
import { riskMeterRouter } from "./riskMeter";
export const wrapRoutes = (app) => {
  healthRouter(app);
  testRouter(app);
  insertDataRouter(app);
  riskMeterRouter(app);
};
