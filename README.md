# create-repo

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla y registrarlos en `workspace.yml`.

## Cómo funciona

1. `index.html` + `app.js` (GitHub Pages) leen `workspace.yml`, muestran el formulario y, con el PAT del usuario, disparan `workflow_dispatch` sobre `.github/workflows/create_repo.yml`.
2. El job **validar** revisa el formato del nombre, verifica que el repositorio no exista en GitHub y que no figure en `workspace.yml`.
3. El job **crear** usa el environment `creacion`. GitHub envía un correo a sus revisores obligatorios y espera la aprobación antes de:
   - revalidar `workspace.yml`,
   - crear el repositorio desde la plantilla con el propósito como descripción,
   - dar permisos a los equipos (`github_teams`) del workspace,
   - insertar el repositorio en `equipos` del workspace (`scripts/workspace_repos.py`),
   - hacer commit y push de `workspace.yml`.

## Configuración (una sola vez, en este repositorio)

| Dónde | Nombre | Valor |
|---|---|---|
| Settings → Environments | `creacion` | Activar **Required reviewers** y agregar la cuenta de GitHub que debe aprobar (recibe el correo en la dirección de esa cuenta). |
| Settings → Secrets → Actions | `ORG_ADMIN_TOKEN` | PAT (o token de GitHub App) con permiso para crear repositorios en la organización destino y administrar los permisos de equipos sobre repositorios (`repo` + `admin:org`). |
| Settings → Variables → Actions | `TEMPLATE_REPO` | Repositorio plantilla, `owner/nombre` (o solo `nombre` si está en la organización destino). Debe estar marcado como *Template repository*. |
| Settings → Variables → Actions | `TARGET_ORG` *(opcional)* | Organización donde se crean los repositorios. Por defecto, el dueño de este repositorio. |
| Settings → Variables → Actions | `NEW_REPO_VISIBILITY` *(opcional)* | `public` para repos públicos; cualquier otro valor o vacío = privado. |
| Settings → Variables → Actions | `TEAM_PERMISSION` *(opcional)* | Permiso para los equipos (`pull`, `triage`, `push`, `maintain`, `admin`). Por defecto `push` (lectura/escritura). |
| Settings → Pages | — | Publicar desde la rama `main`, carpeta `/ (root)`. |

Si `main` está protegida, permite que `github-actions[bot]` haga push o el último paso fallará.

Los equipos de GitHub solo existen en organizaciones: en una cuenta personal el paso de permisos falla si el workspace declara `github_teams`.

## workspace.yml

Cada workspace declara `equipos` (los repositorios asociados) y `github_teams` (los slugs de los equipos que reciben permiso en los repositorios nuevos). Un repositorio solo puede aparecer una vez en todo el archivo; la comparación no distingue mayúsculas.

Validar o insertar a mano:

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py add   --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py teams --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC
```

Para probar el frontend en local, sírvelo por HTTP (por ejemplo `npx serve .`); abierto como `file://` no puede leer `workspace.yml`.
