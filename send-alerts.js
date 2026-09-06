const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

let missingVars = [];
if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
if (!SUPABASE_KEY) missingVars.push('SUPABASE_ANON_KEY');
if (!RESEND_API_KEY) missingVars.push('RESEND_API_KEY');
if (!ALERT_EMAIL) missingVars.push('ALERT_EMAIL');

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

function parseDriveLinks(url) {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/id=([a-zA-Z0-9_-]+)/) ||
                url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  return url;
}

async function runAlertService() {
  console.log('Fetching assets for active attention check...');

  const { data, error } = await supabase
    .from('personal_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No assets found in vault.');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAttentionList = [];

  data.forEach(item => {
    // 1. Next Due Date Check (Due within 60 days, overdue by at most 90 days)
    if (item.next_due_date) {
      const dueDate = new Date(item.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 60 && diffDays >= -90) {
        let statusText = '';
        if (diffDays < 0) {
          statusText = `Overdue by ${Math.abs(diffDays)} day(s)`;
        } else if (diffDays === 0) {
          statusText = 'Due Today!';
        } else {
          statusText = `Due in ${diffDays} day(s)`;
        }

        activeAttentionList.push({
          category: item.category || 'Asset',
          item_name: item.item_type || item.item_name || 'Item',
          detail: item.item_model || '—',
          status: statusText,
          date: item.next_due_date,
          dateLabel: 'Due Date',
          isUrgent: diffDays <= 7,
          docUrl: parseDriveLinks(item.bill_url)
        });
      }
    }

    // 2. Purchase Anniversary Check (Within 30 Days)
    if (item.purchase_date) {
      const pDate = new Date(item.purchase_date);
      const thisYearAnniv = new Date(today.getFullYear(), pDate.getMonth(), pDate.getDate());
      let annivDiff = Math.ceil((thisYearAnniv - today) / (1000 * 60 * 60 * 24));

      if (annivDiff < 0) {
        const nextYearAnniv = new Date(today.getFullYear() + 1, pDate.getMonth(), pDate.getDate());
        annivDiff = Math.ceil((nextYearAnniv - today) / (1000 * 60 * 60 * 24));
      }

      if (annivDiff <= 30 && annivDiff >= 0) {
        activeAttentionList.push({
          category: item.category || 'Asset',
          item_name: item.item_type || item.item_name || 'Item',
          detail: item.item_model || '—',
          status: annivDiff === 0 ? 'Anniversary Today!' : `Anniversary in ${annivDiff} day(s)`,
          date: item.purchase_date,
          dateLabel: 'Purchase Date',
          isUrgent: false,
          docUrl: parseDriveLinks(item.bill_url)
        });
      }
    }
  });

  if (activeAttentionList.length === 0) {
    console.log('No records requiring attention today. Skipping email.');
    return;
  }

  console.log(`Found ${activeAttentionList.length} attention item(s). Sending email via Resend...`);

  const tableRows = activeAttentionList.map(a => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 10px 12px; font-weight: bold; color: #8c788a;">${a.category}</td>
      <td style="padding: 10px 12px; color: #1e293b;">
        <strong>${a.item_name}</strong><br>
        <span style="font-size: 11px; color: #64748b;">${a.detail}</span>
      </td>
      <td style="padding: 10px 12px;">
        <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; ${
          a.isUrgent ? 'background-color: #ffe4e6; color: #9f1239;' : 'background-color: #fef3c7; color: #92400e;'
        }">
          ${a.status}
        </span>
      </td>
      <td style="padding: 10px 12px; color: #475569;">
        ${a.date}<br>
        <span style="font-size: 10px; color: #94a3b8;">(${a.dateLabel})</span>
      </td>
      <td style="padding: 10px 12px;">
        ${a.docUrl ? `<a href="${a.docUrl}" target="_blank" style="color: #8c788a; font-weight: bold; text-decoration: none;">View File ↗</a>` : '<span style="color: #cbd5e1;">—</span>'}
      </td>
    </tr>
  `).join('');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #334155;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #8c788a; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">Thiru Vault — Active Attention Digest</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Milestones, renewals, and anniversaries requiring your review</p>
        </div>

        <div style="padding: 20px 24px;">
          <p style="font-size: 13px; line-height: 1.5; margin-top: 0;">
            Here are the items from your Vault that are currently within the active attention threshold:
          </p>

          <table style="width: 100%; border-collapse: collapse; text-align: left; margin: 16px 0;">
            <thead>
              <tr style="background-color: #f1f5f9; font-size: 12px; color: #64748b;">
                <th style="padding: 8px 12px;">Category</th>
                <th style="padding: 8px 12px;">Item</th>
                <th style="padding: 8px 12px;">Alert Status</th>
                <th style="padding: 8px 12px;">Date</th>
                <th style="padding: 8px 12px;">Document</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            This automated digest is sent once every 2 days when active milestones are detected.
          </div>
        </div>
      </div>
    </div>
  `;

  const { data: resendData, error: resendError } = await resend.emails.send({
    from: 'Thiru Vault Alerts <onboarding@resend.dev>',
    to: ALERT_EMAIL,
    subject: `⚠️ Thiru Vault: ${activeAttentionList.length} Item(s) Need Attention`,
    html: htmlBody
  });

  if (resendError) {
    console.error('Resend delivery error:', resendError);
    process.exit(1);
  }

  console.log('Email alert sent successfully via Resend!', resendData);
}

runAlertService();
