const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.ALERT_EMAIL;

if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY || !TO_EMAIL) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sendEmailDigest(subject, htmlBody) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      from: 'Vault Alerts <onboarding@resend.dev>',
      to: [TO_EMAIL],
      subject: subject,
      html: htmlBody
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Resend Response:', data);
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error('Dispatch error:', err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runDailyCheck() {
  console.log('🔍 Scanning Vault records for milestone alerts...');

  const { data, error } = await supabase
    .from('personal_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to query Supabase:', error);
    process.exit(1);
  }

  const today = new Date();
  const alerts = [];

  if (data) {
    data.forEach(item => {
      if (!item.purchase_date) return;

      const loggedDate = new Date(item.purchase_date);
      const diffTime = today - loggedDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (item.category === 'Vehicle' && diffDays >= 180) {
        alerts.push({
          category: 'Vehicle',
          title: `${item.item_type || 'Vehicle'} (${item.item_model || 'Service'})`,
          status: 'Periodic Service Due',
          date: item.purchase_date,
          link: item.bill_url
        });
      } else if (item.category === 'Appliance' && diffDays >= 335) {
        alerts.push({
          category: 'Appliance',
          title: item.item_type,
          status: 'Warranty / Renewal Check Due',
          date: item.purchase_date,
          link: item.bill_url
        });
      } else if (item.category === 'Personal Document' && diffDays >= 335) {
        alerts.push({
          category: 'Personal Document',
          title: `${item.item_type}'s ${item.item_model}`,
          status: 'Validity / Renewal Review',
          date: item.purchase_date,
          link: item.bill_url
        });
      }
    });
  }

  if (alerts.length > 0) {
    console.log(`Found ${alerts.length} alert(s). Dispatching email...`);

    const tableRows = alerts.map(a => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold; color: #8c788a;">${a.category}</td>
        <td style="padding: 10px; color: #333;">${a.title}</td>
        <td style="padding: 10px; color: #d97706; font-weight: 600;">${a.status}</td>
        <td style="padding: 10px; color: #666;">${a.date}</td>
        <td style="padding: 10px;">
          ${a.link ? `<a href="${a.link}" style="color: #8c788a; text-decoration: none; font-weight: bold;">View File ↗</a>` : '—'}
        </td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f6f3f7;">
          <h2 style="color: #382c37; margin-bottom: 4px;">Vault Asset & Expiry Digest</h2>
          <p style="color: #826e7e; font-size: 13px; margin: 0;">Automated milestone tracking for your vehicles, appliances, and personal documents.</p>
        </div>
        <div style="padding: 16px 0;">
          <p style="font-size: 14px; color: #382c37;">You have <strong>${alerts.length} milestone(s)</strong> that require review:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f8f6f8; color: #555;">
                <th style="padding: 10px;">Category</th>
                <th style="padding: 10px;">Item</th>
                <th style="padding: 10px;">Alert Type</th>
                <th style="padding: 10px;">Date</th>
                <th style="padding: 10px;">Document</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    await sendEmailDigest(`⚠️ Vault Alert: ${alerts.length} Asset Milestone(s) Need Attention`, htmlBody);
    console.log('✅ Email digest sent!');
  } else {
    console.log('✅ All assets up to date. No email needed today.');
  }
}

runDailyCheck();
