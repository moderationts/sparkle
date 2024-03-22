import { EmbedBuilder, type Message } from 'discord.js';
import { readConfig } from '../lib/util/functions';
import client from '../client';
import { mainColor } from '../lib/util/constants';

export default async function (message: Message<true>, commandName: string) {
  const config = await readConfig(message.guildId);
  if (!config || !config.logging?.commands || !config.logging.commands.enabled || !config.logging.commands.channelId)
    return;

  const channel = await client.channels.fetch(config.logging.commands.channelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(mainColor)
    .setAuthor({
      name: `${commandName} | ${message.author.username}`,
      iconURL: message.author.displayAvatarURL()
    })
    .setDescription(`\`${message.content}\``)
    .addFields(
      {
        name: 'Executed In',
        value: `${message.channel.toString()} (${message.channel.id})`
      },
      {
        name: 'Executed By',
        value: `${message.author.toString()} (${message.author.id})`
      }
    )
    .setFooter({ text: `${client.user!.username}`, iconURL: client.user!.displayAvatarURL() })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
  return;
}
