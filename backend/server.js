require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://smfruwxqzsncpehmazqv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_gcSvN5ZnndnTYCHs5cte1Q_ZU_q0xWi';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vault API active' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Backend server active on http://localhost:' + PORT));