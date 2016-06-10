#!/usr/bin/env bash

if test $# -ne 2; then
  echo "Usage: ffa-sign.sh <credentials> <xpi file>"
  exit 1
fi

credentials=$1
source $credentials

xpi_file=$2
jpm sign --api-key $JWT_ISSUER --api-secret $JWT_SECRET --xpi $xpi_file
