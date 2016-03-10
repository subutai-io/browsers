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
