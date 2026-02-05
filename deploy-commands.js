require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// ================== CONFIG ==================
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;        // Discord Server ID
const TOKEN = process.env.DISCORD_TOKEN;
// ============================================

// ================== COMMAND DEFINITIONS ==================
const commands = [

  // /playoff
  new SlashCommandBuilder()
    .setName("playoff")
    .setDescription("Get playoff odds for your Sleeper league")
    .addStringOption(option =>
      option
        .setName("team")
        .setDescription("Optional: get odds for a specific team")
        .setRequired(false)
    )
    .toJSON(),



const tradeCommand = new SlashCommandBuilder()
  .setName("trade")
  .setDescription("Analyze a dynasty trade (autocomplete enabled)")
  .addStringOption(opt =>
    opt.setName("give")
      .setDescription("Players you GIVE (comma-separated). Start typing to autocomplete.")
      .setRequired(false)
      .setAutocomplete(true)
  )
  .addStringOption(opt =>
    opt.setName("get")
      .setDescription("Players you GET (comma-separated). Start typing to autocomplete.")
      .setRequired(false)
      .setAutocomplete(true)
  );

const commands = [tradeCommand.toJSON()];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Registering guild commands...");
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log("Commands registered.");
  } catch (err) {
    console.error(err);
  
  // /weekly
  new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Post the weekly Sleeper league recap")
    .addIntegerOption(option =>
      option
        .setName("week")
        .setDescription("Optional: specify a week number")
        .setRequired(false)
    )
    .toJSON(),

  // /bylaws
  new SlashCommandBuilder()
    .setName("bylaws")
    .setDescription("View league bylaws")
    .addStringOption(option =>
      option
        .setName("section")
        .setDescription("Optional: bylaws section (trades, draft, playoffs, etc)")
        .setRequired(false)
    )
    .toJSON()
];

// ================== DEPLOY ==================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🚀 Deploying slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands deployed successfully!");
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
