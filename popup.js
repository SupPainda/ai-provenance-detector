const fileInput = document.getElementById('fileInput');
const extractButton = document.getElementById('extractButton');
const downloadButton = document.getElementById('downloadButton');
const status = document.getElementById('status');
const metadataOutput = document.getElementById('metadataOutput');

let extractedText = '';
let currentFileName = 'metadata';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Probes the backend server status with a timeout.
 * @returns {Promise<boolean>} True if server is online, false otherwise.
 */
async function checkServerOnline() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch('http://localhost:3000/', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (_err) {
    clearTimeout(timeoutId);
    return false;
  }
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  extractButton.disabled = true;
  downloadButton.disabled = true;
  extractedText = '';
  metadataOutput.textContent = '';

  const aiDetails = document.getElementById('aiDetails');
  if (aiDetails) {
    aiDetails.innerHTML = '';
    aiDetails.style.display = 'none';
  }

  if (!file) {
    status.textContent = 'No file selected.';
    status.className = 'status';
    return;
  }

  currentFileName = file.name.replace(/\.[^/.]+$/, '') || 'metadata';
  status.textContent = 'Checking backend server status...';
  status.className = 'status';

  const isOnline = await checkServerOnline();
  if (isOnline) {
    status.textContent = `Ready to analyze provenance of ${file.name}`;
    status.className = 'status';
    extractButton.disabled = false;
  } else {
    status.textContent = `Ready to analyze provenance of ${file.name} (⚠️ Backend server is offline. Please start it using 'node server.js' first.)`;
    status.className = 'status status-high';
    extractButton.disabled = true;
  }
});

extractButton.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    status.textContent = 'Please select an image file first.';
    return;
  }

  extractButton.disabled = true;
  status.textContent = 'Uploading and extracting metadata...';
  metadataOutput.textContent = '';

  try {
    const formData = new FormData();
    formData.append('image', file, file.name);

    const response = await fetch('http://localhost:3000/extract', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server returned ${response.status}`);
    }

    const data = await response.json();
    extractedText = data.metadata || '';
    metadataOutput.textContent = extractedText || 'No metadata returned.';

    // AI detection display
    const ai = data.ai;
    const aiDetails = document.getElementById('aiDetails');

    if (ai && ai.confidence === 'HIGH') {
      status.textContent = `⚠️ AI Generated (HIGH confidence)${ai.generator ? ' — ' + ai.generator : ''}`;
      status.className = 'status status-high';
    } else if (ai && ai.confidence === 'MEDIUM') {
      status.textContent = `⚡ Maybe AI (MEDIUM confidence)${ai.generator ? ' — ' + ai.generator : ''}`;
      status.className = 'status status-medium';
    } else {
      status.textContent = '✅ No AI proof found';
      status.className = 'status status-low';
    }

    // Show matched reasons
    if (ai && ai.reasons && ai.reasons.length > 0) {
      aiDetails.innerHTML =
        '<strong>Evidence:</strong><ul>' + ai.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('') + '</ul>';
      aiDetails.style.display = 'block';
    } else {
      aiDetails.innerHTML = '';
      aiDetails.style.display = 'none';
    }

    if (ai && ai.metadataStripped) {
      aiDetails.innerHTML += '<p class="stripped-note">⚠ Metadata may have been stripped from this image.</p>';
      aiDetails.style.display = 'block';
    }

    downloadButton.disabled = !extractedText;
  } catch (error) {
    metadataOutput.textContent = '';
    status.textContent = `Extraction failed: ${error.message}`;
    status.className = 'status';
    console.error(error);
  } finally {
    extractButton.disabled = false;
  }
});

downloadButton.addEventListener('click', () => {
  if (!extractedText) {
    status.textContent = 'No metadata available to download.';
    return;
  }

  const blob = new Blob([extractedText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentFileName}.exiftool.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});
