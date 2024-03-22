import { PunishmentType } from '../../lib/util/constants';
import { PermissionFlagsBits, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, genID, getFlag, getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'unmute',
  description: 'Unmute a member.',
  args: '<member> <reason> [--silent]',
  aliases: ['um'],
  clientPermissions: PermissionFlagsBits.ModerateMembers,
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class UnmuteCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a member to unmute.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === message.author.id) throw 'You cannot unmute yourself.';
    if (!member.isCommunicationDisabled()) throw 'This member is not muted.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.**\n> I cannot unmute this member due to inadequete hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to unmute.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const date = Date.now();

    member.timeout(null);

    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            guildId: message.guildId,
            userId: member.id,
            type: PunishmentType.Mute
          }
        }
      })
      .catch(() => {});

    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: member.id,
        guildId: message.guildId,
        type: PunishmentType.Unmute,
        moderatorId: message.author.id,
        date,
        reason
      }
    });

    if (!silentFlag) this.client.punishments.createDM(punishment);

    const alts = await this.client.db.alt.findMany({
      where: {
        guildId: message.guildId,
        mainId: member.id
      }
    });

    const altNames = await Promise.all(
      alts.map(async alt => {
        const altUser = await this.client.users.fetch(alt.id);
        return `${altUser.toString()}`;
      })
    );

    message.channel.send({
      content: alts.length > 0 ? `This user has the following alts registered: ${altNames.join(', ')}` : undefined,
      embeds: [{ description: `${member.toString()} has been **unmuted** | \`${punishment.id}\``, color: Colors.Green }]
    });
    this.client.punishments.createLog(punishment);
  }
}

export default UnmuteCommand;
