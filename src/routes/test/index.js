import { testController } from "../../controllers/test";

export const testRouter = (app) => {
  app.get("/test", testController);
};
