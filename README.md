# english

The server behind the English editor.

The docs for the editor are <a href="http://this.how/english/">here</a>. 

The editor itself is <a href="http://scripting.com/english/">here</a>.

### How to set up the server

It's actually pretty simple to set up.

1. Go to the <a href="https://github.com/settings/developers">Developer settings</a> page on GitHub. 

2. Click on the <i>OAuth Apps</i> tab.

3. Click on the <i>New OAuth App</i> button.

4. Fill in the form. The only tricky part is the Authorization callback URL. Enter something of this form: http://yourserver.com/oauthcallback -- where the <i>yourserver.com</i> part is replaced with the address of your server. 

5. You will get a Client ID and Client Secret on the profile page for the app. Paste those values into config.json and reboot the server. Now it should have a good connection to GitHub.

