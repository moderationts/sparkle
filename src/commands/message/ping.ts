import { PermissionFlagsBits, type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'ping',
  description: "Get the bot's API latency and websocket heartbeat.",
  aliases: ['pong', 'latency'],
  userPermissions: PermissionFlagsBits.ManageMessages
})
class PingCommand extends Command {
  async run(message: Message) {
    const start = performance.now();
    const msg = await message.channel.send('Pinging...');
    const end = performance.now();

    const timeTaken = Math.round(end - start);
    const ws = this.client.ws.ping;

    return msg.edit(`Pong! (Roundtrip took: ${timeTaken}ms. Heartbeat: ${ws}ms.)`);
  }
}

export default PingCommand;
