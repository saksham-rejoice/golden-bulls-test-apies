import { insertDataController, getDataController } from "../../controllers/insertData";

export const insertDataRouter = (app) => {
  app.post("/insertData", insertDataController);
  app.get("/getData", getDataController);
};
