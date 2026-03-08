#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS_TEMPLATE="${ROOT_DIR}/clients/config/typescript-README.md"
GO_TEMPLATE="${ROOT_DIR}/clients/config/go-README.md"
TS_README="${ROOT_DIR}/clients/typescript/README.md"
GO_README="${ROOT_DIR}/clients/go/README.md"
GO_MOD_FILE="${ROOT_DIR}/clients/go/go.mod"
GO_MODULE_PATH="${SEPURUX_GO_MODULE:-github.com/sepurux/go-sdk}"

cp "${TS_TEMPLATE}" "${TS_README}"
cp "${GO_TEMPLATE}" "${GO_README}"

if [ -f "${GO_MOD_FILE}" ]; then
  tmp_file="$(mktemp)"
  {
    printf "module %s\n" "${GO_MODULE_PATH}"
    tail -n +2 "${GO_MOD_FILE}"
  } > "${tmp_file}"
  mv "${tmp_file}" "${GO_MOD_FILE}"
fi
