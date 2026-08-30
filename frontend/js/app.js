// Helper to parse Google Drive URLs for View and Direct Download links[cite: 8]
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

// Smooth Number/Price Ticker Animation Helper[cite: 8]
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

// 3D PAPER CRUSH & TRASH BIN ANIMATION TRIGGER[cite: 8]
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
// GLOBAL EDIT MODAL COMPONENT (All Tabs)
// ========================================================

function ensureEditModalExists() {
  if (document.getElementById('globalEditModal')) return;

  const modalHtml = `
    <div id="globalEditModal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-white">
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-base font-black text-[#382c37] flex items-center gap-1.5">
            <span class="material-icons-round text-lg text-[#8c788a]">edit_note</span> Edit Record
          </h3>
          <button type="button" onclick="closeEditModal()" class="text-slate-400 hover:text-slate-700 p-1">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <form id="globalEditForm" onsubmit="handleGlobalEditSubmit(event)" class="space-y-3.5 text-xs">
          <input type="hidden" id="editRecordId">
          <input type="hidden" id="editCategory">
          <input type="hidden" id="editContextType">

          <div>
            <label class="block font-semibold text-[#826e7e] mb-1">Item / Type Name</label>
            <input type="text" id="editItemType" required class="soft-input w-full font-medium">
          </div>

          <div>
            <label class="block font-semibold text-[#826e7e] mb-1">Category / Model Name</label>
            <input type="text" id="editItemModel" required class="soft-input w-full font-medium">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div id="editAmountWrapper">
              <label class="block font-semibold text-[#826e7e] mb-1">Amount (₹)</label>
              <input type="number" step="0.01" id="editPurchaseAmount" class="soft-input w-full font-medium">
            </div>
            <div>
              <label class="block font-semibold text-[#826e7e] mb-1">Recorded Date</label>
              <input type="date" id="editPurchaseDate" class="soft-input w-full font-medium">
            </div>
          </div>

          <div id="editDueDateWrapper">
            <label class="block font-semibold text-[#826e7e] mb-1">Next Due Date (Service / AMC / Expiry)</label>
            <input type="date" id="editNextDueDate" class="soft-input w-full font-medium">
          </div>

          <div id="editRemarksWrapper">
            <label class="block font-semibold text-[#826e7e] mb-1">Where Bought / Remarks</label>
            <input type="text" id="editNotes" placeholder="Where bought or additional details" class="soft-input w-full font-medium">
          </div>

          <div>
            <label class="block font-semibold text-[#826e7e] mb-1">Document Link (Google Drive)</label>
            <input type="url" id="editBillUrl" placeholder="https://drive.google.com/file/d/..." class="soft-input w-full text-xs">
          </div>

          <div class="flex items-center justify-between pt-3">
            <p id="editFormStatus" class="text-xs font-semibold text-[#8c788a]"></p>
            <div class="flex gap-2">
              <button type="button" onclick="closeEditModal()" class="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition">
                Cancel
              </button>
              <button type="submit" id="editSubmitBtn" class="px-5 py-2.5 rounded-xl bg-[#8c788a] text-white font-extrabold hover:bg-[#7a6778] transition shadow-md">
                Update Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function openEditModal(recordId, contextType = null) {
  ensureEditModalExists();
  const modal = document.getElementById('globalEditModal');
  const statusEl = document.getElementById('editFormStatus');
  if (statusEl) statusEl.textContent = 'Fetching record...';
  if (modal) modal.classList.remove('hidden');

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error || !data) {
    alert('Failed to load asset details: ' + (error?.message || 'Record not found'));
    closeEditModal();
    return;
  }

  if (statusEl) statusEl.textContent = '';
  document.getElementById('editRecordId').value = data.id;
  document.getElementById('editCategory').value = data.category || '';
  document.getElementById('editContextType').value = contextType || data.item_type || '';
  document.getElementById('editItemType').value = data.item_type || '';
  document.getElementById('editItemModel').value = data.item_model || '';
  document.getElementById('editPurchaseAmount').value = data.purchase_amount ?? '';
  document.getElementById('editPurchaseDate').value = data.purchase_date || '';
  document.getElementById('editNextDueDate').value = data.next_due_date || '';
  document.getElementById('editNotes').value = data.notes || '';
  document.getElementById('editBillUrl').value = data.bill_url || '';

  const isDoc = data.category === 'Personal Document';
  document.getElementById('editAmountWrapper').style.display = isDoc ? 'none' : 'block';
  document.getElementById('editDueDateWrapper').style.display = isDoc ? 'none' : 'block';
}

function closeEditModal() {
  const modal = document.getElementById('globalEditModal');
  if (modal) modal.classList.add('hidden');
}

async function handleGlobalEditSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('editRecordId').value;
  const category = document.getElementById('editCategory').value;
  const contextType = document.getElementById('editContextType').value;
  const statusEl = document.getElementById('editFormStatus');
  const submitBtn = document.getElementById('editSubmitBtn');

  const item_type = document.getElementById('editItemType').value.trim();
  const item_model = document.getElementById('editItemModel').value.trim();
  const purchase_amount_val = document.getElementById('editPurchaseAmount').value;
  const purchase_amount = purchase_amount_val !== '' ? parseFloat(purchase_amount_val) : null;
  const purchase_date = document.getElementById('editPurchaseDate').value || null;
  const next_due_date = document.getElementById('editNextDueDate').value || null;
  const notes = document.getElementById('editNotes').value.trim() || null;
  const bill_url = document.getElementById('editBillUrl').value.trim() || null;

  if (statusEl) {
    statusEl.className = 'text-xs font-semibold text-[#8c788a]';
    statusEl.textContent = 'Updating record...';
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    const payload = {
      item_name: `${item_type} - ${item_model}`,
      item_type: item_type,
      item_model: item_model,
      purchase_amount: purchase_amount,
      purchase_date: purchase_date,
      notes: notes,
      bill_url: bill_url
    };

    if (next_due_date !== undefined) {
      payload.next_due_date = next_due_date;
    }

    const { error } = await supabaseClient
      .from('personal_assets')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    if (statusEl) {
      statusEl.className = 'text-xs font-semibold text-emerald-600';
      statusEl.textContent = 'Updated successfully!';
    }

    setTimeout(() => {
      closeEditModal();
      if (category === 'Vehicle') {
        loadSpecificVehicleData(contextType || item_type);
      } else if (category === 'Appliance') {
        if (typeof fetchAllApplianceStats === 'function') fetchAllApplianceStats();
        else loadSpecificApplianceData(contextType || item_type);
      } else if (category === 'Personal Document') {
        if (typeof loadMemberDocuments === 'function') loadMemberDocuments(contextType || item_type);
        else if (typeof loadPersonalDocumentsData === 'function') loadPersonalDocumentsData();
      } else if (category === 'Gadget') {
        if (typeof loadGadgetsData === 'function') loadGadgetsData();
      } else {
        if (typeof fetchDashboardMetrics === 'function') fetchDashboardMetrics();
        if (typeof loadDashboardRecentActivity === 'function') loadDashboardRecentActivity();
      }
    }, 400);

  } catch (err) {
    if (statusEl) {
      statusEl.className = 'text-xs font-semibold text-red-600';
      statusEl.textContent = 'Error: ' + err.message;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ========================================================
// DASHBOARD: METRICS, ACTIVE ATTENTION (2M Due / 3M Overdue)
// ========================================================

async function fetchDashboardMetrics() {
  if (typeof supabaseClient === 'undefined') return;

  try {
    const { data, error } = await supabaseClient
      .from('personal_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    let totalValue = 0;
    let vehiclesTotal = 0;
    let gadgetsTotal = 0;
    let appliancesTotal = 0;

    let gadgetsCount = 0;
    let appliancesCount = 0;
    let docsCount = 0;

    const attentionList = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.forEach(item => {
      const amt = Number(item.purchase_amount || 0);
      if (amt > 0) totalValue += amt;

      if (item.category === 'Vehicle') {
        vehiclesTotal += amt;
      } else if (item.category === 'Gadget' || item.category === 'Gadgets') {
        gadgetsTotal += amt;
        gadgetsCount++;
      } else if (item.category === 'Appliance') {
        appliancesTotal += amt;
        appliancesCount++;
      } else if (item.category === 'Personal Document') {
        docsCount++;
      }

      // Check 1: Next Due Date (Within 2 months / 60 days ahead, and at most 3 months / 90 days overdue)
      if (item.next_due_date) {
        const dueDate = new Date(item.next_due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 60 && diffDays >= -90) {
          attentionList.push({
            id: item.id,
            category: item.category,
            name: `${item.item_type || 'Asset'} (${item.item_model || 'Service'})`,
            type: diffDays < 0 ? `Overdue by ${Math.abs(diffDays)}d` : (diffDays === 0 ? 'Due Today!' : `Due in ${diffDays}d`),
            date: item.next_due_date,
            isUrgent: diffDays <= 7
          });
        }
      }

      // Check 2: Purchase Anniversary Nearing (Within 30 Days)
      if (item.purchase_date) {
        const pDate = new Date(item.purchase_date);
        const thisYearAnniv = new Date(today.getFullYear(), pDate.getMonth(), pDate.getDate());
        let annivDiff = Math.ceil((thisYearAnniv - today) / (1000 * 60 * 60 * 24));
        
        if (annivDiff < 0) {
          const nextYearAnniv = new Date(today.getFullYear() + 1, pDate.getMonth(), pDate.getDate());
          annivDiff = Math.ceil((nextYearAnniv - today) / (1000 * 60 * 60 * 24));
        }

        if (annivDiff <= 30 && annivDiff >= 0) {
          attentionList.push({
            id: item.id,
            category: item.category,
            name: `${item.item_type || 'Asset'} - ${item.item_model || ''}`,
            type: annivDiff === 0 ? 'Anniversary Today!' : `Anniversary in ${annivDiff}d`,
            date: item.purchase_date,
            isUrgent: false
          });
        }
      }
    });

    // Update Summary Stats
    const statTotalValue = document.getElementById('statTotalValue');
    const statGadgetsCount = document.getElementById('statGadgetsCount');
    const statGadgetsWorth = document.getElementById('statGadgetsWorth');
    const statAppliancesCount = document.getElementById('statAppliancesCount');
    const statAppliancesWorth = document.getElementById('statAppliancesWorth');
    const statDocumentsCount = document.getElementById('statDocumentsCount');

    if (statTotalValue) animateNumberRoll(statTotalValue, 0, totalValue, '₹');
    if (statGadgetsCount) statGadgetsCount.textContent = `${gadgetsCount} Units`;
    if (statGadgetsWorth) animateNumberRoll(statGadgetsWorth, 0, gadgetsTotal, 'Worth ₹');
    if (statAppliancesCount) statAppliancesCount.textContent = `${appliancesCount} Units`;
    if (statAppliancesWorth) animateNumberRoll(statAppliancesWorth, 0, appliancesTotal, 'Worth ₹');
    if (statDocumentsCount) statDocumentsCount.textContent = `${docsCount} Files`;

    // Render Active Attention List
    const milestoneBadge = document.getElementById('milestoneBadge');
    const attentionContainer = document.getElementById('attentionStatusContainer');

    if (milestoneBadge) {
      milestoneBadge.textContent = `${attentionList.length} Milestones`;
    }

    if (attentionContainer) {
      if (attentionList.length === 0) {
        attentionContainer.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <span class="material-icons-round text-base text-emerald-600">check_circle</span>
            <span>All warranties, services, and anniversaries in order!</span>
          </div>
        `;
      } else {
        attentionContainer.innerHTML = `
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            ${attentionList.map(a => `
              <div class="p-2.5 rounded-xl border ${a.isUrgent ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'} flex justify-between items-center text-xs">
                <div>
                  <div class="font-bold truncate max-w-[170px]">${a.name}</div>
                  <div class="text-[10px] text-slate-500">${a.category} • ${a.date}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-extrabold text-[11px] px-2 py-0.5 rounded-lg ${a.isUrgent ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'} whitespace-nowrap">
                    ${a.type}
                  </span>
                  <button onclick="openEditModal('${a.id}')" title="Edit" class="text-slate-400 hover:text-slate-700 p-0.5">
                    <span class="material-icons-round text-sm">edit</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Chart Render / Update
    const ctx = document.getElementById('assetDistributionChart');
    if (ctx) {
      if (window.dashboardChartInstance) window.dashboardChartInstance.destroy();
      window.dashboardChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Vehicles', 'Gadgets', 'Appliances'],
          datasets: [{
            data: [vehiclesTotal, gadgetsTotal, appliancesTotal],
            backgroundColor: ['#8c788a', '#38bdf8', '#f59e0b'],
            borderRadius: 10,
            barThickness: 45
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(216, 200, 211, 0.25)' },
              ticks: {
                callback: (value) => '₹' + value.toLocaleString('en-IN'),
                font: { size: 10 }
              }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 11, weight: '600' } }
            }
          }
        }
      });
    }

  } catch (err) {
    console.error('Error computing dashboard metrics:', err);
  }
}

// 5 Records Max for Recent Activity
async function loadDashboardRecentActivity(targetElementId = 'recent-activity-table-body') {
  const container = document.getElementById(targetElementId);
  if (!container) return;

  container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-[#826e7e]">Loading recent activities...</td></tr>`;

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .neq('category', 'Personal Document')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load recent activity.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-[#826e7e] font-light">No recent activities found.</td></tr>`;
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
        <td class="py-3.5 text-right">
          <button onclick="openEditModal('${item.id}')" class="text-[#826e7e] hover:text-[#382c37] transition p-1 cursor-pointer" title="Edit Record">
            <span class="material-icons-round text-base">edit</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function refreshDashboardData() {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('animate-spin');

  try {
    await Promise.all([
      loadDashboardRecentActivity('recent-activity-table-body'),
      fetchDashboardMetrics()
    ]);
  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 500);
  }
}

// ========================================================
// VEHICLES MODULE
// ========================================================

async function loadSpecificVehicleData(vehicleTypeName) {
  const container = document.getElementById('vehicles-table-body');
  const priceEl = document.getElementById('displayPrice');
  const totalEntriesEl = document.getElementById('displayTotalEntries');
  const boughtDateEl = document.getElementById('displayBoughtDate');
  const totalSpentEl = document.getElementById('displayTotalSpent');

  if (container) {
    container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-[#826e7e]">Loading ${vehicleTypeName} records...</td></tr>`;
  }

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Vehicle')
    .eq('item_type', vehicleTypeName)
    .order('purchase_date', { ascending: false, nullsFirst: false });

  if (error) {
    if (container) container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load records.</td></tr>`;
    return;
  }

  if (data && data.length > 0) {
    let totalInvested = 0;
    data.forEach(item => {
      if (item.purchase_amount) totalInvested += Number(item.purchase_amount);
    });

    const purchaseRecord = data.slice().find(item => 
      item.item_model && item.item_model.toLowerCase() === 'purchased'
    ) || data[data.length - 1];

    const initialAmount = purchaseRecord?.purchase_amount ? Number(purchaseRecord.purchase_amount) : 0;
    const initialDate = purchaseRecord?.purchase_date || '—';

    if (priceEl) animateNumberRoll(priceEl, 0, initialAmount, '₹');
    if (boughtDateEl) boughtDateEl.textContent = initialDate;
    if (totalEntriesEl) totalEntriesEl.textContent = `${data.length} Units`;
    if (totalSpentEl) animateNumberRoll(totalSpentEl, 0, totalInvested, '₹');
  } else {
    if (priceEl) priceEl.textContent = '₹0';
    if (boughtDateEl) boughtDateEl.textContent = '—';
    if (totalEntriesEl) totalEntriesEl.textContent = '0 Units';
    if (totalSpentEl) totalSpentEl.textContent = '₹0';
  }

  if (!data || data.length === 0) {
    if (container) container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-[#826e7e] font-light">No records saved for ${vehicleTypeName} yet.</td></tr>`;
    return;
  }

  if (container) {
    container.innerHTML = data.map(item => {
      const links = parseDriveLinks(item.bill_url);
      const formattedAmount = item.purchase_amount ? `₹${Number(item.purchase_amount).toLocaleString('en-IN')}` : '—';

      return `
        <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
          <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_model || '—'}</td>
          <td class="py-3.5 pr-3 text-[#826e7e] font-medium">${item.purchase_date || '—'}</td>
          <td class="py-3.5 pr-3 font-bold text-[#8c788a]">${formattedAmount}</td>
          <td class="py-3.5 pr-3 text-amber-700 font-semibold">${item.next_due_date || '—'}</td>
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
            <div class="flex items-center justify-end gap-1">
              <button onclick="openEditModal('${item.id}', '${vehicleTypeName}')" class="text-[#826e7e] hover:text-[#382c37] transition p-1 cursor-pointer" title="Edit Record">
                <span class="material-icons-round text-base">edit</span>
              </button>
              <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteSpecificVehicleAsset('${item.id}', '${item.item_type}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer" title="Delete Record">
                <span class="material-icons-round text-base">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ========================================================
// APPLIANCES MODULE
// ========================================================

async function loadSpecificApplianceData(applianceTypeName) {
  const container = document.getElementById('appliances-table-body');
  const totalSpentEl = document.getElementById('displayTotalSpent');

  if (container) {
    container.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-[#826e7e]">Loading ${applianceTypeName} records...</td></tr>`;
  }

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Appliance')
    .eq('item_type', applianceTypeName)
    .order('purchase_date', { ascending: false, nullsFirst: false });

  if (error) {
    if (container) container.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-red-500">Failed to load records.</td></tr>`;
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
    if (container) container.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-[#826e7e] font-light">No records saved for ${applianceTypeName} yet.</td></tr>`;
    return;
  }

  if (container) {
    container.innerHTML = data.map(item => {
      const links = parseDriveLinks(item.bill_url);
      const formattedAmount = item.purchase_amount ? `₹${Number(item.purchase_amount).toLocaleString('en-IN')}` : '—';
      
      let whereBought = '—';
      let remarks = '—';
      if (item.notes) {
        if (item.notes.includes(' | ')) {
          const parts = item.notes.split(' | ');
          whereBought = parts[0] || '—';
          remarks = parts.slice(1).join(' | ') || '—';
        } else {
          whereBought = item.notes;
        }
      }

      return `
        <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
          <td class="py-3.5 pr-3 font-semibold text-[#382c37] capitalize">${item.item_model || '—'}</td>
          <td class="py-3.5 pr-3 font-bold text-[#8c788a]">${formattedAmount}</td>
          <td class="py-3.5 pr-3 text-[#382c37]">${whereBought}</td>
          <td class="py-3.5 pr-3 text-[#826e7e]">${item.purchase_date || '—'}</td>
          <td class="py-3.5 pr-3 text-amber-700 font-semibold">${item.next_due_date || '—'}</td>
          <td class="py-3.5 pr-3 text-[#826e7e] max-w-xs truncate" title="${remarks}">${remarks}</td>
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
            <div class="flex items-center justify-end gap-1">
              <button onclick="openEditModal('${item.id}', '${applianceTypeName}')" class="text-[#826e7e] hover:text-[#382c37] transition p-1 cursor-pointer" title="Edit Record">
                <span class="material-icons-round text-base">edit</span>
              </button>
              <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteSpecificApplianceAsset('${item.id}', '${item.item_type}'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer" title="Delete Record">
                <span class="material-icons-round text-base">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ========================================================
// GADGETS & DOCUMENTS MODULES
// ========================================================

async function loadGadgetsData() {
  const container = document.getElementById('gadgets-table-body');
  const countEl = document.getElementById('gadgetTotalCount');
  const spentEl = document.getElementById('gadgetTotalSpent');
  if (!container) return;

  container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-[#826e7e]">Loading gadgets...</td></tr>`;

  const { data, error } = await supabaseClient
    .from('personal_assets')
    .select('*')
    .eq('category', 'Gadget')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-500">Failed to load gadgets.</td></tr>`;
    return;
  }

  let totalCost = 0;
  if (data) {
    data.forEach(item => {
      if (item.purchase_amount) totalCost += Number(item.purchase_amount);
    });
  }

  if (countEl) countEl.textContent = `${data ? data.length : 0} Units`;
  if (spentEl) spentEl.textContent = `₹${totalCost.toLocaleString('en-IN')}`;

  if (!data || data.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-[#826e7e] font-light">No gadgets recorded yet. Use the form above to add an entry.</td></tr>`;
    return;
  }

  container.innerHTML = data.map(item => {
    const links = parseDriveLinks(item.bill_url);
    const formattedAmount = item.purchase_amount ? `₹${Number(item.purchase_amount).toLocaleString('en-IN')}` : '—';
    const storeBought = item.notes || '—';

    return `
      <tr class="border-b border-[#d8c8d3]/40 hover:bg-white/40 transition text-xs">
        <td class="py-3.5 pr-3 font-semibold text-[#382c37] flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#e4d7e0] text-[#8c788a] flex items-center justify-center">
            <span class="material-icons-round text-base">devices</span>
          </div>
          <span>${item.item_type || 'Gadget'}</span>
        </td>
        <td class="py-3.5 pr-3 text-[#382c37] font-medium">${item.item_model || '—'}</td>
        <td class="py-3.5 pr-3 font-bold text-[#8c788a]">${formattedAmount}</td>
        <td class="py-3.5 pr-3 text-[#382c37]">
          <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-700">
            ${storeBought}
          </span>
        </td>
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
          <div class="flex items-center justify-end gap-1">
            <button onclick="openEditModal('${item.id}', 'Gadget')" class="text-[#826e7e] hover:text-[#382c37] transition p-1 cursor-pointer" title="Edit Record">
              <span class="material-icons-round text-base">edit</span>
            </button>
            <button onclick="triggerCrumpleDelete(this, '${item.id}', () => deleteAsset('${item.id}', 'Gadget', 'gadgets-table-body'))" class="text-[#826e7e] hover:text-red-500 transition p-1 cursor-pointer" title="Delete Record">
              <span class="material-icons-round text-base">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ========================================================
// UNIVERSAL FORM SUBMISSION & DELETION HANDLERS
// ========================================================

async function submitAssetForm(event, category, targetTableId, currentSpecificType = null) {
  event.preventDefault();
  const form = event.target;
  const statusEl = document.getElementById('formStatus');
  const submitBtn = form.querySelector('button[type="submit"]');

  const item_type = form.querySelector('[name="item_type"]')?.value || 'Asset';
  const item_model = form.querySelector('[name="item_model"]')?.value || '';
  const purchase_date = form.querySelector('[name="purchase_date"]')?.value || null;
  const next_due_date = form.querySelector('[name="next_due_date"]')?.value || null;
  const purchase_amount = form.querySelector('[name="purchase_amount"]')?.value ? parseFloat(form.querySelector('[name="purchase_amount"]').value) : null;
  
  const where_bought = form.querySelector('[name="where_bought"]')?.value?.trim();
  const remarks = form.querySelector('[name="remarks"]')?.value?.trim() || form.querySelector('[name="notes"]')?.value?.trim();
  const combinedNotes = [where_bought, remarks].filter(Boolean).join(' | ') || null;

  const bill_url = form.querySelector('[name="bill_url"]')?.value?.trim() || null;

  if (statusEl) {
    statusEl.className = 'text-xs font-semibold text-[#8c788a] block mt-2';
    statusEl.textContent = 'Saving record...';
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    const payload = {
      category: category,
      item_name: `${item_type} - ${item_model}`,
      item_type: item_type,
      item_model: item_model,
      purchase_amount: purchase_amount,
      purchase_date: purchase_date,
      notes: combinedNotes,
      bill_url: bill_url
    };

    if (next_due_date) {
      payload.next_due_date = next_due_date;
    }

    const { error } = await supabaseClient
      .from('personal_assets')
      .insert([payload]);

    if (error) throw error;

    if (statusEl) {
      statusEl.className = 'text-xs font-semibold text-emerald-600 block mt-2';
      statusEl.textContent = 'Saved successfully!';
    }
    form.reset();

    if (category === 'Vehicle' && currentSpecificType) {
      loadSpecificVehicleData(currentSpecificType);
    } else if (category === 'Appliance' && currentSpecificType) {
      if (typeof fetchAllApplianceStats === 'function') fetchAllApplianceStats();
      else loadSpecificApplianceData(currentSpecificType);
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

async function deleteSpecificVehicleAsset(id, vehicleTypeName) {
  if (!id || id === 'undefined' || id === 'null') return;
  const { error } = await supabaseClient.from('personal_assets').delete().eq('id', id);
  if (error) { alert('Error deleting: ' + error.message); return; }
  loadSpecificVehicleData(vehicleTypeName);
}

async function deleteSpecificApplianceAsset(id, applianceTypeName) {
  if (!id || id === 'undefined' || id === 'null') return;
  const { error } = await supabaseClient.from('personal_assets').delete().eq('id', id);
  if (error) { alert('Error deleting: ' + error.message); return; }
  if (typeof fetchAllApplianceStats === 'function') fetchAllApplianceStats();
  else loadSpecificApplianceData(applianceTypeName);
}

async function deleteAsset(id, category, targetElementId) {
  if (!id || id === 'undefined' || id === 'null') return;
  const { error } = await supabaseClient.from('personal_assets').delete().eq('id', id);
  if (error) { alert('Error deleting asset: ' + error.message); return; }
  if (typeof loadGadgetsData === 'function') loadGadgetsData();
}