import { PermissionFlagsBits, Colors, EmbedBuilder, Message } from 'discord.js';
import { adequateHierarchy, genID, getFlag, getMember } from '../../lib/util/functions';
import { PunishmentType } from '@prisma/client';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'kick',
  description: 'Kick a member from the guild.',
  args: '<member> <reason> [--silent]',
  aliases: ['k', 'boot', 'remove'],
  clientPermissions: PermissionFlagsBits.KickMembers,
  userPermissions: PermissionFlagsBits.KickMembers
})
class KickCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a member to kick.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === message.author.id) throw 'You cannot kick yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot kick me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot kick this member due to inadequete hierarchy.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.**\n> I cannot kick this member due to inadequete hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to kick.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    message.delete().catch(() => {});
    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: member.id,
        guildId: message.guildId,
        type: PunishmentType.Kick,
        date: BigInt(Date.now()),
        moderatorId: message.author.id,
        reason
      }
    });

    if (!silentFlag) await this.client.punishments.createDM(punishment);
    member.kick(reason);

    await this.client.punishments.createMessage(punishment, message.channel);
    this.client.punishments.createLog(punishment);
  }
}

export default KickCommand;
