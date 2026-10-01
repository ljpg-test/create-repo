# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este no es un proyecto de Salesforce: la carpeta `.sf/` es ajena al proyecto (está en `.gitignore`); no uses ni sugieras el CLI `sf`.

## Qué es

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla. Flujo: página estática → issue form prellenado → validación y asignación al aprobador → el aprobador cierra el issue como *Completed* → aprobación del environment `creacion` → creación. Ver README para la configuración en GitHub.

- **`workspace.yml` no vive aquí**: la fuente es otro repositorio (`vars.WORKSPACE_REPO`, por defecto `ljpg-test/lib-dbs-test-cracion`). `data/workspace.yml` es una copia generada por `sync_workspace.yml` solo para la página; nunca la uses como fuente ni la edites.
- `index.html` + `app.js` + `styles.css`: sitio de GitHub Pages sin build. Lee `data/workspace.yml` (js-yaml por CDN) y abre `issues/new?template=crear-repositorio.yml&<campo>=<valor>`. **La página no maneja tokens** por decisión explícita: todo acceso a la organización lo hace el workflow con el secreto `ORG_ADMIN_TOKEN`. El repositorio orquestador sale de `data/config.json` (generado por `sync_workspace.yml`), porque la solución debe funcionar con repositorios y Pages privados, donde la URL (`*.pages.github.io` o dominio propio) no lo revela; luego de `<owner>.github.io/<repo>` y por último `FALLBACK_REPOSITORY`.
- `.github/ISSUE_TEMPLATE/crear-repositorio.yml`: issue form; los `id` de sus campos son los parámetros que prellena la página.
- `.github/workflows/create_repo.yml`: `issues: [opened, closed]` (título con prefijo `[Crear repositorio]`) o `workflow_dispatch`. Jobs `preparar` → `validar` → `crear` (solo en `closed` como completed o en dispatch; `environment: creacion`) → `publicar` (llama a `sync_workspace.yml`) y `notificar` (comenta, cierra o reabre el issue según fase y resultado). Al abrir el issue solo valida y asigna; un cierre por alguien fuera de `vars.APROBADORES` hace fallar `preparar` y el issue se reabre.
- `.github/workflows/sync_workspace.yml`: copia el `workspace.yml` fuente a `data/workspace.yml` y genera `data/config.json` (cron horario, manual y `workflow_call`).
- El destino real son organizaciones con repositorios **privados**: no introduzcas nada que dependa de que un repositorio o la página sean públicos (p. ej. leer `raw.githubusercontent.com` desde el navegador).
- `scripts/issue_form.py`: convierte el cuerpo del issue (`### <label>` + valor) en outputs. Mapea por **label**, así que un cambio de label en el issue form debe reflejarse en `FIELDS`.
- `scripts/workspace_repos.py` (ruamel.yaml round-trip para conservar comentarios y formato): subcomandos `check`, `add` y `teams`; en el workflow siempre con `--file ws/$WORKSPACE_FILE` (checkout del repo fuente en `ws/`).

## Invariantes

- Los nombres `repo_name`, `ambiente`, `workspace`, `proposito` se repiten en `app.js` (parámetros de la URL), los `id` del issue form, `FIELDS` de `issue_form.py`, los inputs de `workflow_dispatch` y los outputs del job `preparar`. Si cambias uno, cambia todos.
- La regex del nombre `^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$` está duplicada en `app.js`, en el workflow y en `workspace_repos.py`.
- En `workspace.yml`, `equipos` lista **repositorios** (no equipos de GitHub). Los equipos que reciben permisos van en `github_teams` (slugs). Un repositorio aparece una sola vez en todas las listas `equipos`, sin distinguir mayúsculas.
- El cuerpo del issue lo controla el usuario (y puede editarse entre apertura y cierre): los datos llegan a los scripts por `env:`, nunca interpolados con `${{ }}` dentro de `run:`; los outputs deben ser de una sola línea; las validaciones se repiten al cerrar.
- No hay `concurrency` en `create_repo.yml`: el push a `workspace.yml` reintenta partiendo de la rama remota (`reset --hard` + `add` + push).

## Comandos

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --file data/workspace.yml --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-x
node --check app.js          # sintaxis del frontend
npx serve .                  # probar la página en local (file:// no puede leer data/workspace.yml)
```

No hay suite de tests ni linter configurados. En este equipo no hay Python instalado; los workflows solo se pueden probar en GitHub.
