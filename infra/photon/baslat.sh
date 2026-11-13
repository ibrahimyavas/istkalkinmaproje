#!/bin/sh
# Photon konteynerinin açılış betiği (infra/docker-compose.yml -> photon).
# İlk açılışta yalnızca İstanbul'u içeren JSONL dökümünü içe aktarır, sonra sunucuyu başlatır.
# Döküm: scripts/photon-istanbul.js ile üretilen infra/data/photon/photon-istanbul.jsonl
set -e

VERI=/photon/data
GIRDI=/girdi/photon-istanbul.jsonl
HAZIR="$VERI/.istanbul-hazir"

if [ ! -f "$HAZIR" ]; then
  if [ ! -f "$GIRDI" ]; then
    echo "HATA: $GIRDI yok. Önce: node scripts/photon-istanbul.js (bkz. infra/README.md)" >&2
    exit 1
  fi
  echo "Photon: İstanbul dökümü içe aktarılıyor ($GIRDI)..."
  # shellcheck disable=SC2086
  java $JAVA_PARAMS -jar /photon/photon.jar import -import-file "$GIRDI" -data-dir "$VERI" -languages tr,en -j 4
  touch "$HAZIR"
  echo "Photon: içe aktarma bitti."
fi

# shellcheck disable=SC2086
exec java $JAVA_PARAMS -jar /photon/photon.jar serve -data-dir "$VERI" \
  -listen-ip 0.0.0.0 -listen-port 2322 -cors-any -default-language tr
