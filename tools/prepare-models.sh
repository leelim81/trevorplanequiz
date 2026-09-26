#!/usr/bin/env bash
# Downloads every plane model listed in tools/models.json, converts the glTF 1.0 ones to 2.0,
# and shrinks them into assets/models/<id>.glb. Safe to re-run: finished files are skipped.
# Usage: ./tools/prepare-models.sh [id ...]      (no args = all)
set -uo pipefail
cd "$(dirname "$0")/.."
RAW=tools/raw-models
export RAW
mkdir -p "$RAW" assets/models tools/logs

BIN=tools/node_modules/.bin
if [ ! -x "$BIN/gltf-pipeline" ] || [ ! -x "$BIN/gltf-transform" ]; then
  echo "installing model tools (one time)…"
  npm install --silent --no-save --prefix tools gltf-pipeline @gltf-transform/cli >/dev/null 2>&1 || {
    echo "npm install failed"; exit 1; }
fi

# "id url legacy" for every model that has a source (no field contains a space)
node -e '
const m = require("./tools/models.json");
for (const e of m) if (e.src) console.log(e.id, e.src, e.legacy ? 1 : 0);
' > "$RAW/manifest.txt"

if [ $# -gt 0 ]; then
  pat=$(printf '%s\n' "$@" | paste -sd'|' -)
  grep -E "^($pat) " "$RAW/manifest.txt" > "$RAW/todo.txt"
else
  cp "$RAW/manifest.txt" "$RAW/todo.txt"
fi

prepare_one() {
  local id="$1" url="$2" legacy="$3"
  local out="assets/models/$id.glb"
  [ -s "$out" ] && { echo "skip    $id"; return 0; }
  local ext=glb; case "$url" in *.gltf) ext=gltf;; esac
  local src="$RAW/$id-src.$ext"
  if [ ! -s "$src" ]; then
    curl -sSfL -A trevorplanequiz "$url" -o "$src" || { echo "FAIL dl $id"; return 1; }
  fi
  # Some upstream files contain bare NaN in their JSON, which no glTF loader accepts.
  local clean="$RAW/$id-clean.glb"
  if [ "$ext" = "glb" ] && node tools/sanitize-glb.mjs "$src" "$clean" 2>>"tools/logs/$id.sanitize.log"; then
    src="$clean"
  fi
  local work="$src"
  if [ "$legacy" = "1" ]; then
    work="$RAW/$id-v2.glb"
    [ -s "$work" ] || tools/node_modules/.bin/gltf-pipeline -i "$src" -o "$work" -b >/dev/null 2>"tools/logs/$id.convert.log" || {
      echo "FAIL conv $id"; return 1; }
  fi
  if tools/node_modules/.bin/gltf-transform optimize "$work" "$out" \
       --compress false --texture-compress webp --texture-size 512 \
       --simplify-ratio 0.5 --simplify-error 0.001 >/dev/null 2>"tools/logs/$id.opt.log"; then
    echo "ok      $id ($(du -h "$out" | cut -f1))"
  else
    cp "$work" "$out" && echo "raw     $id (optimise failed, see tools/logs/$id.opt.log)"
  fi
}
export -f prepare_one

xargs -P 4 -n 3 bash -c 'prepare_one "$1" "$2" "$3"' _ < "$RAW/todo.txt"

echo "--- assets/models:"
ls assets/models | wc -l
du -sh assets/models
