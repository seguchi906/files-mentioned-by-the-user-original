const labels = {
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d...",
  contractTermAll: "\u5168\u671f",
  fieldsAll: "\u5206\u985e\u3059\u3079\u3066",
  officesAll: "\u767a\u6ce8\u8005\u3059\u3079\u3066",
  count: "\u4ef6",
  empty: "\u8a72\u5f53\u3059\u308b\u696d\u52d9\u306f\u3042\u308a\u307e\u305b\u3093\u3002",
  edit: "\u7de8\u96c6",
  editTitle: "\u696d\u52d9\u3092\u7de8\u96c6",
  addTitle: "\u696d\u52d9\u3092\u8ffd\u52a0",
  saved: "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002",
  saving: "\u4fdd\u5b58\u4e2d...",
  deleted: "\u524a\u9664\u3057\u307e\u3057\u305f\u3002",
  importing: "CSV\u3092\u53d6\u308a\u8fbc\u3093\u3067\u3044\u307e\u3059...",
  importedSuffix: "\u4ef6\u3092\u53d6\u308a\u8fbc\u307f\u307e\u3057\u305f\u3002",
  failed: "\u51e6\u7406\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  deletePrefix: "\u300c",
  deleteSuffix: "\u300d\u3092\u524a\u9664\u3057\u307e\u3059\u3002"
};

const state = {
  projects: [],
  facets: { fiscal_years: [], fields: [], offices: [] },
  selected: null,
  sort: "number",
  direction: "asc",
  filters: {
    search: "",
    fiscal_year_true: "",
    field: "",
    office: ""
  }
};

const rows = document.querySelector("#projectRows");
const message = document.querySelector("#message");
const countLabel = document.querySelector("#countLabel");
const dialog = document.querySelector("#editorDialog");
const form = document.querySelector("#projectForm");
const formMessage = document.querySelector("#formMessage");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteButton = document.querySelector("#deleteButton");
const saveButton = document.querySelector("#saveButton");
const filters = {
  search: document.querySelector("#searchInput"),
  fiscal_year_true: document.querySelector("#yearFilter"),
  field: document.querySelector("#fieldFilter"),
  office: document.querySelector("#officeFilter")
};

const formatter = new Intl.NumberFormat("ja-JP");

document.querySelector("#newButton").addEventListener("click", () => openEditor());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancelButton").addEventListener("click", () => dialog.close());
document.querySelector("#csvInput").addEventListener("change", importCsv);
form.addEventListener("submit", saveProject);
deleteButton.addEventListener("click", deleteProject);

for (const [key, element] of Object.entries(filters)) {
  element.addEventListener(key === "search" ? "input" : "change", debounce(() => {
    state.filters[key] = element.value.trim();
    loadProjects().catch(showPageError);
  }, 250));
}

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    const sort = button.dataset.sort;
    state.direction = state.sort === sort && state.direction === "asc" ? "desc" : "asc";
    state.sort = sort;
    loadProjects().catch(showPageError);
  });
});

loadProjects().catch(showPageError);

async function loadProjects() {
  setMessage(labels.loading);
  const params = new URLSearchParams({
    sort: state.sort,
    direction: state.direction
  });

  for (const [key, value] of Object.entries(state.filters)) {
    if (value) params.set(key, value);
  }

  const data = await request(`/api/projects?${params}`);
  state.projects = data.projects;
  state.facets = data.facets;
  renderFilters();
  renderRows();
  setMessage("");
}

function renderFilters() {
  fillSelect(filters.fiscal_year_true, labels.contractTermAll, state.facets.fiscal_years, state.filters.fiscal_year_true);
  fillSelect(filters.field, labels.fieldsAll, state.facets.fields, state.filters.field);
  fillSelect(filters.office, labels.officesAll, state.facets.offices, state.filters.office);
}

function fillSelect(select, label, values, selected) {
  const current = select.value;
  select.replaceChildren(new Option(label, ""));
  values.forEach((value) => select.add(new Option(value, value)));
  select.value = selected || current;
}

function renderRows() {
  countLabel.textContent = `${state.projects.length}${labels.count}`;

  if (!state.projects.length) {
    rows.innerHTML = `<tr><td colspan="11">${labels.empty}</td></tr>`;
    return;
  }

  rows.replaceChildren(...state.projects.map((project) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="number">${escapeHtml(project.number)}</td>
      <td class="name-cell">${escapeHtml(project.name)}</td>
      <td>${escapeHtml(project.office)}</td>
      <td>${formatCategory(project)}</td>
      <td class="money">${formatter.format(Number(project.contract_amount || 0))}</td>
      <td class="number">${value(project.start_date)}</td>
      <td class="number">${value(project.end_date)}</td>
      <td class="number">${value(project.revised_end_date)}</td>
      <td class="number">${value(project.project_year)}</td>
      <td class="number">${value(project.fiscal_year)}</td>
      <td><button class="button secondary" type="button">${labels.edit}</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => openEditor(project));
    return tr;
  }));
}

function openEditor(project = null) {
  state.selected = project;
  form.reset();
  setFormMessage("");
  dialogTitle.textContent = project ? labels.editTitle : labels.addTitle;
  deleteButton.hidden = !project;

  if (project) {
    for (const element of form.elements) {
      if (element.name && project[element.name] !== null && project[element.name] !== undefined) {
        element.value = project[element.name];
      }
    }
  }

  dialog.showModal();
}

async function saveProject(event) {
  event.preventDefault();
  setFormMessage(labels.saving);
  saveButton.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = state.selected?.id;
    const url = id ? `/api/project?id=${encodeURIComponent(id)}` : "/api/projects";
    const method = id ? "PUT" : "POST";

    await request(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    dialog.close();
    setMessage(labels.saved);
    await loadProjects();
  } catch (error) {
    setFormMessage(error.message || labels.failed);
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteProject() {
  if (!state.selected) return;
  const ok = confirm(`${labels.deletePrefix}${state.selected.name}${labels.deleteSuffix}`);
  if (!ok) return;

  try {
    await request(`/api/project?id=${encodeURIComponent(state.selected.id)}`, { method: "DELETE" });
    dialog.close();
    setMessage(labels.deleted);
    await loadProjects();
  } catch (error) {
    setFormMessage(error.message || labels.failed);
  }
}

async function importCsv(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    setMessage(labels.importing);
    const csvBase64 = await readFileAsBase64(file);
    const result = await request("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csvBase64 })
    });

    event.target.value = "";
    setMessage(`${result.imported}${labels.importedSuffix}`);
    await loadProjects();
  } catch (error) {
    showPageError(error);
  }
}

async function readFileAsBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = body?.error || body || labels.failed;
    throw new Error(error);
  }

  return body;
}

function showPageError(error) {
  setMessage(error.message || labels.failed);
}

function setMessage(text) {
  message.textContent = text;
}

function setFormMessage(text) {
  formMessage.textContent = text;
}

function value(text) {
  return text === null || text === undefined || text === "" ? "" : escapeHtml(text);
}

function formatCategory(project) {
  const field = String(project.field || "").trim();
  const subfield = String(project.subfield || "").trim();
  if (field && subfield) return `${escapeHtml(field)} / ${escapeHtml(subfield)}`;
  return escapeHtml(field || subfield);
}

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
