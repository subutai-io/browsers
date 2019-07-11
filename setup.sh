#!/bin/bash

npm install && bower install && grunt --force

pushd node_modules/mailreader; npm install;
popd

pushd node_modules/emailjs-mime-codec/; npm install
popd

pushd node_modules/emailjs-mime-parser; npm install;
popd

pushd node_modules/emailjs-mime-builder;npm install;
popd

grunt dist-cr dist-ff --force

cd dist/
unzip e2e-plugin.chrome.zip
cd ..
