"""Extrae los campos del issue form crear-repositorio.yml y los escribe en $GITHUB_OUTPUT.

GitHub renderiza cada campo del formulario como "### <label>" seguido del valor;
los campos vacíos aparecen como "_No response_". El cuerpo del issue se lee de la
variable de entorno ISSUE_BODY.
"""

import os
import re
import sys

# label del issue form -> nombre del output (igual que los inputs de workflow_dispatch)
FIELDS = {
    "Nombre del repositorio": "repo_name",
    "Ambiente": "ambiente",
    "Workspace": "workspace",
    "Uso del repositorio": "proposito",
}

HEADING_RE = re.compile(r"^###\s+(.+?)\s*$", re.MULTILINE)


def parse(body):
    parts = HEADING_RE.split(body.replace("\r\n", "\n"))
    # parts = [antes, label1, valor1, label2, valor2, ...]
    values = {}
    for label, value in zip(parts[1::2], parts[2::2]):
        key = FIELDS.get(label)
        if key:
            value = value.strip()
            values[key] = "" if value == "_No response_" else value
    return values


def main():
    values = parse(os.environ.get("ISSUE_BODY", ""))
    missing = [label for label, key in FIELDS.items() if not values.get(key)]
    if missing:
        print(f"::error::Faltan campos en el issue: {', '.join(missing)}.", file=sys.stderr)
        return 1

    values["proposito"] = " ".join(values["proposito"].split())  # una sola línea
    multiline = [key for key, value in values.items() if "\n" in value]
    if multiline:
        print(f"::error::Los campos {', '.join(multiline)} deben ocupar una sola línea.", file=sys.stderr)
        return 1

    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
        for key, value in values.items():
            out.write(f"{key}={value}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
