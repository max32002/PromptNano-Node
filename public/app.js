// PromptNano - AI 靈感資料庫
// Main Application JavaScript

let allPhotos = [];
let currentPhotoId = null;

// Initialize app
window.onload = function () {
  loadData();
  document.getElementById("uploadOverlay").style.display = "none";
  initDropZone();
  initSearchListener();
  initModalCloseListener();
  loadAvailableTags();
};

// ===================
// Data Loading
// ===================

async function loadData() {
  try {
    const res = await fetch("/api/photos");
    allPhotos = await res.json();
    renderGallery(allPhotos);
  } catch (err) {
    console.error("Load error:", err);
    document.getElementById("gallery").innerHTML =
      '<p style="text-align:center; width:100%; color:red;">載入失敗，請確認伺服器是否運行。</p>';
  }
}

// ===================
// Gallery Rendering
// ===================

function parseTags(tagData) {
  if (!tagData) return [];
  return String(tagData)
    .split("#")
    .map((t) => t.trim())
    .filter((t) => t);
}

function renderGallery(data) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  if (!data || data.length === 0) {
    gallery.innerHTML =
      '<p style="text-align:center; width:100%;">目前沒有靈感資料，請上傳。</p>';
    return;
  }

  data.forEach((photo) => {
    const tagList = parseTags(photo.tags);
    const tagsHtml =
      tagList
        .slice(0, 3)
        .map(
          (t) =>
            `<span class="tag" onclick="filterByTag('${t}', event)">${t}</span>`
        )
        .join("") +
      (tagList.length > 3
        ? '<span class="tag" style="background:none;">...</span>'
        : "");

    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openModal(photo);
    
    // Use thumbnail if available, otherwise use original
    const imgSrc = photo.thumbnail || photo.url;
    
    card.innerHTML = `
      <button class="btn-delete" onclick="deleteItem('${photo.id}', event)" title="刪除此靈感">🗑️</button>
      <img class="card-img" src="${imgSrc}" loading="lazy" onerror="this.src='https://placehold.co/400?text=Image+Error'">
      <div class="card-body">
        <div class="card-title">${photo.title || "無標題"}</div>
        <div class="card-tags">${tagsHtml}</div>
      </div>
    `;
    gallery.appendChild(card);
  });
}

// ===================
// CRUD Operations
// ===================

function deleteItem(id, event, isFromModal = false) {
  if (event) event.stopPropagation();

  showConfirm(
    "⚠️ 確定要刪除這個靈感嗎？\n資料與圖片將無法復原。",
    async function () {
      if (isFromModal) closeModal();

      const loader = document.getElementById("loader");
      loader.innerText = "正在刪除資料與圖片...";
      loader.style.display = "flex";

      try {
        const res = await fetch(`/api/photos/${id}`, {
          method: "DELETE",
        });
        const result = await res.json();
        loader.style.display = "none";

        if (result.success) {
          showAlert("已成功刪除！");
          allPhotos = allPhotos.filter((p) => p.id !== id);
          renderGallery(allPhotos);
        } else {
          showAlert("刪除失敗：" + result.error);
        }
      } catch (err) {
        loader.style.display = "none";
        showAlert("刪除失敗：" + err.message);
      }
    }
  );
}

async function handleUpload(e) {
  e.preventDefault();
  const loader = document.getElementById("loader");
  loader.innerText = "正在進行建檔中...";
  loader.style.display = "flex";

  const form = document.getElementById("uploadForm");
  const formData = new FormData(form);

  try {
    const res = await fetch("/api/photos", {
      method: "POST",
      body: formData,
    });
    const result = await res.json();
    loader.style.display = "none";

    if (result.success) {
      toggleUpload();
      form.reset();
      showAlert("資料建檔成功！");
      loadData();
    } else {
      showAlert("失敗: " + result.error, "錯誤");
    }
  } catch (err) {
    loader.style.display = "none";
    showAlert("上傳失敗: " + err.message, "錯誤");
  }
}

async function saveEdit() {
  const id = document.getElementById("edit-id").value;
  const updatedData = {
    title: document.getElementById("edit-title").value,
    desc: document.getElementById("edit-desc").value,
    tags: document.getElementById("edit-tags").value,
  };

  try {
    const res = await fetch(`/api/photos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    const result = await res.json();

    if (result.success) {
      closeEditModal();
      closeModal();
      loadData();
    } else {
      showAlert("錯誤：" + result.error);
    }
  } catch (err) {
    showAlert("更新失敗：" + err.message);
  }
}

// ===================
// Search & Filter
// ===================

function initSearchListener() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", function (e) {
    const keyword = e.target.value.toLowerCase();

    const filtered = allPhotos.filter((photo) => {
      if (keyword.startsWith("#")) {
        const tagSearch = keyword.substring(1);
        return (
          photo.tags && String(photo.tags).toLowerCase().includes(tagSearch)
        );
      }
      const descText = (photo.desc || "").toLowerCase();
      const titleText = (photo.title || "").toLowerCase();
      return descText.includes(keyword) || titleText.includes(keyword);
    });

    renderGallery(filtered);
  });
}

function filterByTag(tagName, event) {
  event.stopPropagation();
  const searchInput = document.getElementById("searchInput");
  searchInput.value = "#" + tagName;
  searchInput.dispatchEvent(new Event("input"));
}

function clearFilter() {
  const searchInput = document.getElementById("searchInput");
  searchInput.value = "";
  renderGallery(allPhotos);
}

// ===================
// Detail Modal
// ===================

const modal = document.getElementById("detailModal");

function openModal(photo) {
  currentPhotoId = photo.id;
  document.getElementById("modalImg").src = photo.url;
  document.getElementById("modalTitle").innerText = photo.title;
  document.getElementById("modalDesc").innerText = photo.desc || "無提示詞";

  document.getElementById("modalDeleteBtn").onclick = (e) =>
    deleteItem(photo.id, e, true);
  document.getElementById("modalUpdateBtn").onclick = () =>
    openEditModal(photo.id, photo.title, photo.desc, photo.tags);

  const tagList = parseTags(photo.tags);
  const tagsHtml = tagList
    .map(
      (t) =>
        `<span class="tag" onclick="filterByTag('${t}', event); closeModal();">${t}</span>`
    )
    .join("");

  document.getElementById("modalTags").innerHTML = tagsHtml;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

function initModalCloseListener() {
  window.addEventListener("click", function (event) {
    if (event.target == modal) closeModal();
    if (event.target == document.getElementById("tutorialModal"))
      closeTutorial();
  });
}

function copyDesc() {
  const text = document.getElementById("modalDesc").innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(".btn-copy");
    const original = btn.innerHTML;
    btn.innerHTML = "✅ 已複製";
    setTimeout(() => (btn.innerHTML = original), 2000);
  });
}

async function downloadImage() {
  const img = document.getElementById("modalImg");
  const title = document.getElementById("modalTitle").innerText || "image";
  const url = img.src;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = title + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(url, "_blank");
  }
}

// ===================
// Upload Modal
// ===================

function toggleUpload() {
  const el = document.getElementById("uploadOverlay");
  const isHidden = el.style.display === "none" || el.style.display === "";
  el.style.display = isHidden ? "flex" : "none";

  if (isHidden) {
    document.getElementById("uploadForm").reset();
    resetDropZone();
    setTimeout(
      () => document.querySelector('input[name="title"]').focus(),
      100
    );
  }
}

// ===================
// Drag and Drop
// ===================

function initDropZone() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const previewImg = document.getElementById("previewImg");
  const fileName = document.getElementById("fileName");

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone when dragging over
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("drag-over");
    });
  });

  // Handle dropped files
  dropZone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Handle file input change
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showAlert("請選擇圖片檔案", "錯誤");
      return;
    }

    // Update file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      dropZone.classList.add("has-file");
      fileName.textContent = file.name;
    };
    reader.readAsDataURL(file);

    // Try to extract AI metadata from PNG
    if (file.type === "image/png") {
      extractPngMetadata(file);
    }
  }
}

// ===================
// PNG Metadata Extraction (for Stable Diffusion / ComfyUI)
// ===================

function extractPngMetadata(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const buffer = e.target.result;
    const metadata = parsePngChunks(new Uint8Array(buffer));
    
    if (metadata) {
      // Auto-fill form fields
      const descField = document.querySelector('textarea[name="desc"]');
      const titleField = document.querySelector('input[name="title"]');
      
      if (metadata.prompt && descField) {
        descField.value = metadata.prompt;
      }
      
      // Auto-generate title from prompt (first 30 chars)
      if (metadata.prompt && titleField && !titleField.value) {
        const shortTitle = metadata.prompt.substring(0, 30).split(',')[0].trim();
        titleField.value = shortTitle || "AI Generated";
      }
      
      showAlert("✨ 已自動讀取 AI 生成參數！", "提示");
    }
  };
  reader.readAsArrayBuffer(file);
}

function parsePngChunks(data) {
  // PNG signature: 137 80 78 71 13 10 26 10
  if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) {
    return null;
  }
  
  let offset = 8; // Skip PNG signature
  const textDecoder = new TextDecoder('utf-8');
  let metadata = null;
  
  while (offset < data.length) {
    // Read chunk length (4 bytes, big endian)
    const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;
    
    // Read chunk type (4 bytes)
    const type = textDecoder.decode(data.slice(offset, offset + 4));
    offset += 4;
    
    if (type === 'tEXt' || type === 'iTXt') {
      // Read chunk data
      const chunkData = data.slice(offset, offset + length);
      const text = textDecoder.decode(chunkData);
      
      // Find null separator
      const nullIndex = text.indexOf('\x00');
      if (nullIndex > -1) {
        const key = text.substring(0, nullIndex);
        let value = text.substring(nullIndex + 1);
        
        // For iTXt, skip compression flag and language tag
        if (type === 'iTXt') {
          const parts = value.split('\x00');
          value = parts[parts.length - 1];
        }
        
        // Check for A1111 parameters
        if (key === 'parameters') {
          metadata = parseA1111Parameters(value);
        }
        // Check for ComfyUI prompt
        else if (key === 'prompt' && !metadata) {
          metadata = { prompt: value };
        }
      }
    }
    
    offset += length + 4; // Skip data and CRC
    
    if (type === 'IEND') break;
  }
  
  return metadata;
}

function parseA1111Parameters(text) {
  // A1111 format: prompt\nNegative prompt: ...\nSteps: ..., Sampler: ...
  const lines = text.split('\n');
  let prompt = '';
  let negativePrompt = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('Negative prompt:')) {
      negativePrompt = line.substring('Negative prompt:'.length).trim();
    } else if (line.startsWith('Steps:') || line.startsWith('Size:')) {
      // Parameters line, stop here
      break;
    } else if (!negativePrompt) {
      prompt += (prompt ? '\n' : '') + line;
    }
  }
  
  return {
    prompt: prompt.trim(),
    negativePrompt: negativePrompt.trim()
  };
}

function resetDropZone() {
  const dropZone = document.getElementById("dropZone");
  const previewImg = document.getElementById("previewImg");
  const fileName = document.getElementById("fileName");

  if (dropZone) {
    dropZone.classList.remove("has-file");
    previewImg.src = "";
    fileName.textContent = "";
  }
}

// ===================
// Tag Autocomplete
// ===================

let allAvailableTags = [];

async function loadAvailableTags() {
  try {
    const res = await fetch('/api/tags');
    allAvailableTags = await res.json();
    setupTagAutocomplete();
  } catch (err) {
    console.error('Failed to load tags:', err);
  }
}

function setupTagAutocomplete() {
  // Setup for upload form
  const uploadTagsInput = document.querySelector('input[name="tags"]');
  if (uploadTagsInput) {
    setupTagInput(uploadTagsInput);
  }
  
  // Setup for edit form
  const editTagsInput = document.getElementById('edit-tags');
  if (editTagsInput) {
    setupTagInput(editTagsInput);
  }
}

function setupTagInput(input) {
  // Create suggestions container
  let suggestionsDiv = input.nextElementSibling;
  if (!suggestionsDiv || !suggestionsDiv.classList.contains('tag-suggestions')) {
    suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'tag-suggestions';
    suggestionsDiv.style.cssText = `
      position: absolute;
      background: var(--card-bg);
      border: 1px solid var(--input-border);
      border-radius: 10px;
      max-height: 150px;
      overflow-y: auto;
      display: none;
      z-index: 100;
      box-shadow: var(--shadow);
    `;
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(suggestionsDiv);
  }
  
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    // Get the last tag being typed (after the last #)
    const lastHashIndex = value.lastIndexOf('#');
    const currentTag = lastHashIndex > -1 ? value.substring(lastHashIndex + 1).toLowerCase() : '';
    
    if (currentTag.length > 0) {
      const matches = allAvailableTags.filter(t => 
        t.toLowerCase().includes(currentTag) && t.toLowerCase() !== currentTag
      ).slice(0, 8);
      
      if (matches.length > 0) {
        suggestionsDiv.innerHTML = matches.map(tag => 
          `<div class="tag-suggestion-item" style="padding: 8px 15px; cursor: pointer; transition: 0.2s;"
                onmouseover="this.style.background='var(--input-bg)'"
                onmouseout="this.style.background=''"
                onclick="selectTag(this, '${tag}')">#${tag}</div>`
        ).join('');
        
        // Position the suggestions
        suggestionsDiv.style.width = input.offsetWidth + 'px';
        suggestionsDiv.style.display = 'block';
      } else {
        suggestionsDiv.style.display = 'none';
      }
    } else {
      suggestionsDiv.style.display = 'none';
    }
  });
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = 'none';
    }
  });
}

function selectTag(element, tag) {
  const input = element.parentElement.previousElementSibling;
  const value = input.value;
  const lastHashIndex = value.lastIndexOf('#');
  
  if (lastHashIndex > -1) {
    input.value = value.substring(0, lastHashIndex + 1) + tag + ' ';
  } else {
    input.value = '#' + tag + ' ';
  }
  
  element.parentElement.style.display = 'none';
  input.focus();
}

// ===================
// Edit Modal
// ===================

function openEditModal(id, title, desc, tags) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-title").value = title || "";
  document.getElementById("edit-desc").value = desc || "";
  document.getElementById("edit-tags").value = tags || "";
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

// ===================
// Theme
// ===================

// Apply saved theme on load
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const target = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", target);
  localStorage.setItem("theme", target);
}

// ===================
// System Modal (Alert/Confirm)
// ===================

const sysModal = document.getElementById("systemModal");
const sysTitle = document.getElementById("sysTitle");
const sysMsg = document.getElementById("sysMsg");
const sysBtnOk = document.getElementById("sysBtnOk");
const sysBtnCancel = document.getElementById("sysBtnCancel");

function closeSystemModal() {
  sysModal.style.display = "none";
}

function showAlert(msg, title = "提示") {
  sysTitle.innerText = title;
  sysMsg.innerText = msg;
  sysBtnCancel.style.display = "none";
  sysBtnOk.onclick = closeSystemModal;
  sysModal.style.display = "flex";
}

function showConfirm(msg, onConfirm) {
  sysTitle.innerText = "確認操作";
  sysMsg.innerText = msg;
  sysBtnCancel.style.display = "block";
  sysBtnOk.onclick = function () {
    onConfirm();
    closeSystemModal();
  };
  sysModal.style.display = "flex";
}

// ===================
// Tutorial Modal
// ===================

function openTutorial() {
  document.getElementById("tutorialModal").style.display = "flex";
}

function closeTutorial() {
  document.getElementById("tutorialModal").style.display = "none";
}

function copyKw(el) {
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    el.innerText = "已複製!";
    el.style.backgroundColor = "var(--primary)";
    el.style.color = "#fff";
    setTimeout(() => {
      el.innerText = text;
      el.style.backgroundColor = "";
      el.style.color = "";
    }, 800);
  });
}

// ===================
// Settings Modal
// ===================

function openSettings() {
  document.getElementById("settingsModal").style.display = "flex";
  updateStats();
}

function closeSettings() {
  document.getElementById("settingsModal").style.display = "none";
}

function updateStats() {
  const statsEl = document.getElementById("statsInfo");
  const totalPhotos = allPhotos.length;
  
  // Count unique tags
  const allTags = new Set();
  allPhotos.forEach(photo => {
    if (photo.tags) {
      const tags = String(photo.tags).split("#").map(t => t.trim()).filter(t => t);
      tags.forEach(t => allTags.add(t));
    }
  });
  
  statsEl.innerHTML = `
    📷 總共 <strong>${totalPhotos}</strong> 筆靈感資料<br>
    🏷️ 共有 <strong>${allTags.size}</strong> 個不重複標籤
  `;
}

function exportCSV() {
  // Trigger download via API
  const link = document.createElement("a");
  link.href = "/api/export/csv";
  link.download = "promptnano_export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showAlert("CSV 匯出完成！檔案已開始下載。");
}
