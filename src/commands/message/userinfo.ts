import { EmbedBuilder } from '@discordjs/builders';
import { GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { mainColor } from '../../lib/util/constants';
import { getMember, getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'userinfo',
  description: 'Get information on a user.',
  aliases: ['user', 'ui', 'whois', 'who'],
  args: '[user]',
  userPermissions: PermissionFlagsBits.ManageMessages,
  commandChannel: true
})
class UserinfoCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const user =
      args.length > 0 ? (await getMember(message.guild, args[0])) ?? (await getUser(args[0])) : message.member!;
    if (!user) throw 'Invalid user.';

    const createdStr = Math.floor(
      (user instanceof GuildMember ? user.user.createdTimestamp : user.createdTimestamp) / 1000
    );
    const joinedStr = user instanceof GuildMember ? Math.floor(user.joinedTimestamp! / 1000) : null;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: user instanceof GuildMember ? user.user.username : user.username,
        iconURL: user.displayAvatarURL()
      })
      .setColor(mainColor)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `**User ID:** ${user.id}\n**Created:** <t:${createdStr}> (<t:${createdStr}:R>)${
          joinedStr ? `\n**Joined:** <t:${joinedStr}> (<t:${joinedStr}:R>)` : ''
        }\n**Bot:** ${(user instanceof GuildMember ? user.user.bot : user.bot) ? 'Yes' : 'No'}`
      );

    return message.channel.send({ embeds: [embed] });
  }
}

export default UserinfoCommand;
