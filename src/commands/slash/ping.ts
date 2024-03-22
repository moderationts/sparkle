import { type ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Command, { properties, data } from '../../lib/structs/Command';

@data(new SlashCommandBuilder().setName('ping').setDescription("Get the bot's API latency and websocket heartbeat."))
@properties<'slash'>({
  userPermissions: PermissionFlagsBits.ManageMessages
})
class PingCommand extends Command {
  async run(interaction: ChatInputCommandInteraction) {
    const start = performance.now();
    await interaction.deferReply();
    const end = performance.now();

    const timeTaken = Math.round(end - start);
    const ws = this.client.ws.ping;

    return interaction.editReply(`Pong! (Roundtrip took: ${timeTaken}ms. Heartbeat: ${ws}ms.)`);
  }
}

export default PingCommand;
