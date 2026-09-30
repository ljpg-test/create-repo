// Repositorio orquestador que contiene create_repo.yml. En GitHub Pages
// (<owner>.github.io/<repo>/) se deduce de la URL; si no, se usan los valores fijos.
const CONFIG = (() => {
  const fallback = { owner: 'ljpgluisjop', repo: 'create-repo' };
  const host = window.location.hostname;
  const firstPath = window.location.pathname.split('/').filter(Boolean)[0];
  const detected = host.endsWith('.github.io') && firstPath
    ? { owner: host.replace('.github.io', ''), repo: firstPath }
    : fallback;
  return { ...detected, workflowFile: 'create_repo.yml', ref: 'main' };
})();

const REPO_NAME_RE = /^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$/;

const form = document.getElementById('repo-form');
const repoInput = document.getElementById('repo-name');
const repoError = document.getElementById('repo-name-error');
const workspaceSelect = document.getElementById('workspace');
const purposeInput = document.getElementById('purpose');
const patInput = document.getElementById('pat');
const submitBtn = document.getElementById('submit-btn');
const spinner = document.getElementById('spinner');
const alertBox = document.getElementById('alert');

// Repositorios ya registrados en workspace.yml (en minúsculas) para avisar antes de disparar el workflow.
let existingRepos = new Set();

function showAlert(type, html) {
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadWorkspaces() {
  try {
    const res = await fetch('workspace.yml', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = jsyaml.load(await res.text()) || {};

    workspaceSelect.innerHTML = '<option value="">Selecciona un workspace…</option>';
    existingRepos = new Set();

    for (const [envName, env] of Object.entries(doc.environments || {})) {
      const group = document.createElement('optgroup');
      group.label = envName.toUpperCase();
      for (const ws of (env && env.workspaces) || []) {
        const option = document.createElement('option');
        option.value = JSON.stringify({ ambiente: envName, workspace: ws.name });
        option.textContent = ws.name;
        group.appendChild(option);
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

function validateRepoName(name) {
  if (!name) return 'Ingresa el nombre del repositorio.';
  if (!REPO_NAME_RE.test(name)) {
    return 'Debe comenzar por Data-dbs- o lib-dbs- y solo usar letras, números, ".", "_" o "-".';
  }
  if (name.length > 100) return 'GitHub admite como máximo 100 caracteres.';
  if (existingRepos.has(name.toLowerCase())) return 'Este repositorio ya figura en workspace.yml.';
  return '';
}

function validateForm() {
  let valid = true;
  const setValidity = (el, ok) => {
    el.classList.toggle('is-invalid', !ok);
    if (!ok) valid = false;
  };

  const nameError = validateRepoName(repoInput.value.trim());
  repoError.textContent = nameError;
  setValidity(repoInput, !nameError);
  setValidity(workspaceSelect, Boolean(workspaceSelect.value));
  setValidity(purposeInput, Boolean(purposeInput.value.trim()));
  setValidity(patInput, Boolean(patInput.value.trim()));
  return valid;
}

async function dispatchWorkflow(inputs, token) {
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/actions/workflows/${CONFIG.workflowFile}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: CONFIG.ref, inputs }),
  });
  if (res.status === 204) return;

  let detail = '';
  try { detail = (await res.json()).message || ''; } catch { /* respuesta sin cuerpo */ }
  const hints = {
    401: 'El token es inválido o expiró.',
    403: 'El token no tiene permisos suficientes (se requieren los scopes repo y workflow).',
    404: 'No se encontró el workflow o el token no tiene acceso al repositorio orquestador.',
    422: 'GitHub rechazó los parámetros enviados.',
  };
  throw new Error(`${hints[res.status] || `Error HTTP ${res.status}.`} ${detail}`.trim());
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertBox.className = 'alert d-none';
  if (!validateForm()) return;

  const { ambiente, workspace } = JSON.parse(workspaceSelect.value);
  const inputs = {
    repo_name: repoInput.value.trim(),
    ambiente,
    workspace,
    proposito: purposeInput.value.trim(),
  };

  submitBtn.disabled = true;
  spinner.classList.remove('d-none');
  try {
    await dispatchWorkflow(inputs, patInput.value.trim());
    const runsUrl = `https://github.com/${CONFIG.owner}/${CONFIG.repo}/actions/workflows/${CONFIG.workflowFile}`;
    showAlert('success',
      `Solicitud enviada para <strong>${escapeHtml(inputs.repo_name)}</strong>. ` +
      'Tras las validaciones, el aprobador del environment <code>creacion</code> recibirá un correo para aprobar la creación. ' +
      `<a href="${runsUrl}" target="_blank" rel="noopener">Ver la ejecución</a>.`);
    form.reset();
  } catch (err) {
    showAlert('danger', escapeHtml(err.message));
  } finally {
    patInput.value = '';
    submitBtn.disabled = false;
    spinner.classList.add('d-none');
  }
});

repoInput.addEventListener('input', () => repoInput.classList.remove('is-invalid'));
loadWorkspaces();
