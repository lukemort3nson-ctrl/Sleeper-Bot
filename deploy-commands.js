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

  // /trade
  new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Analyze a dynasty trade using FantasyCalc")
    .addStringOption(option =>
      option
        .setName("give")
        .setDescription("Comma-separated assets you give (players or picks)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("get")
        .setDescription("Comma-separated assets you receive (players or picks)")
        .setRequired(true)
    )
    .toJSON(),

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