import { healthController } from "../../controllers/health";

export const healthRouter = (app) => {
  app.get("/health", healthController);
};
