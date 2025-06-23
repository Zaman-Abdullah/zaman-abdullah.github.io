let primaryData = null;
let secondaryData = null;

const primaryFile = document.getElementById("primaryFile");
const secondaryFile = document.getElementById("secondaryFile");
const mergeKeySelect = document.getElementById("mergeKey");
const mergeButton = document.getElementById("mergeButton");
const refreshButton = document.getElementById("refreshButton");
const loader = document.getElementById("loader");

// Show/hide loader
function showLoader(show) {
  loader.classList.toggle("hidden", !show);
}

// Handle drag & drop zones
function setupDropZone(dropZoneId, fileInput) {
  const dropZone = document.getElementById(dropZoneId);

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });
}

setupDropZone("primaryDrop", primaryFile);
setupDropZone("secondaryDrop", secondaryFile);

// Utility: Parse CSV/Excel
async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const extension = file.name.split(".").pop().toLowerCase();

    reader.onload = function (e) {
      if (extension === "csv") {
        const result = Papa.parse(e.target.result, { header: true });
        resolve(result.data);
      } else if (["xlsx", "xls"].includes(extension)) {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        resolve(sheet);
      } else {
        reject("Unsupported file type");
      }
    };

    if (extension === "csv") {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

// Enable merge button if all fields ready
function tryEnableMerge() {
  if (primaryData && secondaryData && mergeKeySelect.value) {
    mergeButton.disabled = false;
  }
}

// Populate merge key options based on shared columns
function populateMergeKeys() {
  if (!primaryData || !secondaryData) return;
  const primaryCols = Object.keys(primaryData[0] || {});
  const secondaryCols = Object.keys(secondaryData[0] || {});
  const common = primaryCols.filter(col => secondaryCols.includes(col));

  mergeKeySelect.innerHTML = "";
  common.forEach(col => {
    const option = document.createElement("option");
    option.value = col;
    option.textContent = col;
    mergeKeySelect.appendChild(option);
  });

  mergeKeySelect.disabled = false;
  if (common.length > 0) {
    mergeKeySelect.value = common[0];
    tryEnableMerge();
  }
}

// Display file name
function displayFileName(id, name) {
  const el = document.getElementById(id);
  el.textContent = `📄 ${name}`;
}

// File input handlers
primaryFile.addEventListener("change", async () => {
  const file = primaryFile.files[0];
  if (file) {
    displayFileName("primaryFileName", file.name);
    showLoader(true);
    primaryData = await parseFile(file);
    populateMergeKeys();
    tryEnableMerge();
    showLoader(false);
  }
});

secondaryFile.addEventListener("change", async () => {
  const file = secondaryFile.files[0];
  if (file) {
    displayFileName("secondaryFileName", file.name);
    showLoader(true);
    secondaryData = await parseFile(file);
    populateMergeKeys();
    tryEnableMerge();
    showLoader(false);
  }
});

// Merge logic
mergeButton.addEventListener("click", () => {
  const key = mergeKeySelect.value;
  if (!key || !primaryData || !secondaryData) return;

  showLoader(true);
  const merged = primaryData.map(row => {
    const match = secondaryData.find(r => (r[key] || "").toString().trim() === (row[key] || "").toString().trim());
    return match ? { ...row, ...match } : null;
  }).filter(r => r !== null);

  const missing = primaryData.filter(row =>
    !secondaryData.some(r => (r[key] || "").toString().trim() === (row[key] || "").toString().trim())
  );

  showResults(merged, missing);
  showLoader(false);
});

// Show merged results
function showResults(merged, missing) {
  document.getElementById("resultsArea").classList.remove("hidden");
  document.getElementById("summary").innerHTML = `
    <p><strong>Merged Rows:</strong> ${merged.length}</p>
    <p><strong>Missing Matches:</strong> ${missing.length}</p>
  `;

  const warnings = document.getElementById("warnings");
  warnings.innerHTML = "";
  if (missing.length > 0) {
    const warnBox = document.createElement("div");
    warnBox.className = "warning";
    warnBox.textContent = `${missing.length} rows from primary file had no match in the secondary file.`;
    warnings.appendChild(warnBox);
  }

  renderTablePreview(merged.slice(0, 10));

  // Setup download
  document.getElementById("downloadButton").onclick = () => {
    const csv = Papa.unparse(merged);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
}

// Preview table
function renderTablePreview(data) {
  const container = document.getElementById("previewTable");
  container.innerHTML = "";

  if (!data.length) {
    container.textContent = "No preview available.";
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headers = Object.keys(data[0]);

  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = row[h] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Reset UI
refreshButton.addEventListener("click", () => {
  primaryFile.value = "";
  secondaryFile.value = "";
  primaryData = null;
  secondaryData = null;
  mergeKeySelect.innerHTML = "<option disabled selected>Upload files to populate</option>";
  mergeKeySelect.disabled = true;
  document.getElementById("primaryFileName").textContent = "";
  document.getElementById("secondaryFileName").textContent = "";
  document.getElementById("resultsArea").classList.add("hidden");
  document.getElementById("previewTable").innerHTML = "";
  document.getElementById("summary").innerHTML = "";
  document.getElementById("warnings").innerHTML = "";
  mergeButton.disabled = true;
});
