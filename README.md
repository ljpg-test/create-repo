# create-repo

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla y registrarlos en `workspace.yml`.

`workspace.yml` vive en otro repositorio (por defecto `ljpg-test/lib-dbs-test-creacion`). Este repositorio solo guarda una copia en `data/workspace.yml` para que la página pueda leerla; no la edites a mano, se sobrescribe.

## Cómo funciona

1. La página (`index.html`, `app.js`, `styles.css` en GitHub Pages) lee `data/workspace.yml`, valida el formulario y, con **Crear issue**, abre en GitHub un issue **Crear repositorio** ya completado. El usuario lo confirma con su sesión de GitHub: la página no pide ni maneja tokens.
2. **Issue abierto** → `.github/workflows/create_repo.yml` valida la solicitud (formato del nombre, que no exista en GitHub ni en `workspace.yml`), asigna el issue a los aprobadores y comenta el resultado. No crea nada y el issue queda abierto. Si la validación falla, se cierra como *not planned*.
3. **Aprobación:**
   - un aprobador cierra el issue como **Completed** (si lo cierra otra persona, se reabre);
   - el workflow revalida y espera la aprobación del environment `creacion`, que avisa por correo a sus revisores obligatorios.
   - **Close as not planned** rechaza la solicitud sin ejecutar nada.
4. **Creación:** crea el repositorio desde la plantilla con el propósito como descripción, da permisos a los equipos (`github_teams`) del workspace, inserta el repositorio en `workspace.yml` del repositorio de configuración (commit y push) y actualiza la copia de la página. El resultado se comenta en el issue; si falla, el issue se reabre para volver a intentarlo.

También se puede lanzar a mano desde Actions (`workflow_dispatch`): valida y crea directamente, pasando por el environment `creacion`.

`.github/workflows/sync_workspace.yml` refresca `data/workspace.yml` cada hora, tras cada creación y a mano desde Actions, para que la página refleje cambios hechos directamente en el repositorio de configuración.

Todas las operaciones sobre la organización y sobre el repositorio de configuración usan el secreto `ORG_ADMIN_TOKEN`.

## Configuración (una sola vez, en este repositorio)

| Dónde | Nombre | Valor |
|---|---|---|
| Settings → Environments | `creacion` | Activar **Required reviewers** y agregar la cuenta de GitHub que debe aprobar (recibe el correo en la dirección de esa cuenta). |
| Settings → Secrets → Actions (del repositorio o de la organización) | `ORG_ADMIN_TOKEN` | PAT classic con scopes `repo` y `admin:org`: crear repositorios, asignar permisos de equipos y leer/escribir el repositorio de `workspace.yml`. Pega solo el valor (`ghp_...`), sin espacios ni saltos de línea. Si la organización usa SSO, autoriza el token para ella. |
| Settings → Variables → Actions | `TEMPLATE_REPO` | Repositorio plantilla, `owner/nombre` (o solo `nombre` si está en la organización destino). Debe estar marcado como *Template repository*. |
| Settings → Variables → Actions | `APROBADORES` *(opcional)* | Usuarios de GitHub que pueden aprobar cerrando el issue, separados por coma. Por defecto `ljpgluisjop`. Deben tener acceso a este repositorio para poder asignarles el issue. |
| Settings → Variables → Actions | `WORKSPACE_REPO` *(opcional)* | Repositorio donde vive `workspace.yml`. Por defecto `ljpg-test/lib-dbs-test-creacion`. |
| Settings → Variables → Actions | `WORKSPACE_FILE` / `WORKSPACE_BRANCH` *(opcionales)* | Ruta del archivo (por defecto `data/workspace.yml`) y rama (por defecto, la rama principal de ese repositorio). |
| Settings → Variables → Actions | `TARGET_ORG` *(opcional)* | Organización donde se crean los repositorios. Por defecto, el dueño de este repositorio. |
| Settings → Variables → Actions | `NEW_REPO_VISIBILITY` *(opcional)* | `private` (por defecto), `internal` (GitHub Enterprise) o `public`. |
| Settings → Variables → Actions | `TEAM_PERMISSION` *(opcional)* | Permiso para los equipos (`pull`, `triage`, `push`, `maintain`, `admin`). Por defecto `push` (lectura/escritura). |
| Settings → General → Features | Issues | Deben estar habilitados. |
| Settings → Pages | — | Publicar desde la rama `main`, carpeta `/ (root)`. |

Si la rama del repositorio de configuración está protegida, el dueño de `ORG_ADMIN_TOKEN` debe poder hacer push en ella.

Ten en cuenta que, si este repositorio o su página son públicos, `data/workspace.yml` (URLs de Databricks, AppId, catálogos, nombres de secretos) también lo es.

## Uso con repositorios privados

El código funciona igual con este repositorio, el de `workspace.yml` y la plantilla en privado. Lo que cambia son requisitos del plan de GitHub y de configuración:

- **Secreto de organización:** si `ORG_ADMIN_TOKEN` se define a nivel de organización, en su *Repository access* debe estar incluido este repositorio. En el plan Free, los secretos de organización no están disponibles para repositorios privados; en ese caso, defínelo como secreto del repositorio.
- **GitHub Pages:** publicar Pages desde un repositorio privado requiere GitHub Pro, Team o Enterprise. Para que la página solo la vean miembros de la organización, configúrala como **Private** en Settings → Pages (requiere GitHub Enterprise Cloud); si no, la página y `data/workspace.yml` son públicos aunque el repositorio sea privado. Con Pages privado la URL es del tipo `https://<aleatorio>.pages.github.io/`; la página obtiene el repositorio orquestador de `data/config.json` (lo genera `sync_workspace.yml`), así que no hay que configurar nada.
- **Environment `creacion`:** en repositorios privados, los *required reviewers* solo se aplican con GitHub Enterprise. En otros planes el job no espera esa segunda aprobación, así que la única aprobación es cerrar el issue como *Completed* (que el workflow restringe a `APROBADORES`).
- **Visibilidad de los repositorios nuevos:** `private` por defecto; con GitHub Enterprise puedes usar `internal` (variable `NEW_REPO_VISIBILITY`).
- **Acceso de los usuarios:** quien solicita debe tener acceso a este repositorio para abrir el issue, y los aprobadores para que se les asigne.
- **Minutos de Actions:** en repositorios privados las ejecuciones consumen minutos del plan.

## workspace.yml

Cada workspace declara `equipos` (los repositorios asociados) y `github_teams` (los slugs de los equipos que reciben permiso en los repositorios nuevos). Un repositorio solo puede aparecer una vez en todo el archivo; la comparación no distingue mayúsculas.

Validar o insertar a mano:

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --file workspace.yml --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py add   --file workspace.yml --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-nuevo
python scripts/workspace_repos.py teams --file workspace.yml --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC
```

Para probar la página en local, sírvela por HTTP (por ejemplo `npx serve .`); abierta como `file://` no puede leer `data/workspace.yml`.
