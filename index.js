require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

// ================== CONFIG ==================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const LEAGUE_ID = "1313964542505545728";
const PLAYOFF_TEAMS = 6;
const SIMULATIONS = 5000;
const REPORT_CHANNEL_ID = "YOUR_CHANNEL_ID_HERE";
// ============================================

// ================== CLIENT ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================== LOAD BYLAWS ==================
const bylaws = JSON.parse(fs.readFileSync("./bylaws.json", "utf8"));

// ================== READY ==================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ================== INTERACTIONS ==================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ========== /BYLAWS ==========
  if (interaction.commandName === "bylaws") {
    const section = interaction.options.getString("section");

    if (!section) {
      const list = Object.keys(bylaws).map(k => `• ${k}`).join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📜 League Bylaws")
            .setDescription(
              `${bylaws.overview}\n\n**Available Sections:**\n${list}\n\nUse \`/bylaws section:trades\``
            )
            .setColor(0x3498db)
        ]
      });
    }

    const text = bylaws[section.toLowerCase()];
    if (!text) {
      return interaction.reply({
        content: "❌ Section not found. Run `/bylaws` to see valid sections.",
        ephemeral: true
      });
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`📘 Bylaws: ${section}`)
          .setDescription(text)
          .setColor(0x2ecc71)
      ]
    });
  }

  // ========== /WEEKLY ==========
  if (interaction.commandName === "weekly") {
    const week = interaction.options.getInteger("week");
    await interaction.reply("🏈 Generating weekly report...");
    await sendWeeklyReport(week);
    return interaction.editReply("✅ Weekly report posted!");
  }

  // ========== /TRADE ==========
  if (interaction.commandName === "trade") {
    const give = interaction.options.getString("give").split(",");
    const get = interaction.options.getString("get").split(",");

    await interaction.reply("📊 Analyzing trade...");

    const giveValue = await calculateTradeSide(give);
    const getValue = await calculateTradeSide(get);

    const diff = getValue - giveValue;

    let verdict = "Fair Trade ✅";
    if (Math.abs(diff) > 300) verdict = diff > 0 ? "You Win 📈" : "You Lose 📉";
    if (Math.abs(diff) > 800) verdict += " (Smash)";

    return interaction.editReply(
      `📊 **Dynasty Trade Analysis (FantasyCalc)**\n\n` +
      `You Give: **${giveValue}**\n` +
      `You Get: **${getValue}**\n\n` +
      `**Result:** ${verdict}`
    );
  }

  // ========== /PLAYOFF ==========
  if (interaction.commandName === "playoff") {
    await interaction.reply("📈 Calculating playoff odds...");
    const odds = await calculatePlayoffOdds();

    let msg = "**🏈 Playoff Odds**\n\n";
    odds.forEach(t => {
      msg += `**${t.name}**: ${t.odds.toFixed(1)}%\n`;
    });

    return interaction.editReply(msg);
  }
});

// ================== WEEKLY REPORT ==================
async function sendWeeklyReport(weekOverride = null) {
  const leagueRes = await axios.get(`https://api.sleeper.app/v1/league/${LEAGUE_ID}`);
  const rostersRes = await axios.get(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`);
  const usersRes = await axios.get(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`);

  const league = leagueRes.data;
  const rosters = rostersRes.data;
  const users = usersRes.data;

  const userMap = {};
  users.forEach(u => userMap[u.user_id] = u.display_name);

  const rosterMap = {};
  rosters.forEach(r => {
    rosterMap[r.roster_id] = {
      name: userMap[r.owner_id],
      projected: r.settings.fpts_proj || 0
    };
  });

  const currentWeek = league.settings.leg || 14;
  const week = weekOverride || currentWeek - 1;

  const matchupRes = await axios.get(
    `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${week}`
  );

  const matchups = matchupRes.data;
  const teams = matchups.map(m => ({
    roster_id: m.roster_id,
    name: rosterMap[m.roster_id].name,
    points: m.points,
    projected: rosterMap[m.roster_id].projected,
    diff: m.points - rosterMap[m.roster_id].projected,
    matchup_id: m.matchup_id
  }));

  const top = teams.reduce((a, b) => b.points > a.points ? b : a);
  const low = teams.reduce((a, b) => b.points < a.points ? b : a);
  const avg = teams.reduce((s, t) => s + t.points, 0) / teams.length;
  const bust = teams.reduce((a, b) => b.diff < a.diff ? b : a);

  const embed = new EmbedBuilder()
    .setTitle(`🏈 Weekly Recap – Week ${week}`)
    .addFields(
      { name: "🔥 Top Scorer", value: `${top.name} – ${top.points.toFixed(1)}` },
      { name: "😢 Lowest Scorer", value: `${low.name} – ${low.points.toFixed(1)}` },
      { name: "⭐ League Average", value: `${avg.toFixed(1)}` },
      { name: "📉 Biggest Underperformance", value: `${bust.name} (${bust.diff.toFixed(1)})` }
    )
    .setColor(0x1abc9c)
    .setTimestamp();

  const channel = client.channels.cache.get(REPORT_CHANNEL_ID);
  if (channel) channel.send({ embeds: [embed] });
}

// ================== TRADE CALC ==================
let fantasyCalcCache = [];
let lastFetch = 0;

async function getFantasyCalcValues() {
  if (Date.now() - lastFetch < 6 * 60 * 60 * 1000 && fantasyCalcCache.length)
    return fantasyCalcCache;

  const res = await axios.get(
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2"
  );

  fantasyCalcCache = res.data;
  lastFetch = Date.now();
  return fantasyCalcCache;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

async function calculateTradeSide(items) {
  const values = await getFantasyCalcValues();
  let total = 0;

  items.forEach(item => {
    const clean = normalizeName(item);
    const found = values.find(v =>
      normalizeName(v.player?.name || v.name).includes(clean)
    );
    if (found) total += found.value;
  });

  return total;
}

// ================== PLAYOFF ODDS ==================
async function calculatePlayoffOdds() {
  const rosterRes = await axios.get(
    `https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`
  );
  const usersRes = await axios.get(
    `https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`
  );

  const users = {};
  usersRes.data.forEach(u => users[u.user_id] = u.display_name);

  const teams = rosterRes.data.map(r => ({
    name: users[r.owner_id],
    wins: r.settings.wins,
    points: r.settings.fpts,
    count: 0
  }));

  for (let i = 0; i < SIMULATIONS; i++) {
    teams.sort((a, b) => b.wins - a.wins || b.points - a.points);
    teams.slice(0, PLAYOFF_TEAMS).forEach(t => t.count++);
  }

  return teams.map(t => ({
    name: t.name,
    odds: (t.count / SIMULATIONS) * 100
  }));
}

// ================== LOGIN ==================
client.login(DISCORD_TOKEN);