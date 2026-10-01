const CONFIG = { issueTemplate: 'crear-repositorio.yml', workflowFile: 'create_repo.yml' };
const FALLBACK_REPOSITORY = 'ljpg-test/create-repo';

// Repositorio orquestador (contiene el issue form y create_repo.yml). Se toma de
// data/config.json (lo genera sync_workspace.yml); si falta, de una URL pública
// <owner>.github.io/<repo>/. Pages privado (*.pages.github.io) y dominios propios
// no permiten deducirlo, por eso config.json va primero.
async function resolveRepository() {
  try {
    const res = await fetch('data/config.json', { cache: 'no-store' });
    if (res.ok) {
      const { repository } = await res.json();
      if (/^[\w.-]+\/[\w.-]+$/.test(repository || '')) return repository;
    }
  } catch { /* se usa el siguiente método */ }

  const owner = window.location.hostname.match(/^([\w-]+)\.github\.io$/);
  const repo = window.location.pathname.split('/').filter(Boolean)[0];
  return owner && repo ? `${owner[1]}/${repo}` : FALLBACK_REPOSITORY;
}

const REPO_NAME_RE = /^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$/;
const SUFFIX_RE = /^[A-Za-z0-9._-]+$/;

const $ = (id) => document.getElementById(id);
const form = $('repo-form');
const prefixSelect = $('repo-prefix');
const suffixInput = $('repo-suffix');
const nameGroup = $('name-group');
const nameHint = $('name-hint');
const workspaceSelect = $('workspace');
const purposeInput = $('purpose');
const alertBox = $('alert');

let repoBase = `https://github.com/${FALLBACK_REPOSITORY}`;

// Workspaces indexados por el value del <select>, y repositorios ya registrados (en minúsculas).
const workspaces = new Map();
let existingRepos = new Set();

function showAlert(type, html) {
  alertBox.className = `alert ${type}`;
  alertBox.innerHTML = html;
  alertBox.hidden = false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function repoName() {
  return prefixSelect.value + suffixInput.value.trim();
}

async function loadWorkspaces() {
  try {
    // Copia que publica sync_workspace.yml desde el repositorio donde vive workspace.yml.
    const res = await fetch('data/workspace.yml', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = jsyaml.load(await res.text()) || {};

    workspaceSelect.innerHTML = '<option value="">Selecciona un workspace…</option>';
    for (const [envName, env] of Object.entries(doc.environments || {})) {
      const group = document.createElement('optgroup');
      group.label = envName.toUpperCase();
      for (const ws of (env && env.workspaces) || []) {
        const value = `${envName}/${ws.name}`;
        workspaces.set(value, { ambiente: envName, name: ws.name });
        group.appendChild(new Option(ws.name, value));
        for (const repo of ws.equipos || []) existingRepos.add(String(repo).toLowerCase());
      }
      if (group.children.length) workspaceSelect.appendChild(group);
    }
    workspaceSelect.disabled = false;
  } catch (err) {
    workspaceSelect.innerHTML = '<option value="">No se pudo cargar workspace.yml</option>';
    showAlert('danger', `Error al leer <code>workspace.yml</code>: ${escapeHtml(err.message)}`);
  }
}

function validateName() {
  const suffix = suffixInput.value.trim();
  const name = repoName();
  let error = '';
  if (!suffix) error = 'Ingresa el nombre del repositorio.';
  else if (!SUFFIX_RE.test(suffix) || !REPO_NAME_RE.test(name)) error = 'Solo se permiten letras, números, ".", "_" o "-".';
  else if (name.length > 100) error = 'GitHub admite como máximo 100 caracteres.';
  else if (existingRepos.has(name.toLowerCase())) error = 'Este repositorio ya figura en workspace.yml.';
  return error;
}

function updateNamePreview() {
  const preview = suffixInput.value.trim() ? repoName() : `${prefixSelect.value}…`;
  nameGroup.classList.remove('is-invalid');
  nameHint.classList.remove('error-text');
  nameHint.innerHTML = `Usa letras, números, <code>.</code> <code>_</code> o <code>-</code>. Nombre final: <code>${escapeHtml(preview)}</code>`;
}

function validateForm() {
  const nameError = validateName();
  nameGroup.classList.toggle('is-invalid', Boolean(nameError));
  if (nameError) {
    nameHint.classList.add('error-text');
    nameHint.textContent = nameError;
  }

  const wsOk = Boolean(workspaceSelect.value);
  workspaceSelect.classList.toggle('is-invalid', !wsOk);
  $('workspace-error').hidden = wsOk;

  const purposeOk = Boolean(purposeInput.value.trim());
  purposeInput.classList.toggle('is-invalid', !purposeOk);
  $('purpose-error').hidden = purposeOk;

  return !nameError && wsOk && purposeOk;
}

// La solicitud se envía como un issue form prellenado: el usuario confirma con su
// sesión de GitHub y el workflow usa el secreto ORG_ADMIN_TOKEN, sin tokens en la página.
function buildIssueUrl() {
  const ws = workspaces.get(workspaceSelect.value);
  const name = repoName();
  const params = new URLSearchParams({
    template: CONFIG.issueTemplate,
    title: `[Crear repositorio] ${name}`,
    repo_name: name,
    ambiente: ws.ambiente,
    workspace: ws.name,
    proposito: purposeInput.value.trim(),
  });
  return `${repoBase}/issues/new?${params}`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  alertBox.hidden = true;
  if (!validateForm()) return;

  const url = buildIssueUrl();
  const opened = window.open(url, '_blank');
  if (opened) opened.opener = null;
  showAlert('success',
    `Se abrió GitHub con la solicitud para <strong>${escapeHtml(repoName())}</strong>. ` +
    'Confírmalo con <strong>Create</strong>; quedará abierto hasta que el aprobador lo cierre y el resultado se informará en el mismo issue. ' +
    (opened ? '' : `Si no se abrió, <a href="${escapeHtml(url)}" target="_blank" rel="noopener">abre la solicitud aquí</a>.`));
});

prefixSelect.addEventListener('change', updateNamePreview);
suffixInput.addEventListener('input', updateNamePreview);
workspaceSelect.addEventListener('change', () => {
  workspaceSelect.classList.remove('is-invalid');
  $('workspace-error').hidden = true;
});
purposeInput.addEventListener('input', () => {
  purposeInput.classList.remove('is-invalid');
  $('purpose-error').hidden = true;
  $('purpose-counter').textContent = `${purposeInput.value.length} / 350`;
});

(async () => {
  repoBase = `https://github.com/${await resolveRepository()}`;
  $('actions-link').href = `${repoBase}/actions/workflows/${CONFIG.workflowFile}`;
  await loadWorkspaces(); // habilita el formulario, ya con repoBase resuelto
})();
