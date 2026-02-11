import express, { json } from "express";
import { wrapRoutes } from "./routes/wrap-routes";
import cors from "cors";
const app = express();

app.use(json());
app.use(cors());

const PORT = process.env.PORT || 4000;
wrapRoutes(app);

// Start cron jobs
// require('./cronJobs'); // DISABLED

// Keep-alive to prevent Render spin-down
const { keepAlive } = require('./keepAlive');

app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
  keepAlive();
});
