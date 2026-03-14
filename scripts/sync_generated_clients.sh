#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS_TEMPLATE="${ROOT_DIR}/clients/config/typescript-README.md"
GO_TEMPLATE="${ROOT_DIR}/clients/config/go-README.md"
TS_README="${ROOT_DIR}/clients/typescript/README.md"
GO_README="${ROOT_DIR}/clients/go/README.md"
GO_MOD_FILE="${ROOT_DIR}/clients/go/go.mod"
GO_MODULE_PATH="${SEPURUX_GO_MODULE:-github.com/sepurux/sepurux-platform/clients/go}"
TS_RUNTIME_FILE="${ROOT_DIR}/clients/typescript/src/runtime.ts"
TS_PACKAGE_FILE="${ROOT_DIR}/clients/typescript/package.json"
GO_UTILS_FILE="${ROOT_DIR}/clients/go/utils.go"
GO_DOCS_DIR="${ROOT_DIR}/clients/go/docs"

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

if [ -f "${TS_RUNTIME_FILE}" ] && ! grep -q "OpenAPI Generator occasionally emits FromJSON/ToJSON" "${TS_RUNTIME_FILE}"; then
  perl -0pi -e 's/export function canConsumeForm\(consumes: Consume\[\]\): boolean \{/\/\/ OpenAPI Generator occasionally emits FromJSON\/ToJSON calls for free-form\n\/\/ object fields without generating matching helpers. Treat those values as\n\/\/ pass-through JSON so the client remains buildable and preserves payloads.\nexport function FromJSON<T = any>(value: T): T {\n    return value;\n}\n\nexport function ToJSON<T = any>(value: T): T {\n    return value;\n}\n\nexport function canConsumeForm(consumes: Consume\[\]): boolean \{/g' "${TS_RUNTIME_FILE}"
fi

if [ -f "${TS_PACKAGE_FILE}" ]; then
  perl -0pi -e 's/"description": "OpenAPI client for @sepurux\/client"/"description": "Generated TypeScript API client for Sepurux"/g; s/"author": "OpenAPI-Generator"/"author": "Sepurux"/g; s/"url": "https:\/\/github\.com\/GIT_USER_ID\/GIT_REPO_ID\.git"/"url": "https:\/\/github.com\/sepurux\/sepurux-platform.git",\n    "directory": "clients\/typescript"/g; s/"sideEffects": false,\n/"sideEffects": false,\n  "files": [\n    "dist",\n    "README.md"\n  ],\n  "publishConfig": {\n    "access": "public"\n  },\n/ if $_ !~ /"publishConfig"/s' "${TS_PACKAGE_FILE}"
fi

for ts_model in \
  "${ROOT_DIR}/clients/typescript/src/models/CounterfactualListItem.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/CounterfactualMetadata.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/PolicyEventListItem.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/ReplayAttemptDetail.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/RunMetadata.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/SecurityEventListItem.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/TraceMetadata.ts" \
  "${ROOT_DIR}/clients/typescript/src/models/TraceTimelineStep.ts"; do
  if [ -f "${ts_model}" ]; then
    perl -0pi -e "s/import \\{ mapValues \\} from '\\.\\.\\/runtime';/import { FromJSON, ToJSON, mapValues } from '..\\/runtime';/g" "${ts_model}"
  fi
done

if [ -f "${GO_UTILS_FILE}" ] && ! grep -q "type AnyOf map\\[string\\]interface{}" "${GO_UTILS_FILE}"; then
  perl -0pi -e 's#// PtrTime is helper routine that returns a pointer to given Time value\.\nfunc PtrTime\(v time\.Time\) \*time\.Time \{ return &v \}\n#// PtrTime is helper routine that returns a pointer to given Time value.\nfunc PtrTime(v time.Time) *time.Time { return \&v }\n\n// AnyOf represents free-form JSON object fields emitted by the generator.\ntype AnyOf map[string]interface{}\n\ntype NullableAnyOf struct {\n\tvalue *AnyOf\n\tisSet bool\n}\n\nfunc (v NullableAnyOf) Get() *AnyOf {\n\treturn v.value\n}\n\nfunc (v *NullableAnyOf) Set(val *AnyOf) {\n\tv.value = val\n\tv.isSet = true\n}\n\nfunc (v NullableAnyOf) IsSet() bool {\n\treturn v.isSet\n}\n\nfunc (v *NullableAnyOf) Unset() {\n\tv.value = nil\n\tv.isSet = false\n}\n\nfunc NewNullableAnyOf(val *AnyOf) *NullableAnyOf {\n\treturn \&NullableAnyOf{value: val, isSet: true}\n}\n\nfunc (v NullableAnyOf) MarshalJSON() ([]byte, error) {\n\treturn json.Marshal(v.value)\n}\n\nfunc (v *NullableAnyOf) UnmarshalJSON(src []byte) error {\n\tv.isSet = true\n\treturn json.Unmarshal(src, \&v.value)\n}\n#' "${GO_UTILS_FILE}"
fi

if [ -d "${GO_DOCS_DIR}" ]; then
  perl -0pi -e 's|github.com/sepurux/sepurux-platform"|github.com/sepurux/sepurux-platform/clients/go"|g' "${GO_DOCS_DIR}"/*.md
fi

if [ -f "${GO_MOD_FILE}" ]; then
  perl -0pi -e 's/\nrequire \(\n\)\n/\n/g' "${GO_MOD_FILE}"
fi

if [ -f "${GO_UTILS_FILE}" ]; then
  perl -0pi -e 's/\n?\z/\n/' "${GO_UTILS_FILE}"
fi
