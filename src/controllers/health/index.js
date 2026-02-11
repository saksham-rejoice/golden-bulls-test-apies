import { success } from "../../helpers";

export const healthController = (request, response) => {
  success(request, response, {
    health: "ok",
    uptime: process.uptime(),
  });
};
