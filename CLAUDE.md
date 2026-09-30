# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este no es un proyecto de Salesforce: la carpeta `.sf/` es ajena al proyecto (está en `.gitignore`); no uses ni sugieras el CLI `sf`.

## Qué es

Utilitario para crear repositorios `Data-dbs-*` / `lib-dbs-*` desde una plantilla. Tres piezas que deben mantenerse coherentes entre sí:

- `index.html` + `app.js`: sitio estático de GitHub Pages sin build. Lee `workspace.yml` por `fetch` relativo (js-yaml por CDN) y dispara `workflow_dispatch` con el PAT del usuario. El dueño y repo del orquestador se deducen de la URL `*.github.io`, con respaldo fijo en `CONFIG`.
- `.github/workflows/create_repo.yml`: job `validar` (sin aprobación) → job `crear` con `environment: creacion`, cuyos revisores obligatorios reciben el correo de aprobación. Usa el secreto `ORG_ADMIN_TOKEN` y las variables `TEMPLATE_REPO`, `TARGET_ORG`, `NEW_REPO_VISIBILITY` y `TEAM_PERMISSION` (ver README).
- `scripts/workspace_repos.py` (ruamel.yaml round-trip para conservar comentarios y formato): subcomandos `check`, `add` y `teams`.

## Invariantes

- Los inputs del workflow (`repo_name`, `ambiente`, `workspace`, `proposito`) se nombran igual en `app.js`, en el workflow y en los argumentos del script. Si cambias uno, cambia los tres.
- La regex del nombre `^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$` está duplicada en `app.js`, en el workflow y en el script.
- En `workspace.yml`, `equipos` lista **repositorios** (no equipos de GitHub). Los equipos que reciben permisos van en `github_teams` (slugs). Un repositorio aparece una sola vez en todas las listas `equipos`, sin distinguir mayúsculas.
- Los inputs se pasan a los scripts del workflow por `env:`, nunca interpolados con `${{ }}` dentro de `run:` (evita inyección).
- `concurrency: create-repo` serializa las ejecuciones para que no haya ediciones concurrentes de `workspace.yml`.

## Comandos

```bash
pip install -r scripts/requirements.txt
python scripts/workspace_repos.py check --ambiente dsr --workspace Workspace_InnovDataAnalytics_UC --repo Data-dbs-x
node --check app.js          # sintaxis del frontend
npx serve .                  # probar el frontend en local (file:// no puede leer workspace.yml)
```

No hay suite de tests ni linter configurados.
