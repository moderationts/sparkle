import { PermissionFlagsBits as Permissions, Message, EmbedBuilder } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { commonChars, mainColor } from '../../lib/util/constants';
import { adequateHierarchy, getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'moderate-nick',
  description: 'Correct a non-default font, hoisted, or any other unwanted user/nickname.',
  args: ['<member>'],
  aliases: ['mod', 'modnick'],
  userPermissions: Permissions.ManageNicknames,
  clientPermissions: Permissions.ManageNicknames
})
class ModerateNickCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'You need to provide a member to execute this command.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'That user is not on this guild.';

    if (member.id === message.author.id) throw 'You cannot moderate your own nickname.';
    if (member.id === this.client.user!.id) throw 'You cannot moderate my nickname.';
    if (!adequateHierarchy(message.member!, member))
      throw "You cannot moderate this member's nickname due to inadequate hierarchy.";
    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.***\n> I cannot moderate this member's nickname due to inadequate hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    let code = '';
    for (let i = 0; i !== 8; ++i) {
      code += commonChars[Math.floor(Math.random() * commonChars.length)];
    }

    const regexPattern = /^Moderated Nickname [A-Za-z0-9]{8}$/;
    if (regexPattern.test(member.nickname!)) throw "That member's nickname is already moderated.";

    const embed = new EmbedBuilder()
      .setColor(mainColor)
      .setAuthor({ name: `${this.client.user?.username}`, iconURL: this.client.user?.displayAvatarURL() })
      .setTitle('Nickname Moderated')
      .setDescription(
        `Your nickname was moderated in **${message.guild.name}**. If you would like to change your nickname to something else, please reach out to an active staff member. Note that abusing your nickname permissions can get your permissions revoked.`
      )
      .addFields({
        name: 'Possible Reasons',
        value:
          ' • Your name was not typeable on a standard English QWERTY keyboard. \n • Your name contained a bypass. \n • Your name was shorter than 3 letters. \n • Your name was not mentionable.'
      })
      .setTimestamp();

    await member.setNickname(`Moderated Nickname ${code}`).catch(() => {});
    member.send({ embeds: [embed] }).catch(() => {});
    return message.channel.send(`Moderated name to \`Moderated Nickname ${code}\`.`);
  }
}

export default ModerateNickCommand;
