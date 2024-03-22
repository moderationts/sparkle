import { PermissionFlagsBits as Permissions, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'manage-nick',
  description: "Manage a member's nickname.",
  args: ['<member>'],
  aliases: ['nick'],
  userPermissions: Permissions.ManageNicknames,
  clientPermissions: Permissions.ManageNicknames
})
class ManageNickCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'You must provide a member to execute this command';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'That user is not on this guild.';

    if (member.id === message.author.id) throw 'You cannot manage your own nickname.';
    if (member.id === this.client.user!.id) throw 'You cannot manage my nickname.';
    if (!adequateHierarchy(message.member!, member))
      throw "You cannot moderate this member's nickname due to inadequate hierarchy.";
    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.***\n> I cannot manage this member's nickname due to inadequate hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    if (!args[1]) {
      if (!member.nickname) throw 'That member has no nickname.';
      await member.setNickname(null).catch(() => {});
      return message.channel.send(`Nickname for **${member.user.username}** reset.`);
    } else if (args[1]) {
      const nickname = args.slice(1).join(' ');
      if (nickname.length > 32) throw 'Nicknames cannot be longer than 32 characters.';
      if (nickname.length < 3) throw 'Nicknames cannot be shorter than 3 characters.';

      if (member.nickname === nickname) throw 'That nickname is already set.';
      await member.setNickname(nickname).catch(() => {});

      return message.channel.send(`Nickname for **${member.user.username}** set to \`${nickname}\`.`);
    }
  }
}

export default ManageNickCommand;
