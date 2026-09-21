#!/usr/bin/env bash
# Downloads the 10 plane models, converts the two glTF 1.0 files to 2.0, and
# shrinks everything into assets/models/. Needs node/npx and network.
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=tools/raw-models
mkdir -p "$RAW" assets/models

FAM=https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master
FR24=https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models

dl() { # dl <url> <dest>
  if [ ! -s "$2" ]; then echo "download $2"; curl -sSL -A trevorplanequiz "$1" -o "$2"; fi
}

dl https://static.poly.pizza/46a1f499-8789-4eae-a067-471841407781.glb "$RAW/bumblebee.glb"
dl "$FAM/pa18/glTF2/PA18.glb"  "$RAW/pipercub.glb"
dl "$FAM/c182/glTF2/C182.glb"  "$RAW/cessna172.glb"
dl "$FAM/p40/glTF2/P40.glb"    "$RAW/p40.glb"
dl "$FAM/c550/glTF2/C550.glb"  "$RAW/learjet.glb"
dl "$FR24/b737.glb"            "$RAW/b737-v1.glb"
dl "$FAM/a320/glTF2/A320.glb"  "$RAW/a320.glb"
dl "$FAM/b788/glTF2/B788.glb"  "$RAW/b787.glb"
dl "$FAM/b744/glTF2/B747.glb"  "$RAW/b747.glb"
dl "$FAM/a380/glTF2/A380.glb"  "$RAW/a380.glb"
dl "$FR24/an225.gltf"          "$RAW/an225-v1.gltf"

# glTF 1.0 -> 2.0 (gltf-pipeline upgrades legacy materials to PBR)
for m in b737 an225; do
  src=$(ls "$RAW/$m-v1".*)
  if [ ! -s "$RAW/$m.glb" ]; then echo "convert $src"; npx -y gltf-pipeline -i "$src" -o "$RAW/$m.glb" -b; fi
done

# Optimise: smaller textures (webp), simplified meshes, no draco/meshopt so no decoders are needed.
for f in bumblebee pipercub cessna172 p40 learjet b737 b787 b747 a380 an225; do
  in="$RAW/$f.glb"; out="assets/models/$f.glb"
  [ -s "$in" ] || { echo "MISSING $in"; continue; }
  echo "optimise $f"
  if ! npx -y @gltf-transform/cli optimize "$in" "$out" --compress false --texture-compress webp --texture-size 512 --simplify-ratio 0.5 --simplify-error 0.001 >/dev/null 2>"$RAW/$f.log"; then
    echo "  optimise failed for $f (see $RAW/$f.log); copying raw"; cp "$in" "$out"
  fi
done
ls -la assets/models
