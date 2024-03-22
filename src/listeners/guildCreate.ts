import { ChannelType, Guild, TextChannel } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { confirmConfig } from '../lib/util/functions';

class GuildCreateListener extends Listener {
  constructor() {
    super('guildCreate');
  }

  async run(guild: Guild) {
    const configFile = await confirmConfig(guild.id);

    if (configFile === null) {
      const channelProperties = guild.channels.cache.find(
        channel => channel.type === ChannelType.GuildText && channel.name.includes('staff-chat')
      );

      const channel = this.client.channels.cache.get(channelProperties?.id!) as TextChannel;
      await channel.send(
        `Heya! I'm **${
          this.client.user!.username
        }**! I was added to this server by someone with the \`Manage Server\` permission, however I'm forced to leave as there is no config file for this guild.\nPlease ask a bot owner to create a config file for this guild. Thank you!`
      );

      return guild.leave().then(() => {
        console.log(`[Config] Left guild ${guild.id} due to missing config file.`);
      });
    }
  }
}

export default GuildCreateListener;
