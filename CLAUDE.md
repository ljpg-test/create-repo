# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este no es un proyecto de Salesforce: la carpeta `.sf/` es ajena al proyecto (está en `.gitignore`); no uses ni sugieras el CLI `sf`.

## Qué es

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla. Flujo: página estática → issue form prellenado → workflow → aprobación → creación. Ver README para la configuración del repositorio en GitHub.

- `index.html` + `app.js` + `styles.css`: sitio de GitHub Pages sin build. Lee `workspace.yml` por `fetch` relativo (js-yaml por CDN) y abre `issues/new?template=crear-repositorio.yml&<campo>=<valor>`. **La página no maneja tokens** por decisión explícita: todo acceso a la organización lo hace el workflow con el secreto `ORG_ADMIN_TOKEN`. El dueño y repo del orquestador se deducen de la URL `*.github.io`, con respaldo fijo en `CONFIG` (`ljpg-test/create-repo`).
- `.github/ISSUE_TEMPLATE/crear-repositorio.yml`: issue form; los `id` de sus campos son los parámetros que prellena la página.
- `.github/workflows/create_repo.yml`: se dispara con `issues: opened` (título con prefijo `[Crear repositorio]`) o `workflow_dispatch`. Jobs `preparar` → `validar` → `crear` (con `environment: creacion`, cuyos revisores reciben el correo de aprobación) → `notificar` (comenta y cierra el issue).
- `scripts/issue_form.py`: convierte el cuerpo del issue (`### <label>` + valor) en outputs. Mapea por **label**, así que un cambio de label en el issue form debe reflejarse en `FIELDS`.
- `scripts/workspace_repos.py` (ruamel.yaml round-trip para conservar comentarios y formato): subcomandos `check`, `add` y `teams`.

## Invariantes

- Los nombres `repo_name`, `ambiente`, `workspace`, `proposito` se repiten en `app.js` (parámetros de la URL), los `id` del issue form, `FIELDS` de `issue_form.py`, los inputs de `workflow_dispatch` y los outputs del job `preparar`. Si cambias uno, cambia todos.
- La regex del nombre `^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$` está duplicada en `app.js`, en el workflow y en `workspace_repos.py`.
- En `workspace.yml`, `equipos` lista **repositorios** (no equipos de GitHub). Los equipos que reciben permisos van en `github_teams` (slugs). Un repositorio aparece una sola vez en todas las listas `equipos`, sin distinguir mayúsculas.
- El cuerpo del issue lo controla el usuario: los datos llegan a los scripts por `env:`, nunca interpolados con `${{ }}` dentro de `run:`, y los outputs deben ser de una sola línea.
- No hay `concurrency`: el paso final de `crear` reintenta partiendo de la rama remota (`reset --hard` + `add` + push) si otra ejecución publicó antes.

## Comandos

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-x
node --check app.js          # sintaxis del frontend
npx serve .                  # probar la página en local (file:// no puede leer workspace.yml)
```

No hay suite de tests ni linter configurados. En este equipo no hay Python instalado; el workflow solo se puede probar en GitHub.
