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
const dialogTitle = document.querySelector("#dialogTitle");
const deleteButton = document.querySelector("#deleteButton");
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
    loadProjects();
  }, 250));
}

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    const sort = button.dataset.sort;
    state.direction = state.sort === sort && state.direction === "asc" ? "desc" : "asc";
    state.sort = sort;
    loadProjects();
  });
});

loadProjects();

async function loadProjects() {
  setMessage("読み込み中...");
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
  fillSelect(filters.fiscal_year_true, "契約期すべて", state.facets.fiscal_years, state.filters.fiscal_year_true);
  fillSelect(filters.field, "分類すべて", state.facets.fields, state.filters.field);
  fillSelect(filters.office, "発注者すべて", state.facets.offices, state.filters.office);
}

function fillSelect(select, label, values, selected) {
  const current = select.value;
  select.replaceChildren(new Option(label, ""));
  values.forEach((value) => select.add(new Option(value, value)));
  select.value = selected || current;
}

function renderRows() {
  countLabel.textContent = `${state.projects.length}件`;

  if (!state.projects.length) {
    rows.innerHTML = `<tr><td colspan="8">該当する業務はありません。</td></tr>`;
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
      <td><button class="button secondary" type="button">編集</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => openEditor(project));
    return tr;
  }));
}

function openEditor(project = null) {
  state.selected = project;
  form.reset();
  dialogTitle.textContent = project ? "業務を編集" : "業務を追加";
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
  const payload = Object.fromEntries(new FormData(form).entries());
  const id = state.selected?.id;
  const url = id ? `/api/projects/${id}` : "/api/projects";
  const method = id ? "PUT" : "POST";

  await request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  dialog.close();
  setMessage("保存しました。");
  await loadProjects();
}

async function deleteProject() {
  if (!state.selected) return;
  const ok = confirm(`「${state.selected.name}」を削除します。`);
  if (!ok) return;

  await request(`/api/projects/${state.selected.id}`, { method: "DELETE" });
  dialog.close();
  setMessage("削除しました。");
  await loadProjects();
}

async function importCsv(event) {
  const [file] = event.target.files;
  if (!file) return;

  setMessage("CSVを取り込んでいます...");
  const csvBase64 = await readFileAsBase64(file);
  const result = await request("/api/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csvBase64 })
  });

  event.target.value = "";
  setMessage(`${result.imported}件を取り込みました。`);
  await loadProjects();
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
    const error = body?.error || "処理に失敗しました。";
    setMessage(error);
    throw new Error(error);
  }

  return body;
}

function setMessage(text) {
  message.textContent = text;
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
