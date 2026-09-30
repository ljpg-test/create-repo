# create-repo

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla y registrarlos en `workspace.yml`.

## Cómo funciona

1. La página (`index.html`, `app.js`, `styles.css` en GitHub Pages) lee `workspace.yml`, valida el formulario y abre en GitHub un issue **Crear repositorio** ya completado. El usuario lo confirma con su sesión de GitHub: la página no pide ni maneja tokens.
2. Al abrirse el issue se ejecuta `.github/workflows/create_repo.yml` (también se puede lanzar a mano desde Actions con `workflow_dispatch`):
   - **preparar:** comprueba que el autor sea miembro o colaborador, extrae los campos del issue (`scripts/issue_form.py`) y comenta que la solicitud fue recibida.
   - **validar:** verifica el secreto `ORG_ADMIN_TOKEN`, el formato del nombre, que el repositorio no exista en GitHub y que no figure en `workspace.yml`.
   - **crear** (environment `creacion`): GitHub envía un correo a los revisores obligatorios y espera la aprobación. Luego crea el repositorio desde la plantilla con el propósito como descripción, da permisos a los equipos (`github_teams`) del workspace y lo inserta en `equipos` de `workspace.yml` con commit y push.
   - **notificar:** comenta el resultado en el issue y lo cierra.

Todas las operaciones sobre la organización usan el secreto `ORG_ADMIN_TOKEN` del repositorio.

## Configuración (una sola vez, en este repositorio)

| Dónde | Nombre | Valor |
|---|---|---|
| Settings → Environments | `creacion` | Activar **Required reviewers** y agregar la cuenta de GitHub que debe aprobar (recibe el correo en la dirección de esa cuenta). |
| Settings → Secrets → Actions | `ORG_ADMIN_TOKEN` | PAT classic con scopes `repo` y `admin:org` (crear repositorios y asignar permisos de equipos en la organización destino). Pega solo el valor (`ghp_...`), sin espacios ni saltos de línea. Si el token vence, actualiza el secreto. Si la organización usa SSO, autoriza el token para ella. |
| Settings → Variables → Actions | `TEMPLATE_REPO` | Repositorio plantilla, `owner/nombre` (o solo `nombre` si está en la organización destino). Debe estar marcado como *Template repository*. |
| Settings → Variables → Actions | `TARGET_ORG` *(opcional)* | Organización donde se crean los repositorios. Por defecto, el dueño de este repositorio. |
| Settings → Variables → Actions | `NEW_REPO_VISIBILITY` *(opcional)* | `public` para repos públicos; cualquier otro valor o vacío = privado. |
| Settings → Variables → Actions | `TEAM_PERMISSION` *(opcional)* | Permiso para los equipos (`pull`, `triage`, `push`, `maintain`, `admin`). Por defecto `push` (lectura/escritura). |
| Settings → General → Features | Issues | Deben estar habilitados. |
| Settings → Pages | — | Publicar desde la rama `main`, carpeta `/ (root)`. |

Si `main` está protegida, permite que `github-actions[bot]` haga push o el último paso de **crear** fallará.

## workspace.yml

Cada workspace declara `equipos` (los repositorios asociados) y `github_teams` (los slugs de los equipos que reciben permiso en los repositorios nuevos). Un repositorio solo puede aparecer una vez en todo el archivo; la comparación no distingue mayúsculas.

Validar o insertar a mano:

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py add   --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py teams --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC
```

Para probar la página en local, sírvela por HTTP (por ejemplo `npx serve .`); abierta como `file://` no puede leer `workspace.yml`.
