#!/bin/bash

#git clone https://github.com/creationix/nvm.git ~/.nvm && pushd ~/.nvm && git checkout `git describe --abbrev=0 --tags`
#popd

#. ~/.nvm/nvm.sh

#echo 'export NVM_DIR="$HOME/.nvm"' >> $HOME/.bashrc
#echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm' >> $HOME/.bashrc
#echo 'nvm use 5.0' >> $HOME/.bashrc

#nvm install 5.0
#nvm use 5.0
#npm install -g grunt-cli bower

# npm install -g manifoldjs
# manifoldjs -l debug -p edgeextension -f edgeextension -m <EXTENSION LOCATION>\manifest.json
# PS C:\Program Files (x86)\Windows Kits\10\bin\10.0.16299.0\x64> .\makeappx.exe pack /h SHA256 /d "C:\Users\user\Documents\browsers\browsers\build\edge" /p C:\Users\user\Documents\browsers\browsers\build\edge.appx

#git clone https://github.com/subutai-io/Tooling-ss-pgp-plugin.git ss-pgp-plugin

#cd ss-pgp-plugin
#git submodule update --init

#pushd dep/chrome/openpgpjs
#npm install && grunt --force
#popd

#pushd dep/firefox/openpgpjs
#npm install && grunt --force
#popd

npm install && bower install && grunt --force

pushd node_modules/mailreader; npm install;
popd

pushd node_modules/mailreader; npm install;
popd

pushd node_modules/emailjs-mime-codec/; npm install
popd

pushd node_modules/mailreader; npm install;
pushd node_modules/emailjs-mime-parser; npm install;
popd
popd

pushd node_modules/emailjs-mime-builder;npm install;
popd

pushd node_modules/emailjs-mime-builder; npm install;
popd

pushd node_modules/emailjs-mime-builder/; npm install
popd

#pushd node_modules/mailreader && npm install
#popd
#
#pushd node_modules/mailreader/node_modules/emailjs-mime-parser && npm install
#popd
#
#pushd node_modules/mailreader/node_modules/emailjs-mime-parser/node_modules/emailjs-addressparser && npm install
#popd
#
#pushd node_modules/emailjs-mime-builder && npm install
#popd
#
#pushd node_modules/mimefuncs && npm install
#popd
#
#pushd node_modules/mailbuild && npm install
#popd
#
#pushd node_modules/mailbuild/node_modules/mimetypes && npm install
#popd
#
#pushd node_modules/mailbuild/node_modules/punycode && npm install
#popd

grunt dist-cr dist-ff --force
