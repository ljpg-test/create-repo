// Repositorio orquestador (contiene el issue form y create_repo.yml). En GitHub
// Pages (<owner>.github.io/<repo>/) se deduce de la URL; si no, se usan los valores fijos.
const CONFIG = (() => {
  const fallback = { owner: 'ljpg-test', repo: 'create-repo' };
  const host = window.location.hostname;
  const firstPath = window.location.pathname.split('/').filter(Boolean)[0];
  const detected = host.endsWith('.github.io') && firstPath
    ? { owner: host.replace('.github.io', ''), repo: firstPath }
    : fallback;
  return { ...detected, issueTemplate: 'crear-repositorio.yml', workflowFile: 'create_repo.yml' };
})();

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

const repoBase = `https://github.com/${CONFIG.owner}/${CONFIG.repo}`;
$('actions-link').href = `${repoBase}/actions/workflows/${CONFIG.workflowFile}`;

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
    const res = await fetch('workspace.yml', { cache: 'no-store' });
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
    'Confirma con <strong>Create</strong>; el resultado se informará en el mismo issue. ' +
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

loadWorkspaces();
