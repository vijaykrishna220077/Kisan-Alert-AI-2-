import express from 'express';

let app: any;
try {
  // Use .js extension as required by Node ESM for local imports
  const module = await import('../server.js');
  app = module.default || module;
} catch (error: any) {
  app = express();
  app.use((req, res) => {
    res.status(500).json({ 
      error: 'Failed to boot Vercel API backend', 
      details: String(error), 
      stack: error.stack 
    });
  });
}

export default app;
