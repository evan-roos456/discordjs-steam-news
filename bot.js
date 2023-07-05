// Import required modules
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { token, clientId, clientSecret, publicKey } = require("./config.json");
const fetch = require('node-fetch');
const appid = require('appid');
// const { JsonDB, Config } = require("node-json-db");
const fs = require('fs');

/*
 * TODO:
 * Get jsondb to place all events into an events.json file
 * On bot startup, load the events.json file
 * Add compatability for other platforms (i am looking into twitter but their api is stupid)
 */

// Get the saved channels with jsondb
// const savedChannels = new JsonDB(new Config(dbPath, true, true, "."))

// initiate the discord client with proper config
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
]});

// Create the attach-steam-news command
// it is in this dumb format so that vs code can collapse it
const command = new SlashCommandBuilder()
  .setName("attach-steam-news").setDescription("Attaches the stem news to the currents server.")
  .addNumberOption(option=>{
      return option.setName("appid").setDescription("The app id to listen for events.").setRequired(true);
  })
  .addNumberOption(option=>{
      return option
      .setName("length").setDescription("The amount of characters to diplay in the embed description.")
      .setRequired(false).setMinValue(1).setMaxValue(4000);
  })
  .addStringOption(option=>{
      return option
      .setName("color").setDescription("The color of the embed in hex format.").setRequired(false);
  })
  .setDMPermission(true)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .toJSON()

// Send the command to discord
const rest = new REST().setToken(token);
rest.put(
    Routes.applicationCommands(clientId),
    { body: [command] }
)

// Log to the console when the bot is initiated
client.on("ready", e=>{
    console.log("Bot Has Started");
    // Eventually I am going to make the bot automatically add itself to a discord channel on reset
    // For now you just have to re-add it to the channel on every restart
  
    // client.guilds.cache.forEach((guild)=>{
    //     console.log(guild.id + guild.name);
    //     console.log(guild.channels.cache.map(c=>c.id));
    // })
})

// Useful interaction functions
const intUtils = {
    getParam: (interaction, name, def, evalFunction=(a=>a.length>0),map=(v=>v))=>{
        const value = (interaction.options.get(name, false)||{value:def}).value
        return map(evalFunction(value)?value:def);
    }
}

// Handle the slash command
client.on("interactionCreate", async interaction => {
    // If it is not reffering to the steam news command, ignore it
    if(!interaction.isChatInputCommand()) return;
    const baseEvent = interaction.guildId + "/" + interaction.channelIdS
    if(interaction.commandName !== command.name) return
  
    // send a defer reply so that discord doesn't fail the bot during the setup
    interaction.deferReply({ ephemeral: true });

    // get the inputs from the command and set nonrequired inputs to their defaults
    const appId = interaction.options.get('appid', true).value-0;
    const color = intUtils.getParam(interaction,'color',Math.floor(Math.random()*16777216).toString(16),v=>v>0,parseInt);
    const maxLength = intUtils.getParam(interaction, 'length', 750);

    // Invalid input handling
    if(maxLength < 1 || maxLength > 4000) return interaction.editReply("Invalid Length (must be in the range of 1-4000)");
    
    // search for the steam apps name
    const name = await appid(appId);

    // Error handling
    if(name == undefined) return interaction.editReply("Unknown Game Name");

    // Calculate the event id (Soon I will implement jsondb or fs then have all of the event ids go into an events.json file)
    const eventID = baseEvent+"/steam/"+name.appid

    // Confirm that all is well
    if(events[eventID]) interaction.editReply(`Updating news params for "${name.name}" on this server`);
    else interaction.editReply(`Attaching news for "${name.name}" to this server`);

    // Base isteam news web api url for news fetching
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=1&maxlength=${maxLength}&format=json`;
    
    // Chack every 30 seconds for an update
    let lastgid = 0;

    // Update the event
    events[eventID] = {enabled: true, params: {url:url, color:color, name:name, interaction:interaction, lastgid:lastgid}};

    // function to handle the updates
    // I have it in a function so that when I do update this it is easy for me to move the code over
    // Also it makes the gid part more compact
    const steamUpdate = async (params)=>{
        const url = params.url;
        const color = params.color;
        const name = params.name;
        const interaction = params.interaction;
        const lastgid = params.lastgid;

        // Init news item in this scope
        let newsItem;
        try {
            // Attempt to get the data
            const data = await fetch(url);
            const json = await data.json();
            newsItem = json.appnews.newsitems[0];
        } catch (error) {
            // If there was an error, log it then do not continue
            console.log(error);
            return lastgid;
        }
    
        // If there is no news, return
        if(typeof newsItem!="object") return lastgid;
    
        // If the last news item matches this one, skip it (it is the same news item)
        if(lastgid == newsItem.gid) return lastgid;

        // If we made it this far, there is definitely a new news item
        // update the gid
        lastgid = newsItem.gid;
    
        // Get the contents of the news
        let text = newsItem.contents;
    
        // Get rid of xml (xml <a>eraser</a> => xml eraser)
        // makes it more readable
        text = text.replace(/<[\s\S]*?>/g, "");
    
        // Replace steam clan image urls with real urls
        text = text.split('{STEAM_CLAN_IMAGE}').join('https://clan.cloudflare.steamstatic.com/images/');
    
        // Get all of the "images"(urls) and take them out of the text
        const images = text.split(" ").filter(v=>v.substr(0,7)=='http://'||v.substr(0,8)=='https://');
        images.forEach(element => {
            text = text.replace(element, "");
        });
    
        // Generate an embed
        const embed = new EmbedBuilder()
        .setFooter({text:[newsItem.feedlabel,name.name,name.appid].filter(v=>v&&((typeof v=="string"&&v.length>0)||((typeof v=="number"||typeof v=="bigint")&&(!isNaN(v)))||typeof v=="object")).join(" | ")})
        if(color-0 > 0) embed.setColor(color)
        if(newsItem.title.length > 0) embed.setTitle(newsItem.title)
        if(text.length > 0) embed.setDescription(text)
        if(newsItem.url.length > 0) embed.setURL(newsItem.url)
        if(images.length > 0) embed.setImage(images[0]);
        if(newsItem.author.length > 0) embed.setAuthor({name: newsItem.author, iconURL: `https://dummyimage.com/1x1/${color.toString(16)}/${color.toString(16)}`, url: newsItem.url})
        
        // send the embed
        interaction.channel.send({ embeds: [embed] });
        return lastgid;
    }

    // Interval to check for updates
    const interval = setInterval(async () => {
        if(events[eventID].enabled == false) {
            events[eventID] = undefined;
            clearInterval(interval);
        }
        lastgid = await steamUpdate(events[eventID].params);
        events[eventID].params[4] = lastgid
    }, 1000);
})
// log the bot into discord
client.login(token);
