import { PunishmentType } from '@prisma/client';
import { PermissionFlagsBits, EmbedBuilder, Colors, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, genID, getFlag, getMember, parseDuration } from '../../lib/util/functions';
import { d28 } from '../../lib/util/constants';
import { ConfigData } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'mute',
  description: 'Mute a member.',
  args: '<member> [duration] <reason> [--silent]',
  aliases: ['m', 'silence', 'shut', 'shush', 'quiet', 'timeout'],
  clientPermissions: PermissionFlagsBits.ModerateMembers,
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class MuteCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a member to mute.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    if (member.id === message.author.id) throw 'You cannot mute yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot mute me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot mute this member due to inadequete hierarchy.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.**\n> I cannot mute this member due to inadequete hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    if (member.permissions.has(PermissionFlagsBits.Administrator)) throw 'You cannot mute an administrator.';

    const durationStr = args[1];
    let duration = parseDuration(durationStr);

    if (duration) {
      if (duration < 1000) throw 'Mute duration must be at least 1 second.';
      if (duration > d28) throw 'Mute duration can only be as long as 28 days.';
    }

    const date = Date.now();

    let expires = duration ? duration + date : null;

    if (!expires && (!config.punishments?.defaultMuteDuration || config.punishments?.defaultMuteDuration === 0n))
      return message.reply(
        '**Configuration error.**\n> The command could not be executed as a default mute duration has not been set and one was not provided.\n> Please set one in the configuration file or pass a duration argument when executing the command.'
      );

    if (duration) args.shift();
    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to mute.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    if (!expires) {
      expires = date + Number(config.punishments?.defaultMuteDuration);
      duration = Number(config.punishments?.defaultMuteDuration);
    }

    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: member.id,
        guildId: message.guildId,
        type: PunishmentType.Mute,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    const data = {
      guildId: message.guildId,
      userId: member.id,
      type: PunishmentType.Mute,
      expires
    };

    await this.client.db.task.upsert({
      where: { userId_guildId_type: { userId: member.id, guildId: message.guildId, type: PunishmentType.Mute } },
      update: data,
      create: data
    });

    member.timeout(Number(duration), reason);

    message.delete().catch(() => {});
    if (!silentFlag) this.client.punishments.createDM(punishment);
    message.channel.send({
      embeds: [{ description: `${member.toString()} has been **muted** | \`${punishment.id}\``, color: Colors.Yellow }]
    });
    this.client.punishments.createLog(punishment);
  }
}

export default MuteCommand;
