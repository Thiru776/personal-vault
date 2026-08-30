// Helper to parse Google Drive URLs for View and Direct Download links[cite: 1]
function parseDriveLinks(url) {
  if (!url) return null;
  
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/id=([a-zA-Z0-9_-]+)/) ||
                url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    const fileId = match[1];
    return {
      viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
    };
  }

  return {
    viewUrl: url,
    downloadUrl: url
  };
}

// Smooth Number/Price Ticker Animation Helper[cite: 1]
function animateNumberRoll(element, start, end, prefix = '', duration = 600) {
  if (!element) return;
  const startTime = performance.now();

  function updateTicker(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeOutProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.floor(start + (end - start) * easeOutProgress);
    
    element.textContent = `${prefix}${currentVal.toLocaleString('en-IN')}`;
    
    if (progress < 1) {
      requestAnimationFrame(updateTicker);
    } else {
      element.textContent = `${prefix}${end.toLocaleString('en-IN')}`;
    }
  }
  requestAnimationFrame(updateTicker);
}

// ========================================================
// 3D PAPER CRUSH & TRASH BIN ANIMATION TRIGGER[cite: 1]
// ========================================================
async function triggerCrumpleDelete(btnElement, id, callbackFn) {
  const row = btnElement.closest('tr');
  const overlay = document.getElementById('dustbinOverlay');
  const modal = document.getElementById('dustbinModal');
  const lid = document.getElementById('binLid');
  const sparks = document.getElementById('binSparks');

  if (!row) {
    if (confirm('Delete this record?')) await callbackFn();
    return;
  }

  const rowRect = row.getBoundingClientRect();
  const targetX = (window.innerWidth / 2) - (rowRect.left + rowRect.width / 2);
  const targetY = (window.innerHeight / 2) - (rowRect.top + rowRect.height / 2);

  row.style.setProperty('--fly-x', `${targetX}px`);
  row.style.setProperty('--fly-y', `${targetY}px`);

  if (overlay && modal) {
    overlay.classList.remove('hidden');
    modal.classList.remove('bin-pop-out');
    modal.classList.add('bin-pop-in');
    
    if (lid) lid.classList.add('bin-lid-open');
  }

  row.classList.add('row-crushing');

  setTimeout(() => {
    if (sparks) sparks.classList.remove('opacity-0');
  }, 600);

  setTimeout(async () => {
    if (lid) lid.classList.remove('bin-lid-open');
    if (modal) modal.classList.add('bin-pop-out');

    try {
      await callbackFn();
    } catch (err) {
      console.error('Deletion error:', err);
    }

    setTimeout(() => {
      if (overlay) overlay.classList.add('hidden');
      if (sparks) sparks.classList.add('opacity-0');
      if (modal) modal.classList.remove('bin-pop-in', 'bin-pop-out');
    }, 400);
  }, 850);
}

// ========================================================
// DASHBOARD: RECENT ACTIVITY & REFRESH HANDLER
// ========================================================

// Fetch & Render Recent Activity on Dashboard (Properly Mapped & Excludes Personal Documents)
async function loadDashboardRecentActivity(targetElementId = 'recent-activity-table-body') {
  const container = document.getElementById(targetElementId);
  if (!container) return;

  container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-[#826e7e]">Loading recent activities...</td></tr>`;

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .neq('category', 'Personal Document') // Exclude personal documents
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error('Error fetching recent activity:', error);
    container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Failed to load recent activity.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-[#826e7e] font-light">No recent activities found.</td></tr>`;
    return;
  }

  container.innerHTML = data.map(item => {
    const links = parseDriveLinks(item.bill_url);
    const amountVal = item.purchase_amount ?? 0;
    const formattedAmount = Number(amountVal) > 0 ? `₹${Number(amountVal).toLocaleString('en-IN')}` : '—';
    const dateVal = item.purchase_date || '—';

    return `
      <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
        <td class="py-3.5 pr-3 font-bold text-[#8c788a]">${item.category || '—'}</td>
        <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_type || item.item_name || '—'}</td>
        <td class="py-3.5 pr-3 text-[#382c37] capitalize">${item.item_model || '—'}</td>
        <td class="py-3.5 pr-3 font-semibold text-[#382c37]">${formattedAmount}</td>
        <td class="py-3.5 pr-3 text-[#826e7e]">${dateVal}</td>
        <td class="py-3.5 pr-3">
          ${links ? `
            <div class="flex items-center gap-2">
              <a href="${links.viewUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-[#8c788a] hover:underline" title="View Document">
                <span class="material-icons-round text-xs mr-0.5">visibility</span> View
              </a>
              <span class="text-slate-300">|</span>
              <a href="${links.downloadUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:underline" title="Direct Download">
                <span class="material-icons-round text-xs mr-0.5">download</span> Download
              </a>
            </div>
          ` : '<span class="text-[#826e7e] text-[11px]">No Link</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

// Function triggered by the top-right refresh button
async function refreshDashboardData() {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('animate-spin');

  try {
    if (typeof loadDashboardRecentActivity === 'function') {
      await loadDashboardRecentActivity('recent-activity-table-body');
    }

    if (typeof fetchDashboardMetrics === 'function') {
      await fetchDashboardMetrics();
    }
  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
  } finally {
    if (icon) {
      setTimeout(() => icon.classList.remove('animate-spin'), 500);
    }
  }
}

// ========================================================
// CATEGORY MODULES
// ========================================================

// 1. Fetch & Render Category Assets Table (Gadgets / General)[cite: 1]
async function loadCategoryData(category, targetElementId) {
  const container = document.getElementById(targetElementId);
  if (!container) return;

  container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-[#826e7e]">Loading records...</td></tr>`;

  let query = supabaseClient.from('personal_assets').select('*');
  if (category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Failed to load data.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-[#826e7e] font-light">No records found. Use the form above to add an entry.</td></tr>`;
    return;
  }

  container.innerHTML = data.map(item => {
    const links = parseDriveLinks(item.bill_url);

    return `
      <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
        <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_type || item.item_name || '—'}</td>
        <td class="py-3.5 pr-3 text-[#382c37] capitalize">${item.item_model || '—'}</td>
        <td class="py-3.5 pr-3 text-[#826e7e]">${item.purchase_date || '—'}</td>
        <td class="py-3.5 pr-3 text-[#826e7e] max-w-xs truncate" title="${item.notes || ''}">${item.notes || '—'}</td>
        <td class="py-3.5 pr-3">
          ${links ? `
            <div class="flex items-center gap-2">
              <a href="${links.viewUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-[#8c788a] hover:underline" title="View Document">
                <span class="material-icons-round text-xs mr-0.5">visibility</span> View
              </a>
              <span class="text-slate-300">|</span>
              <a href="${links.downloadUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:underline" title="Direct Download">
                <span class="material-icons-round text-xs mr-0.5">download</span> Download
              </a>
            </div>
          ` : '<span class="text-[#826e7e] text-[11px]">No Link</span>'}
        </td>
        <td class="py-3.5 text-right">
          <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteAsset('${item.id}', '${category}', '${targetElementId}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer">
            <span class="material-icons-round text-base">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 2. Fetch & Populate Vehicles Data[cite: 1]
async function loadSpecificVehicleData(vehicleTypeName) {
  const container = document.getElementById('vehicles-table-body');
  
  const priceEl = document.getElementById('displayPrice');
  const modelTagEl = document.getElementById('displayModelTag');
  const totalEntriesEl = document.getElementById('displayTotalEntries');
  const boughtDateEl = document.getElementById('displayBoughtDate');
  const totalSpentEl = document.getElementById('displayTotalSpent');
  const categoryBadgeEl = document.getElementById('displayCategoryBadge');
  const driveDocActionsEl = document.getElementById('displayDriveDocActions');

  if (container) {
    container.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-[#826e7e]">Loading ${vehicleTypeName} records...</td></tr>`;
  }

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Vehicle')
    .eq('item_type', vehicleTypeName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vehicle data:', error);
    if (container) container.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500">Failed to load records.</td></tr>`;
    return;
  }

  if (data && data.length > 0) {
    const latest = data[0];
    let totalInvested = 0;
    data.forEach(item => {
      if (item.purchase_amount) totalInvested += Number(item.purchase_amount);
    });

    const latestAmount = latest.purchase_amount ? Number(latest.purchase_amount) : 0;
    if (priceEl) animateNumberRoll(priceEl, 0, latestAmount, '₹');
    if (modelTagEl) modelTagEl.textContent = latest.item_model ? `Latest: ${latest.item_model}` : 'Latest Activity';
    if (totalEntriesEl) totalEntriesEl.textContent = `${data.length} Available`;
    if (boughtDateEl) boughtDateEl.textContent = latest.purchase_date || '—';
    if (totalSpentEl) animateNumberRoll(totalSpentEl, 0, totalInvested, '₹');
    if (categoryBadgeEl) categoryBadgeEl.textContent = latest.item_model || '—';

    if (driveDocActionsEl) {
      const links = parseDriveLinks(latest.bill_url);
      if (links) {
        driveDocActionsEl.innerHTML = `
          <div class="flex items-center gap-2">
            <a href="${links.viewUrl}" target="_blank" class="text-xs font-bold text-violet-700 hover:underline inline-flex items-center">
              <span class="material-icons-round text-xs mr-0.5">visibility</span> View
            </a>
            <span class="text-slate-300">|</span>
            <a href="${links.downloadUrl}" target="_blank" class="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center">
              <span class="material-icons-round text-xs mr-0.5">download</span> Download
            </a>
          </div>
        `;
      } else {
        driveDocActionsEl.innerHTML = `<span class="text-xs text-slate-400">No Document</span>`;
      }
    }
  } else {
    if (priceEl) priceEl.textContent = '₹0';
    if (modelTagEl) modelTagEl.textContent = 'No records';
    if (totalEntriesEl) totalEntriesEl.textContent = '0 Available';
    if (boughtDateEl) boughtDateEl.textContent = '—';
    if (totalSpentEl) totalSpentEl.textContent = '₹0';
    if (categoryBadgeEl) categoryBadgeEl.textContent = '—';
    if (driveDocActionsEl) driveDocActionsEl.innerHTML = `<span class="text-xs text-slate-400">No Document</span>`;
  }

  if (!data || data.length === 0) {
    if (container) container.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#826e7e] font-light">No records saved for ${vehicleTypeName} yet.</td></tr>`;
    return;
  }

  if (container) {
    container.innerHTML = data.map(item => {
      const links = parseDriveLinks(item.bill_url);
      const formattedAmount = item.purchase_amount ? `₹${Number(item.purchase_amount).toLocaleString('en-IN')}` : '—';

      return `
        <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
          <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_model || '—'}</td>
          <td class="py-3.5 pr-3 text-[#826e7e]">${item.purchase_date || '—'}</td>
          <td class="py-3.5 pr-3 font-semibold text-[#8c788a]">${formattedAmount}</td>
          <td class="py-3.5 pr-3">
            ${links ? `
              <div class="flex items-center gap-2">
                <a href="${links.viewUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-[#8c788a] hover:underline" title="View Document">
                  <span class="material-icons-round text-xs mr-0.5">visibility</span> View
                </a>
                <span class="text-slate-300">|</span>
                <a href="${links.downloadUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:underline" title="Direct Download">
                  <span class="material-icons-round text-xs mr-0.5">download</span> Download
                </a>
              </div>
            ` : '<span class="text-[#826e7e] text-[11px]">No Link</span>'}
          </td>
          <td class="py-3.5 text-right">
            <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteSpecificVehicleAsset('${item.id}', '${item.item_type}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer">
              <span class="material-icons-round text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// 3. Fetch & Populate Appliance Data (Exact 6-Column Alignment)
async function loadSpecificApplianceData(applianceTypeName) {
  const container = document.getElementById('appliances-table-body');
  const totalSpentEl = document.getElementById('displayTotalSpent');

  if (container) {
    container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-[#826e7e]">Loading ${applianceTypeName} records...</td></tr>`;
  }

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Appliance')
    .eq('item_type', applianceTypeName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching appliance data:', error);
    if (container) container.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500">Failed to load records.</td></tr>`;
    return;
  }

  if (data && data.length > 0) {
    let totalInvested = 0;
    data.forEach(item => {
      if (item.purchase_amount) totalInvested += Number(item.purchase_amount);
    });

    if (totalSpentEl) animateNumberRoll(totalSpentEl, 0, totalInvested, '₹');
  } else {
    if (totalSpentEl) totalSpentEl.textContent = '₹0';
  }

  if (!data || data.length === 0) {
    if (container) container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-[#826e7e] font-light">No records saved for ${applianceTypeName} yet.</td></tr>`;
    return;
  }

  if (container) {
    container.innerHTML = data.map(item => {
      const links = parseDriveLinks(item.bill_url);
      const formattedAmount = item.purchase_amount ? `₹${Number(item.purchase_amount).toLocaleString('en-IN')}` : '—';
      const whereBought = item.notes || item.purchase_place || '—';

      return `
        <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
          <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_model || '—'}</td>
          <td class="py-3.5 pr-3 font-semibold text-[#8c788a]">${formattedAmount}</td>
          <td class="py-3.5 pr-3 text-[#382c37]">${whereBought}</td>
          <td class="py-3.5 pr-3 text-[#826e7e]">${item.purchase_date || '—'}</td>
          <td class="py-3.5 pr-3">
            ${links ? `
              <div class="flex items-center gap-2">
                <a href="${links.viewUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-[#8c788a] hover:underline" title="View Document">
                  <span class="material-icons-round text-xs mr-0.5">visibility</span> View
                </a>
                <span class="text-slate-300">|</span>
                <a href="${links.downloadUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:underline" title="Direct Download">
                  <span class="material-icons-round text-xs mr-0.5">download</span> Download
                </a>
              </div>
            ` : '<span class="text-[#826e7e] text-[11px]">No Link</span>'}
          </td>
          <td class="py-3.5 text-right">
            <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteSpecificApplianceAsset('${item.id}', '${item.item_type}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer">
              <span class="material-icons-round text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// 4. Fetch & Populate Personal Documents[cite: 1]
async function loadPersonalDocumentsData() {
  const container = document.getElementById('documents-table-body');
  const countEl = document.getElementById('docTotalCount');
  if (!container) return;

  container.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-[#826e7e]">Loading documents...</td></tr>`;

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Personal Document')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    container.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-500">Failed to load documents.</td></tr>`;
    return;
  }

  if (countEl) countEl.textContent = `${data ? data.length : 0} Documents`;

  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#826e7e] font-light">No documents stored yet. Use the form above to add your first record.</td></tr>`;
    return;
  }

  container.innerHTML = data.map(item => {
    const links = parseDriveLinks(item.bill_url);

    return `
      <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
        <td class="py-3.5 pr-3 font-semibold text-[#382c37] flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#e4d7e0] text-[#8c788a] flex items-center justify-center">
            <span class="material-icons-round text-base">description</span>
          </div>
          <span>${item.item_type || 'Document'}</span>
        </td>
        <td class="py-3.5 pr-3 text-[#382c37] font-medium">${item.item_model || '—'}</td>
        <td class="py-3.5 pr-3 text-[#826e7e]">${item.purchase_date || '—'}</td>
        <td class="py-3.5 pr-3">
          ${links ? `
            <div class="flex items-center gap-2">
              <a href="${links.viewUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-[#8c788a] hover:underline" title="View Document">
                <span class="material-icons-round text-xs mr-0.5">visibility</span> View
              </a>
              <span class="text-slate-300">|</span>
              <a href="${links.downloadUrl}" target="_blank" class="inline-flex items-center text-[11px] font-bold text-emerald-700 hover:underline" title="Direct Download">
                <span class="material-icons-round text-xs mr-0.5">download</span> Download
              </a>
            </div>
          ` : '<span class="text-[#826e7e] text-[11px]">No Link</span>'}
        </td>
        <td class="py-3.5 text-right">
          <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deletePersonalDocument('${item.id}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer">
            <span class="material-icons-round text-base">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Submit Asset Form (Universal for All Modules)[cite: 1]
async function submitAssetForm(event, category, targetTableId, currentSpecificType = null) {
  event.preventDefault();
  const form = event.target;
  const statusEl = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');

  const item_type = form.querySelector('[name="item_type"]')?.value || 'Document';
  const item_model = form.querySelector('[name="item_model"]')?.value || '';
  const purchase_date = form.querySelector('[name="purchase_date"]')?.value || null;
  const purchase_amount = form.querySelector('[name="purchase_amount"]')?.value ? parseFloat(form.querySelector('[name="purchase_amount"]').value) : null;
  const notes = form.querySelector('[name="where_bought"]')?.value?.trim() || form.querySelector('[name="notes"]')?.value?.trim() || null;
  const bill_url = form.querySelector('[name="bill_url"]')?.value?.trim() || null;

  if (statusEl) {
    statusEl.className = 'text-xs font-semibold text-[#8c788a] block mt-2';
    statusEl.textContent = 'Saving record...';
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    const { error } = await supabaseClient
      .from('personal_assets')
      .insert([{
        category: category,
        item_name: `${item_type} - ${item_model}`,
        item_type: item_type,
        item_model: item_model,
        purchase_amount: purchase_amount,
        notes: notes,
        purchase_date: purchase_date,
        bill_url: bill_url
      }]);

    if (error) throw error;

    if (statusEl) {
      statusEl.className = 'text-xs font-semibold text-emerald-600 block mt-2';
      statusEl.textContent = 'Saved successfully!';
    }
    form.reset();

    if (category === 'Vehicle' && currentSpecificType) {
      loadSpecificVehicleData(currentSpecificType);
    } else if (category === 'Appliance' && currentSpecificType) {
      loadSpecificApplianceData(currentSpecificType);
    } else if (category === 'Personal Document') {
      loadPersonalDocumentsData();
    } else {
      loadCategoryData(category, targetTableId);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'text-xs font-semibold text-red-600 block mt-2';
      statusEl.textContent = 'Error: ' + err.message;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// 6. Delete Handlers[cite: 1]
async function deleteSpecificVehicleAsset(id, vehicleTypeName) {
  if (!id || id === 'undefined' || id === 'null') return;

  const { error } = await supabaseClient
    .from('personal_assets')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error deleting vehicle asset: ' + error.message);
    return;
  }

  loadSpecificVehicleData(vehicleTypeName);
}

async function deleteSpecificApplianceAsset(id, applianceTypeName) {
  if (!id || id === 'undefined' || id === 'null') return;

  const { error } = await supabaseClient
    .from('personal_assets')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error deleting appliance asset: ' + error.message);
    return;
  }

  if (typeof fetchAllApplianceStats === 'function') {
    fetchAllApplianceStats();
  } else {
    loadSpecificApplianceData(applianceTypeName);
  }
}

async function deletePersonalDocument(id) {
  if (!id || id === 'undefined' || id === 'null') return;

  const { error } = await supabaseClient
    .from('personal_assets')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error deleting document: ' + error.message);
    return;
  }

  loadPersonalDocumentsData();
}

async function deleteAsset(id, category, targetElementId) {
  if (!id || id === 'undefined' || id === 'null') return;

  const { error } = await supabaseClient
    .from('personal_assets')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error deleting asset: ' + error.message);
    return;
  }

  loadCategoryData(category, targetElementId);
}