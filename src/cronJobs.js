import cron from 'node-cron';
import { updateCurrencyData } from './controllers/insertData';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running currency data update cron job...');
  await updateCurrencyData();
});

console.log('Cron job scheduled: Currency data update every 5 minutes');

export default {};
