'use strict';

// Pricing configuration
const PRICING = {
  repairs: {
    wheel:  { name: '360° Spinner Wheel Replacement', short: 'Spinner Wheel', base: 799, bags: ['hardshell', 'soft_spinner'] },
    handle: { name: 'Telescopic Handle Repair', short: 'Telescopic Handle', base: 649, bags: ['hardshell', 'soft_spinner', 'backpack', 'handbag'] },
    zipper: { name: 'Main Zipper Replacement', short: 'Main Zipper', base: 499, bags: ['hardshell', 'soft_spinner', 'backpack', 'handbag'] },
    lock:   { name: 'TSA Combination Lock Reset', short: 'TSA Lock Reset', base: 299, bags: ['hardshell', 'soft_spinner'] }
  },
  bags: {
    hardshell:    { name: 'Hardshell Trolley Suitcase', short: 'Hardshell Trolley', mod: 100 },
    soft_spinner: { name: 'Soft Fabric Spinner', short: 'Soft Fabric Spinner', mod: 50 },
    backpack:     { name: 'Travel Backpack', short: 'Travel Backpack', mod: 0 },
    handbag:      { name: 'Leather Handbag', short: 'Leather Handbag', mod: 200 }
  },
  expressSurcharge: 350,
  storageKey: 'mend_luggage_bookings_v1'
};

// State and helpers
let currentEstimate = 899, uploadedPhotoData = null, activeTrackingId = null;
const $ = id => document.getElementById(id);
const formatINR = amt => '₹' + Number(amt).toLocaleString('en-IN');
const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  setMinDate();
  updatePriceEstimate();
  renderBookingHistory();
  updateRecentPills();
});

function setMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const iso = d.toISOString().split('T')[0];
  if ($('service-date')) { $('service-date').min = iso; $('service-date').value = iso; }
}

// Pricing and compatibility
function updatePriceEstimate() {
  const bagKey = document.querySelector('input[name="bag_type"]:checked')?.value || 'hardshell';
  const isExpress = document.querySelector('input[name="service_speed"]:checked')?.value === 'express';
  const bag = PRICING.bags[bagKey];

  // Disable incompatible repairs for selected bag
  Object.keys(PRICING.repairs).forEach(key => {
    const rep = PRICING.repairs[key];
    const card = $('card-repair-' + key), cb = $('repair-' + key), badge = $('badge-repair-' + key);
    const ok = rep.bags.includes(bagKey);
    if (card && cb) {
      card.classList.toggle('disabled', !ok);
      cb.disabled = !ok;
      if (!ok && cb.checked) cb.checked = false;
      if (badge) {
        badge.textContent = ok ? '' : 'Not Applicable';
        badge.className = ok ? 'compatibility-badge' : 'compatibility-badge visible badge-incompatible';
      }
    }
  });

  let selectedRepairs = Array.from(document.querySelectorAll('input[name="repair_issue"]:checked')).map(cb => cb.value);

  // Auto-switch to zipper if no compatible repairs remain checked
  if (selectedRepairs.length === 0) {
    const hasIncompatible = !PRICING.repairs.wheel.bags.includes(bagKey) || !PRICING.repairs.lock.bags.includes(bagKey);
    if ($('repair-zipper')) {
      $('repair-zipper').checked = true;
      selectedRepairs = ['zipper'];
    }
    if (hasIncompatible && $('suitability-alert')) {
      setText('suitability-alert-text', `Note: Wheels and TSA locks are not available for ${bag.name}. Switched to Main Zipper.`);
      $('suitability-alert').classList.remove('hidden');
    }
  } else if (!PRICING.repairs.wheel.bags.includes(bagKey) && $('suitability-alert')) {
    setText('suitability-alert-text', `Note: Wheels and TSA locks are not available for ${bag.name}.`);
    $('suitability-alert').classList.remove('hidden');
  } else if ($('suitability-alert')) {
    $('suitability-alert').classList.add('hidden');
  }

  if (selectedRepairs.length > 0) setText('err-repair-issue', '');

  // Calculate total: sum of base prices + bag mod + express surcharge
  const repairsTotal = selectedRepairs.reduce((sum, key) => sum + (PRICING.repairs[key]?.base || 0), 0);
  const subtotal = repairsTotal > 0 ? repairsTotal + bag.mod : 0;
  const surcharge = (isExpress && repairsTotal > 0) ? PRICING.expressSurcharge : 0;
  currentEstimate = subtotal + surcharge;

  const repairShorts = selectedRepairs.map(key => PRICING.repairs[key]?.short).join(' + ');
  const repairFulls = selectedRepairs.map(key => PRICING.repairs[key]?.name).join(', ');

  setText('summary-bag-val', `${bag.short} (+${formatINR(bag.mod)})`);
  setText('summary-repair-val', repairShorts ? `${repairShorts} (${formatINR(repairsTotal)})` : 'None Selected');
  setText('summary-base-val', formatINR(subtotal));
  setText('summary-express-val', surcharge ? `+${formatINR(surcharge)}` : '₹0 (Included)');
  setText('estimate-total-display', formatINR(currentEstimate));
  setText('form-summary-bag', bag.short);
  setText('form-summary-repair', repairFulls || 'None Selected');
  setText('form-summary-speed', isExpress ? '24-Hour Express (+₹350)' : 'Standard (3–5 Days)');
  setText('form-summary-price', formatINR(currentEstimate));
}

// Event listeners
function initEventListeners() {
  document.querySelectorAll('input[name="bag_type"], input[name="repair_issue"], input[name="service_speed"]').forEach(r => {
    r.addEventListener('change', updatePriceEstimate);
  });

  document.querySelectorAll('.select-service-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const key = e.currentTarget.dataset.service, rep = PRICING.repairs[key];
      if (!rep) return;
      const bagKey = document.querySelector('input[name="bag_type"]:checked')?.value || 'hardshell';
      if (!rep.bags.includes(bagKey) && $('bag-hardshell')) $('bag-hardshell').checked = true;
      if ($('repair-' + key)) $('repair-' + key).checked = true;
      updatePriceEstimate();
      $('step-repair-group')?.scrollIntoView({ behavior: 'smooth' });
      showNotification(`Added ${rep.name}`, 'info');
    });
  });

  $('mobile-toggle')?.addEventListener('click', () => {
    const open = $('mobile-menu')?.classList.toggle('open');
    $('mobile-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      $('mobile-menu')?.classList.remove('open');
      $('mobile-toggle')?.setAttribute('aria-expanded', 'false');
    });
  });

  $('btn-continue-booking')?.addEventListener('click', () => {
    const checked = document.querySelectorAll('input[name="repair_issue"]:checked');
    if (checked.length === 0) {
      setText('err-repair-issue', 'Please select at least one repair issue.');
      $('step-repair-group')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setText('err-repair-issue', '');
    $('booking')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('cust-name')?.focus(), 400);
  });

  document.querySelectorAll('input[name="logistics_pref"]').forEach(r => {
    r.addEventListener('change', e => {
      const isPickup = e.target.value === 'pickup';
      $('pickup-address-container')?.classList.toggle('hidden', !isPickup);
      $('dropoff-info-container')?.classList.toggle('hidden', isPickup);
      if ($('pickup-address')) {
        $('pickup-address').required = isPickup;
        if (!isPickup) clearError('pickup-address');
      }
    });
  });

  $('damage-desc')?.addEventListener('input', e => {
    setText('desc-char-count', `${e.target.value.length} / 500 characters`);
  });

  // Real-time inline field validation listeners
  ['cust-name', 'cust-phone', 'cust-email', 'bag-brand', 'pickup-address', 'service-date', 'service-slot', 'damage-desc'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      if ($(id).classList.contains('is-invalid')) validateField(id);
    });
    $(id)?.addEventListener('blur', () => validateField(id));
  });

  setupPhotoUpload();
  $('booking-form')?.addEventListener('submit', handleBookingSubmit);

  $('btn-modal-close')?.addEventListener('click', () => toggleModal(false));
  $('btn-copy-id')?.addEventListener('click', copyBookingId);
  $('btn-modal-track')?.addEventListener('click', () => {
    const id = $('modal-booking-id')?.textContent.trim();
    toggleModal(false);
    if (id) trackBooking(id);
  });
  $('btn-modal-new')?.addEventListener('click', () => {
    toggleModal(false);
    resetForm();
    showNotification('Ready to book another repair', 'info');
  });

  $('tracking-form')?.addEventListener('submit', e => {
    e.preventDefault();
    trackBooking($('track-id-input')?.value.trim());
  });
  $('btn-load-demo-booking')?.addEventListener('click', loadSampleDemoBooking);
  document.querySelectorAll('.status-ctrl-btn').forEach(btn => {
    btn.addEventListener('click', () => updateActiveBookingStatus(btn.dataset.setStatus));
  });
  $('btn-clear-history')?.addEventListener('click', clearAllHistory);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleModal(false); });
}

// Photo upload
function setupPhotoUpload() {
  const zone = $('file-drop-zone'), input = $('damage-photo');
  if (!zone || !input) return;

  zone.addEventListener('click', e => {
    if (e.target !== input && !e.target.closest('#btn-remove-photo')) input.click();
  });
  input.addEventListener('change', () => handlePhotoFile(input.files[0]));

  ['dragenter', 'dragover'].forEach(n => zone.addEventListener(n, e => { e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(n => zone.addEventListener(n, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', e => { if (e.dataTransfer?.files?.[0]) handlePhotoFile(e.dataTransfer.files[0]); });

  $('btn-remove-photo')?.addEventListener('click', e => {
    e.stopPropagation();
    uploadedPhotoData = null;
    input.value = '';
    $('upload-preview-container')?.classList.add('hidden');
    $('upload-zone-prompt')?.classList.remove('hidden');
    clearError('damage-photo');
  });
}

function handlePhotoFile(file) {
  if (!file) return;
  clearError('damage-photo');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showError('damage-photo', 'Please upload a JPG, PNG, or WebP photo.');
  if (file.size > 5 * 1024 * 1024) return showError('damage-photo', 'Photo must be under 5 MB.');

  const reader = new FileReader();
  reader.onload = e => {
    uploadedPhotoData = e.target.result;
    if ($('preview-thumbnail')) $('preview-thumbnail').src = e.target.result;
    setText('preview-filename', file.name);
    setText('preview-filesize', Math.round(file.size / 1024) + ' KB');
    $('upload-zone-prompt')?.classList.add('hidden');
    $('upload-preview-container')?.classList.remove('hidden');
    showNotification('Photo uploaded', 'success');
  };
  reader.readAsDataURL(file);
}

// Validation
function getFieldChecks() {
  const checks = [
    { id: 'cust-name', ok: $('cust-name')?.value.trim().length >= 2, msg: 'Name must be at least 2 letters.' },
    { id: 'cust-phone', ok: /^[6-9]\d{9}$/.test($('cust-phone')?.value.trim().replace(/[\s-]/g, '')), msg: 'Please enter a valid 10-digit phone number.' },
    { id: 'cust-email', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('cust-email')?.value.trim()), msg: 'Please enter a valid email address.' },
    { id: 'bag-brand', ok: $('bag-brand')?.value.trim().length >= 2, msg: 'Brand must be at least 2 letters.' },
    { id: 'service-date', ok: Boolean($('service-date')?.value && new Date($('service-date').value) >= new Date().setHours(0,0,0,0)), msg: 'Please pick a valid date (today or future).' },
    { id: 'service-slot', ok: Boolean($('service-slot')?.value), msg: 'Please pick a time slot.' },
    { id: 'damage-desc', ok: $('damage-desc')?.value.trim().length >= 10, msg: 'Please write at least 10 characters.' }
  ];
  if ($('pref-pickup')?.checked) {
    checks.push({ id: 'pickup-address', ok: $('pickup-address')?.value.trim().length >= 10, msg: 'Please enter full address and pincode.' });
  }
  return checks;
}

function validateField(id) {
  const check = getFieldChecks().find(c => c.id === id);
  if (!check) return true;
  if (!check.ok) showError(check.id, check.msg);
  else clearError(check.id);
  return check.ok;
}

function validateBookingForm() {
  let valid = true;
  const repairsChecked = document.querySelectorAll('input[name="repair_issue"]:checked');
  if (repairsChecked.length === 0) {
    setText('err-repair-issue', 'Please select at least one repair issue.');
    valid = false;
  } else {
    setText('err-repair-issue', '');
  }

  getFieldChecks().forEach(c => {
    if (!c.ok) { showError(c.id, c.msg); valid = false; }
    else clearError(c.id);
  });

  $('form-global-error')?.classList.toggle('hidden', valid);
  if (!valid) document.querySelector('.form-input.is-invalid, .form-textarea.is-invalid, .form-select.is-invalid')?.focus();
  return valid;
}

function setError(id, msg = '') {
  const err = $('err-' + id), el = $(id);
  if (err) err.textContent = msg;
  if (el) { el.classList.toggle('is-invalid', Boolean(msg)); el.classList.toggle('is-valid', !msg); }
}
const showError = (id, msg) => setError(id, msg);
const clearError = id => setError(id, '');

// Booking submission
function handleBookingSubmit(e) {
  e.preventDefault();
  if (!validateBookingForm()) return;

  const bagKey = document.querySelector('input[name="bag_type"]:checked').value;
  const selectedRepairs = Array.from(document.querySelectorAll('input[name="repair_issue"]:checked')).map(cb => cb.value);
  const isExpress = document.querySelector('input[name="service_speed"]:checked').value === 'express';
  const isPickup = $('pref-pickup').checked;
  const bookingId = 'MEND-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const repairFulls = selectedRepairs.map(k => PRICING.repairs[k].name).join(', ');

  const record = {
    id: bookingId,
    customerName: $('cust-name').value.trim(),
    customerPhone: $('cust-phone').value.trim(),
    customerEmail: $('cust-email').value.trim(),
    bagBrand: $('bag-brand').value.trim(),
    bagTypeName: PRICING.bags[bagKey].name,
    repairTypeName: repairFulls,
    repairKeys: selectedRepairs,
    speedLabel: isExpress ? '24-Hour Express (+₹350)' : 'Standard (3–5 Days)',
    logisticsPref: isPickup ? 'Doorstep Pickup' : 'Drop-off at Service Centre',
    pickupAddress: isPickup ? $('pickup-address').value.trim() : null,
    serviceDate: $('service-date').value,
    serviceSlot: $('service-slot').value,
    damageDescription: $('damage-desc').value.trim(),
    photoDataUrl: uploadedPhotoData,
    estimatedTotal: currentEstimate,
    status: 'Booking received',
    createdAt: new Date().toISOString()
  };

  saveBooking(record);
  renderBookingHistory();
  updateRecentPills();
  displayConfirmation(record);
  showNotification(`Booking saved: ${bookingId}`, 'success');
}

function displayConfirmation(b) {
  setText('modal-booking-id', b.id);
  setText('modal-customer-name', b.customerName);
  setText('modal-bag-brand', `${b.bagBrand} (${b.bagTypeName})`);
  setText('modal-service-name', b.repairTypeName);
  setText('modal-service-tier', b.speedLabel);
  setText('modal-logistics', b.logisticsPref);
  setText('modal-estimated-total', formatINR(b.estimatedTotal));
  setText('copy-btn-text', 'Copy');
  toggleModal(true);
}

function toggleModal(show) {
  const modal = $('confirmation-modal');
  if (!modal) return;
  modal.classList.toggle('hidden', !show);
  document.body.style.overflow = show ? 'hidden' : '';
}

function copyBookingId() {
  const id = $('modal-booking-id')?.textContent.trim();
  if (!id) return;
  navigator.clipboard?.writeText(id).then(() => {
    setText('copy-btn-text', 'Copied!');
    showNotification(`Copied ${id}`, 'success');
  }).catch(() => showNotification(`ID: ${id}`, 'info'));
}

function resetForm() {
  $('booking-form')?.reset();
  if ($('pref-pickup')) $('pref-pickup').checked = true;
  $('pickup-address-container')?.classList.remove('hidden');
  $('dropoff-info-container')?.classList.add('hidden');
  $('btn-remove-photo')?.click();
  document.querySelectorAll('.is-invalid, .is-valid').forEach(el => el.classList.remove('is-invalid', 'is-valid'));
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  $('form-global-error')?.classList.add('hidden');
  setMinDate();
}

// Storage
function loadBookings() {
  try { return JSON.parse(localStorage.getItem(PRICING.storageKey)) || []; } catch (e) { return []; }
}

function saveBooking(item) {
  try {
    const list = loadBookings();
    list.unshift(item);
    localStorage.setItem(PRICING.storageKey, JSON.stringify(list));
  } catch (e) { console.error('Storage full'); }
}

function clearAllHistory() {
  if (confirm('Clear all saved bookings from your browser?')) {
    localStorage.removeItem(PRICING.storageKey);
    renderBookingHistory();
    updateRecentPills();
    $('tracking-card')?.classList.add('hidden');
    $('tracking-empty-state')?.classList.remove('hidden');
    showNotification('History cleared', 'info');
  }
}

// Tracking
function trackBooking(bookingId) {
  if (!bookingId) return setText('err-tracking', 'Please enter a Booking ID.');
  setText('err-tracking', '');
  const cleanId = bookingId.trim().toUpperCase();
  if ($('track-id-input')) $('track-id-input').value = cleanId;

  $('tracking')?.scrollIntoView({ behavior: 'smooth' });
  const b = loadBookings().find(x => x.id.toUpperCase() === cleanId);

  if (!b) {
    $('tracking-empty-state')?.classList.add('hidden');
    $('tracking-card')?.classList.add('hidden');
    $('tracking-not-found')?.classList.remove('hidden');
    setText('tracking-nf-msg', `No booking found with ID "${cleanId}". Please check the code.`);
    return;
  }

  activeTrackingId = b.id;
  $('tracking-empty-state')?.classList.add('hidden');
  $('tracking-not-found')?.classList.add('hidden');
  $('tracking-card')?.classList.remove('hidden');

  setText('track-res-id', b.id);
  setText('track-res-date', 'Booked on ' + new Date(b.createdAt).toLocaleDateString('en-IN'));
  setText('track-res-name', b.customerName);
  setText('track-res-contact', `${b.customerPhone} • ${b.customerEmail}`);
  setText('track-res-bag', `${b.bagBrand} (${b.bagTypeName})`);
  setText('track-res-repair', b.repairTypeName);
  setText('track-res-speed', b.speedLabel);
  setText('track-res-logistics', b.pickupAddress ? `${b.logisticsPref}: ${b.pickupAddress}` : b.logisticsPref);
  setText('track-res-schedule', `${b.serviceDate} (${b.serviceSlot})`);
  setText('track-res-price', formatINR(b.estimatedTotal));
  setText('track-res-desc', b.damageDescription);

  if (b.photoDataUrl && $('track-res-photo')) {
    $('track-res-photo').src = b.photoDataUrl;
    $('track-photo-container')?.classList.remove('hidden');
  } else {
    $('track-photo-container')?.classList.add('hidden');
  }

  updateStepper(b.status);
}

function updateStepper(status) {
  const pill = $('track-res-status-pill');
  if (pill) {
    pill.textContent = status;
    const cls = status.includes('received') ? 'received' : status.includes('inspection') ? 'inspection' : status.includes('progress') ? 'progress' : 'completed';
    pill.className = 'status-pill status-' + cls;
  }
  const stage = status.includes('inspection') ? 2 : status.includes('progress') ? 3 : status.includes('completed') ? 4 : 1;
  for (let i = 1; i <= 4; i++) {
    const node = $('step-node-' + i);
    if (node) {
      node.classList.toggle('completed', i < stage);
      node.classList.toggle('active', i === stage);
    }
  }
}

function updateActiveBookingStatus(newStatus) {
  if (!activeTrackingId) return showNotification('Track a booking first to change its status', 'info');
  const bookings = loadBookings(), b = bookings.find(x => x.id === activeTrackingId);
  if (b) {
    b.status = newStatus;
    localStorage.setItem(PRICING.storageKey, JSON.stringify(bookings));
    trackBooking(b.id);
    renderBookingHistory();
    showNotification(`Status changed: ${newStatus}`, 'success');
  }
}

function loadSampleDemoBooking() {
  const sample = {
    id: 'MEND-DEMO88',
    customerName: 'Aarav Mehta',
    customerPhone: '9820123456',
    customerEmail: 'aarav.mehta@example.com',
    bagBrand: 'Samsonite',
    bagTypeName: 'Hardshell Trolley Suitcase',
    repairTypeName: '360° Spinner Wheel Replacement',
    speedLabel: '24-Hour Express (+₹350)',
    logisticsPref: 'Doorstep Pickup',
    pickupAddress: 'Tower 4, Apt 12B, Palm Springs Boulevard, Delhi 110001',
    serviceDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    serviceSlot: 'Morning (9 AM - 12 PM)',
    damageDescription: 'Left back wheel broke off during flight. Axle mount is intact but wheel casing is cracked.',
    photoDataUrl: null,
    estimatedTotal: 1249,
    status: 'Inspection pending',
    createdAt: new Date().toISOString()
  };
  saveBooking(sample);
  renderBookingHistory();
  updateRecentPills();
  trackBooking(sample.id);
  showNotification('Sample demo booking loaded', 'success');
}

// Booking history
function renderBookingHistory() {
  const container = $('history-list-container');
  if (!container) return;
  const bookings = loadBookings();

  if (!bookings.length) {
    container.innerHTML = `
      <div class="history-empty-state">
        <p class="history-empty-text">No bookings saved yet in this browser.</p>
        <button type="button" class="btn btn-outline btn-sm" id="btn-history-load-demo">Load Sample Booking</button>
      </div>`;
    $('btn-history-load-demo')?.addEventListener('click', loadSampleDemoBooking);
    return;
  }

  container.innerHTML = bookings.map(b => {
    const sCls = b.status.includes('received') ? 'received' : b.status.includes('inspection') ? 'inspection' : b.status.includes('progress') ? 'progress' : 'completed';
    return `
      <article class="history-item-card">
        <div class="h-col-id">
          <span class="h-id">${b.id}</span>
          <span class="h-date">${new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div class="h-col-details">
          <span class="h-repair-name">${b.repairTypeName}</span>
          <span class="h-meta-tags">${b.bagBrand} (${b.bagTypeName}) &bull; ${b.speedLabel}</span>
        </div>
        <div class="h-col-price">${formatINR(b.estimatedTotal)}</div>
        <div class="h-col-status">
          <span class="status-pill status-${sCls}">${b.status}</span>
        </div>
        <div class="h-col-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="trackBooking('${b.id}')">Track</button>
        </div>
      </article>`;
  }).join('');
}

function updateRecentPills() {
  const bar = $('recent-ids-bar'), pills = $('recent-pills-container');
  if (!bar || !pills) return;
  const bookings = loadBookings();
  bar.classList.toggle('hidden', !bookings.length);
  pills.innerHTML = bookings.slice(0, 4).map(b => `
    <button type="button" class="recent-pill-btn" onclick="trackBooking('${b.id}')">${b.id}</button>
  `).join('');
}

// Toast notification
function showNotification(msg, type = 'info') {
  const region = $('toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = msg;
  region.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global exports
window.trackBooking = trackBooking;
window.App = {
  get state() {
    const selectedRepairs = Array.from(document.querySelectorAll('input[name="repair_issue"]:checked')).map(cb => cb.value);
    return {
      selectedBag: document.querySelector('input[name="bag_type"]:checked')?.value || 'hardshell',
      selectedRepair: selectedRepairs[0] || '',
      selectedRepairs,
      selectedSpeed: document.querySelector('input[name="service_speed"]:checked')?.value || 'standard',
      currentEstimate
    };
  },
  loadBookings,
  findBookingById: id => loadBookings().find(b => b.id.toUpperCase() === id.toUpperCase()),
  trackBooking,
  updateActiveBookingStatus
};
