require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { CLIENT_ID, TOKEN } = process.env;
const fs = require('node:fs');

const commands = [];
const commandFiles = fs.readdirSync('src/commands/slash').filter(file => file.endsWith('.ts'));

for (const file of commandFiles) {
  const commandClass = require(`./dist/commands/slash/${file.slice(0, -3)}`).default;
  const commandInstant = new commandClass();
  commands.push(commandInstant.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();
