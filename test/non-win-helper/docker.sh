#!/bin/bash
set -e
cd "$(dirname "$0")"

npm run dev-build-convert-server
mkdir -p storage
cp  ../../dist/dev/convert-server.js post-inst/
echo "WARNING! First run may take a very long long time."
docker run -it --rm --name windows \
    -p 8006:8006 -p 8083:8083 \
    --device=/dev/kvm --device=/dev/net/tun --cap-add NET_ADMIN \
    -v "${PWD:-.}/storage:/storage" \
    -v "$(realpath ../..):/shared" \
    -v "${PWD:-.}/post-inst:/oem" \
    --stop-timeout 120 \
    dockurr/windows
