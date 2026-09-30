"""Valida y modifica workspace.yml para el workflow create_repo.yml.

Subcomandos:
  check  Falla si el workspace no existe o si el repositorio ya figura en el archivo.
  add    Igual que check y luego inserta el repositorio en `equipos` del workspace.
  teams  Imprime (uno por línea) los slugs de `github_teams` del workspace.

La regla de negocio es que un repositorio aparece exactamente una vez en todas las
listas `equipos` del archivo. Los nombres de GitHub no distinguen mayúsculas, así
que la comparación tampoco.
"""

import argparse
import re
import sys
from pathlib import Path

from ruamel.yaml import YAML

REPO_NAME_RE = re.compile(r"^(Data-dbs-|lib-dbs-)[A-Za-z0-9._-]+$")


class WorkspaceError(Exception):
    pass


def make_yaml():
    yaml = YAML()  # round-trip: conserva comentarios, orden y comillas
    yaml.preserve_quotes = True
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.width = 4096
    return yaml


def iter_workspaces(doc):
    environments = (doc or {}).get("environments") or {}
    for env_name, env in environments.items():
        for ws in (env or {}).get("workspaces") or []:
            yield env_name, ws


def find_workspace(doc, ambiente, workspace):
    matches = [
        ws
        for env_name, ws in iter_workspaces(doc)
        if env_name == ambiente and ws.get("name") == workspace
    ]
    if not matches:
        raise WorkspaceError(f"No existe el workspace '{workspace}' en el ambiente '{ambiente}'.")
    if len(matches) > 1:
        raise WorkspaceError(f"El workspace '{workspace}' está duplicado en el ambiente '{ambiente}'.")
    return matches[0]


def find_repo(doc, repo):
    """Devuelve la lista de 'ambiente/workspace' donde figura el repositorio."""
    target = repo.casefold()
    return [
        f"{env_name}/{ws.get('name')}"
        for env_name, ws in iter_workspaces(doc)
        for item in ws.get("equipos") or []
        if isinstance(item, str) and item.casefold() == target
    ]


def validate(doc, ambiente, workspace, repo):
    if not REPO_NAME_RE.match(repo):
        raise WorkspaceError(
            f"El nombre '{repo}' no cumple la nomenclatura: debe empezar por Data-dbs- o lib-dbs-."
        )
    ws = find_workspace(doc, ambiente, workspace)
    found = find_repo(doc, repo)
    if found:
        raise WorkspaceError(f"El repositorio '{repo}' ya figura en workspace.yml: {', '.join(found)}.")
    return ws


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["check", "add", "teams"])
    parser.add_argument("--file", default="workspace.yml", type=Path)
    parser.add_argument("--ambiente", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--repo", help="Obligatorio para check y add")
    args = parser.parse_args(argv)

    yaml = make_yaml()
    doc = yaml.load(args.file.read_text(encoding="utf-8"))

    try:
        if args.command == "teams":
            ws = find_workspace(doc, args.ambiente, args.workspace)
            for team in ws.get("github_teams") or []:
                print(team)
            return 0

        if not args.repo:
            parser.error("--repo es obligatorio para check y add")

        ws = validate(doc, args.ambiente, args.workspace, args.repo)
        if args.command == "check":
            print(f"OK: '{args.repo}' no figura en {args.file}.")
            return 0

        if ws.get("equipos") is None:
            ws["equipos"] = []
        ws["equipos"].append(args.repo)

        found = find_repo(doc, args.repo)
        if len(found) != 1:
            raise WorkspaceError(f"Tras la inserción '{args.repo}' aparece {len(found)} veces; no se guarda.")

        with args.file.open("w", encoding="utf-8", newline="\n") as fh:
            yaml.dump(doc, fh)
        print(f"OK: '{args.repo}' agregado a {found[0]}.")
        return 0
    except WorkspaceError as exc:
        print(f"::error::{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
