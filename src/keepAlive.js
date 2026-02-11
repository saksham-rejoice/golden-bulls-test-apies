const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  
  if (!url) {
    console.log('Keep-alive disabled: No URL configured');
    return;
  }

  setInterval(async () => {
    try {
      const response = await fetch(`${url}/health`);
      console.log(`Keep-alive ping: ${response.status}`);
    } catch (err) {
      console.error('Keep-alive ping failed:', err.message);
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  console.log('Keep-alive service started');
};

module.exports = { keepAlive };
