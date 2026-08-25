'use strict';

// ============================================================
// Theme
// ============================================================

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ============================================================
// Mobile nav
// ============================================================

const mobileToggle = document.getElementById('mobile-nav-toggle');
const mainNav = document.getElementById('main-nav');

mobileToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  mobileToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    mobileToggle.setAttribute('aria-expanded', 'false');
  });
});

// ============================================================
// State
// ============================================================

// Each entry: { id, file, name, ext, originalSize, objectUrl, status, result }
let files = [];
let nextId = 0;

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/avif', 'image/webp'];

// ============================================================
// Elements
// ============================================================

const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const selectBtn   = document.getElementById('select-btn');
const fileSection = document.getElementById('file-section');
const fileList    = document.getElementById('file-list');
const fileCountEl = document.getElementById('file-count');
const clearAllBtn = document.getElementById('clear-all-btn');

const settingsPanel  = document.getElementById('settings-panel');
const convertAction  = document.getElementById('convert-action');
const convertBtn     = document.getElementById('convert-btn');
const convertProgress = document.getElementById('convert-progress');
const qualitySlider  = document.getElementById('quality-slider');
const qualityValue   = document.getElementById('quality-value');

const resultsPanel  = document.getElementById('results-panel');
const resultsStats  = document.getElementById('results-stats');
const previewGrid   = document.getElementById('preview-grid');
const downloadAllBtn = document.getElementById('download-all-btn');
const convertMoreBtn = document.getElementById('convert-more-btn');

const toast = document.getElementById('toast');

// ============================================================
// Drop Zone
// ============================================================

selectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener('click', (e) => {
  if (e.target === selectBtn || selectBtn.contains(e.target)) return;
  fileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  // Only remove class when leaving the drop zone itself, not a child element
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const dropped = Array.from(e.dataTransfer.files);
  if (dropped.length) addFiles(dropped);
});

// ============================================================
// File Management
// ============================================================

function addFiles(newFiles) {
  const accepted = [];
  const rejected = [];

  newFiles.forEach(file => {
    if (SUPPORTED_TYPES.includes(file.type)) {
      accepted.push(file);
    } else {
      rejected.push(file.name);
    }
  });

  if (rejected.length) {
    showToast(`${rejected.length} فایل پشتیبانی نمی‌شود و نادیده گرفته شد.`);
  }

  accepted.forEach(file => {
    const id = nextId++;
    files.push({
      id,
      file,
      name: file.name,
      ext: file.name.split('.').pop().toUpperCase(),
      originalSize: file.size,
      objectUrl: null,
      status: 'ready',
      result: null,
    });
  });

  renderFileList();
  syncUI();
}

function removeFile(id) {
  const entry = files.find(f => f.id === id);
  if (entry && entry.objectUrl) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  files = files.filter(f => f.id !== id);
  renderFileList();
  syncUI();
}

function clearAll() {
  files.forEach(f => {
    if (f.objectUrl) URL.revokeObjectURL(f.objectUrl);
  });
  files = [];
  renderFileList();
  hideResults();
  syncUI();
}

// ============================================================
// Render
// ============================================================

function renderFileList() {
  fileList.innerHTML = '';

  files.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'file-card' + (entry.status === 'error' ? ' has-error' : '') + (entry.status === 'done' ? ' is-done' : '');
    li.dataset.id = entry.id;

    const statusText = {
      ready:   'آماده تبدیل',
      loading: 'در حال تبدیل...',
      done:    `تبدیل شد — ${formatBytes(entry.result?.webpSize || 0)} WebP`,
      error:   entry.errorMsg || 'خطا در تبدیل',
    }[entry.status];

    const statusClass = {
      ready:   'status-ready',
      loading: 'status-loading',
      done:    'status-done',
      error:   'status-error',
    }[entry.status];

    li.innerHTML = `
      <div class="file-thumb-placeholder" data-thumb="${entry.id}">
        <span>${entry.ext}</span>
      </div>
      <div class="file-info">
        <p class="file-name" title="${escHtml(entry.name)}">${escHtml(entry.name)}</p>
        <p class="file-meta">
          <span>${entry.ext}</span>
          <span>•</span>
          <span>${formatBytes(entry.originalSize)}</span>
        </p>
        <p class="file-status ${statusClass}">${statusText}</p>
      </div>
      <button class="file-remove" data-id="${entry.id}" aria-label="حذف ${escHtml(entry.name)}" title="حذف">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    fileList.appendChild(li);

    // Generate thumbnail asynchronously to avoid blocking the main thread
    generateThumbnail(entry, li);
  });

  fileCountEl.textContent = `${toPersianDigits(files.length)} فایل انتخاب شده`;
}

function generateThumbnail(entry, li) {
  const placeholder = li.querySelector(`[data-thumb="${entry.id}"]`);
  if (!placeholder) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.className = 'file-thumb';
    img.src = e.target.result;
    img.alt = entry.name;
    img.loading = 'lazy';
    img.onerror = () => {}; // Silently keep the placeholder if image fails
    placeholder.replaceWith(img);
  };
  reader.readAsDataURL(entry.file);
}

// ============================================================
// UI State Sync
// ============================================================

function syncUI() {
  const hasFiles = files.length > 0;
  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');

  fileSection.hidden = !hasFiles;
  settingsPanel.hidden = !hasFiles;
  convertAction.hidden = !hasFiles || allDone;
}

function hideResults() {
  resultsPanel.hidden = true;
  previewGrid.innerHTML = '';
  resultsStats.innerHTML = '';
}

// ============================================================
// Quality Slider
// ============================================================

qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = toPersianDigits(qualitySlider.value);
  qualitySlider.setAttribute('aria-valuenow', qualitySlider.value);
});

// ============================================================
// Conversion Mode UI
// ============================================================

document.querySelectorAll('.mode-option').forEach(label => {
  const radio = label.querySelector('input[type="radio"]');
  radio.addEventListener('change', () => {
    document.querySelectorAll('.mode-option').forEach(l => l.classList.remove('mode-option--selected'));
    if (radio.checked) label.classList.add('mode-option--selected');

    // Lossless mode ignores quality slider
    const isLossless = radio.value === 'lossless';
    qualitySlider.disabled = isLossless;
    qualitySlider.style.opacity = isLossless ? '0.4' : '1';
  });
});

// ============================================================
// Conversion
// ============================================================

convertBtn.addEventListener('click', startConversion);

async function startConversion() {
  const pending = files.filter(f => f.status === 'ready' || f.status === 'error');
  if (!pending.length) {
    showToast('هیچ تصویری برای تبدیل وجود ندارد.');
    return;
  }

  const quality = parseInt(qualitySlider.value, 10) / 100;
  const isLossless = document.querySelector('input[name="conversion-mode"]:checked').value === 'lossless';

  convertBtn.disabled = true;
  convertProgress.hidden = false;
  hideResults();

  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];
    convertProgress.textContent = `در حال تبدیل... ${toPersianDigits(i + 1)} از ${toPersianDigits(pending.length)} تصویر`;

    entry.status = 'loading';
    updateCardStatus(entry);

    try {
      const result = await convertToWebP(entry.file, quality, isLossless);
      entry.status = 'done';
      entry.result = result;
    } catch (err) {
      entry.status = 'error';
      entry.errorMsg = err.message || 'این مرورگر قادر به خواندن این فرمت نیست.';
    }

    updateCardStatus(entry);
  }

  convertBtn.disabled = false;
  convertProgress.hidden = true;

  const doneEntries = files.filter(f => f.status === 'done' && f.result);
  if (doneEntries.length > 0) {
    showResults(doneEntries);
  } else {
    showToast('هیچ تصویری با موفقیت تبدیل نشد.');
  }

  syncUI();
}

function convertToWebP(file, quality, lossless) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Release the blob URL immediately after drawing
      URL.revokeObjectURL(url);

      const mimeType = 'image/webp';
      const encodeQuality = lossless ? undefined : quality;

      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('این مرورگر قادر به تبدیل این فرمت نیست.'));
          return;
        }

        const webpUrl = URL.createObjectURL(blob);
        resolve({
          blob,
          webpUrl,
          webpSize: blob.size,
          originalSize: file.size,
        });
      }, mimeType, encodeQuality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('این مرورگر قادر به خواندن این فرمت نیست.'));
    };

    img.src = url;
  });
}

function updateCardStatus(entry) {
  const card = fileList.querySelector(`[data-id="${entry.id}"]`);
  if (!card) return;

  // Update card class
  card.classList.toggle('has-error', entry.status === 'error');
  card.classList.toggle('is-done', entry.status === 'done');

  const statusEl = card.querySelector('.file-status');
  if (!statusEl) return;

  statusEl.className = `file-status status-${entry.status}`;
  statusEl.textContent = {
    loading: 'در حال تبدیل...',
    done:    `تبدیل شد — ${formatBytes(entry.result?.webpSize || 0)} WebP`,
    error:   entry.errorMsg || 'خطا در تبدیل',
  }[entry.status] || '';
}

// ============================================================
// Results
// ============================================================

function showResults(doneEntries) {
  const totalOriginal = doneEntries.reduce((s, e) => s + e.originalSize, 0);
  const totalWebP     = doneEntries.reduce((s, e) => s + e.result.webpSize, 0);
  const savedBytes    = totalOriginal - totalWebP;
  const savedPct      = totalOriginal > 0 ? Math.round((savedBytes / totalOriginal) * 100) : 0;

  resultsStats.innerHTML = `
    <div class="stat-item">
      <p class="stat-label">حجم قبل</p>
      <p class="stat-value">${formatBytes(totalOriginal)}</p>
    </div>
    <div class="stat-item">
      <p class="stat-label">حجم بعد</p>
      <p class="stat-value">${formatBytes(totalWebP)}</p>
    </div>
    <div class="stat-item">
      <p class="stat-label">کاهش حجم</p>
      <p class="stat-value is-reduction">${toPersianDigits(savedPct)}٪</p>
    </div>
  `;

  previewGrid.innerHTML = '';
  doneEntries.forEach(entry => previewGrid.appendChild(buildPreviewCard(entry)));

  downloadAllBtn.hidden = doneEntries.length < 2;
  resultsPanel.hidden = false;

  // Scroll into view
  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildPreviewCard(entry) {
  const { name, originalSize, result } = entry;
  const { webpUrl, webpSize } = result;
  const savedPct = originalSize > 0 ? Math.round(((originalSize - webpSize) / originalSize) * 100) : 0;
  const webpName = name.replace(/\.[^.]+$/, '.webp');

  const card = document.createElement('div');
  card.className = 'preview-card';

  card.innerHTML = `
    <div class="preview-tabs">
      <button class="preview-tab active" data-target="webp">WebP</button>
      <button class="preview-tab" data-target="original">تصویر اصلی</button>
    </div>
    <div class="preview-image-wrap">
      <img src="${webpUrl}" alt="پیش‌نمایش WebP" loading="lazy" />
    </div>
    <div class="preview-meta">
      <p class="preview-filename" title="${escHtml(webpName)}">${escHtml(webpName)}</p>
      <p class="preview-sizes">${formatBytes(originalSize)} ← ${formatBytes(webpSize)}</p>
      <p class="preview-reduction">↓ ${toPersianDigits(savedPct)}٪</p>
    </div>
    <button class="preview-download" aria-label="دانلود ${escHtml(webpName)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      دانلود WebP
    </button>
  `;

  // Tab switching between original and webp preview
  const tabs   = card.querySelectorAll('.preview-tab');
  const imgEl  = card.querySelector('.preview-image-wrap img');
  const origUrl = URL.createObjectURL(entry.file);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      imgEl.src = tab.dataset.target === 'webp' ? webpUrl : origUrl;
    });
  });

  card.querySelector('.preview-download').addEventListener('click', () => {
    triggerDownload(webpUrl, webpName);
  });

  return card;
}

// ============================================================
// Download All (individual downloads, no external ZIP lib)
// ============================================================

downloadAllBtn.addEventListener('click', () => {
  const doneEntries = files.filter(f => f.status === 'done' && f.result);
  if (!doneEntries.length) return;

  // Stagger downloads slightly to avoid browser blocking them as pop-ups
  doneEntries.forEach((entry, i) => {
    const webpName = entry.name.replace(/\.[^.]+$/, '.webp');
    setTimeout(() => triggerDownload(entry.result.webpUrl, webpName), i * 120);
  });
});

convertMoreBtn.addEventListener('click', () => {
  // Release object URLs for converted files before clearing
  files.forEach(f => {
    if (f.result?.webpUrl) URL.revokeObjectURL(f.result.webpUrl);
  });
  clearAll();
});

clearAllBtn.addEventListener('click', clearAll);

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============================================================
// FAQ Accordion
// ============================================================

document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('is-open');

    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('is-open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ============================================================
// Utilities
// ============================================================

function formatBytes(bytes) {
  if (bytes === 0) return '۰ B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0);
  return `${toPersianDigits(val)} ${sizes[i]}`;
}

function toPersianDigits(str) {
  return String(str).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  // Force reflow before adding class for the transition to fire
  toast.offsetHeight;
  toast.classList.add('visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 200);
  }, 3200);
}
