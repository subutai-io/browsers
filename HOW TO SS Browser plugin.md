# HOW-TO SS Browser plugin

This page explains how to user browser plugin with subutai social.

You will go through user registration till environment creation process.

These is mainly two major parts where browser plugin performs some actions 
and simplifies overwhelming operations.

### How-TO SS Google Chrome plugin:
***

1. Install extension
    1. Extract "ss-pgp-plugin.tar.gz" in home directory
    2. Start google-chrome, open browser settings and click on Extensions menu on left side panel.
    3. Put a tick near "Developer mode" and click on "Load unpacked extension..." button 
where you should point a path to unpacked browser plugin

2. Generate user key pair.
    1. Click on browser plugin icon and select "Options" button
    2. In newly opened window click on "generate button on right top corner and fill in blank input fields
    3. Click on "Submit"

3. Sign-up user with Subutai Social
    1. On login page of Subutai Social Console click on Sign up button
    2. Fill in blank fields, and in last one, you should paste your public key, give several seconds to 
plugin to detect and collect all your keys, so it can pull key list and paste public key selected from list.
    3. Then admin should approve your request and now you can login to console.

4. Update user public key
    1. Log in to subutai social management console with user who has administrative privileges
    2. On left side panel select User Management and from list click edit icon near user you want to change.
    3. In public key field input public key you want to set. Click Save.

5. Sign environment trust message.
    1. In new environment creation workflow you have to sign message presented in dialog box with key you registered with.
    2. Wait several seconds so plugin could detect message and sign it within browser. 
To sign message click on pencil icon on top right corner that will appear in dialog.

### How-TO SS FireFox plugin:
***

When you try to install an unverified add-on, you’ll get this error or warning: ‘Nightly has prevented this site from installing an unverified add-on’.

1. Visit about:config
2. Toggle xpinstall.signatures.required preference value to ‘false’.

After doing this, you can able to install the add-on after going through two warnings and that’s normal: first you need to ‘Allow’ it, next, read the caution prompt and click ‘install’ button.
