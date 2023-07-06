
# discord steam news
A simple node.js news bot that sends out steam news.
### Roadmap:


| Status | Description
| :---: | :--- |
| done        | support all steam games |
| started     | store events in a json file |
| not started | get a nodejs server to run the bot |
| not started | add DM suport |
| not started | add support for other platforms |

## Create a discord bot

### Making the application

navigate to the [discord developer portal](https://discord.com/developers/applications) and click "New Application"

After naming your application, you will be taken to its page where you can update the name, icon, description, and tags

### Filling out config.json

Copy the public key, and paste it into the `config.json` file.

Click on the "Bot" button in the sidebar. Here, you can change your bot's name and icon.

Click "Reset Token" to generate a new token. Copy the generated token and paste it into the `config.json` file.

Navigate to the OAuth2 page via the sidebar. Here, you can find the client ID and client secret. Paste those into the `config.json` file as well.

it is important to NEVER share these with anybody, doing so will allow them to use your bot and get full access to your discord servers (in some cases).

### Adding the bot to a server

Here is a basic invite link with all the permissions required for your bot to run:

`https://discord.com/api/oauth2/authorize?client_id=PASTE_YOUR_CLIENT_ID_HERE&permissions=2147502080&scope=bot%20applications.commands`

If you want to generate your own url, there is a url generator in the oAuth2 tab.
If you want to know more, [Look here](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#creating-and-using-your-invite-link)

## Script Installation
Install all the node dependencies

    npm i
Start the bot with

    node .
  or 
  
    node bot.js
