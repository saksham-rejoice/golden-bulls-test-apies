import { insertDataController, getDataController, updateCurrencyData } from "../../controllers/insertData";

export const insertDataRouter = (app) => {
  app.post("/insertData", insertDataController);
  app.get("/getData", getDataController);
  app.post("/updateData", async (req, res) => {
    const result = await updateCurrencyData();
    return res.json(result);
  });
};
