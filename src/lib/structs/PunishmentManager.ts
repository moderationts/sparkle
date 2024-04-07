import { Punishment } from '@prisma/client';
import { PunishmentType } from '../util/constants';
import { Colors, EmbedBuilder, GuildTextBasedChannel } from 'discord.js';
import { punishmentColors, pastTensePunishmentTypes } from '../util/constants';
import client from '../../client';
import { bin, formatDuration, getMember, getUser } from '../util/functions';
import { PunishmentEdit } from './Interfaces';
import Config from '../util/config';

export default class PunishmentManager {
  async createDM(punishment: Punishment, customInfo?: string | null) {
    const config = Config.get(punishment.guildId)!;

    const dm = new EmbedBuilder()
      .setColor(punishmentColors[punishment.type as PunishmentType])
      .setAuthor({ name: `${client.user!.username}`, iconURL: client.user!.displayAvatarURL() })
      .setTitle(
        `You've been ${
          pastTensePunishmentTypes[punishment.type.toLowerCase() as keyof typeof pastTensePunishmentTypes]
        } ${punishment.type === PunishmentType.Ban || punishment.type === PunishmentType.Kick ? 'from' : 'in'} ${
          client.guilds.cache.get(punishment.guildId)!.name
        }`
      )
      .addFields({ name: 'Reason', value: punishment.reason });

    if (customInfo) dm.addFields({ name: 'Additional Information', value: customInfo });
    else
      switch (punishment.type) {
        case PunishmentType.Ban:
          if (config!.data.punishments?.additionalInfo?.ban)
            dm.addFields([{ name: 'Additional Information', value: config!.data.punishments.additionalInfo.ban }]);
          break;
        case PunishmentType.Kick:
          if (config!.data.punishments?.additionalInfo?.kick)
            dm.addFields([{ name: 'Additional Information', value: config!.data.punishments.additionalInfo.kick }]);
          break;
        case PunishmentType.Mute:
          if (config!.data.punishments?.additionalInfo?.mute)
            dm.addFields([{ name: 'Additional Information', value: config!.data.punishments.additionalInfo.mute }]);
          break;
        case PunishmentType.Warn:
          if (config!.data.punishments?.additionalInfo?.warn)
            dm.addFields([{ name: 'Additional Information', value: config!.data.punishments.additionalInfo.warn }]);
          break;
      }

    if (punishment.expires)
      dm.addFields({
        name: 'Expires',
        value: formatDuration(punishment.expires - punishment.date)
      });
    dm.setFooter({ text: `Punishment ID: ${punishment.id}` });
    dm.setTimestamp(Number(punishment.date));

    const member = await getMember(punishment.guildId, punishment.userId);
    if (member) await member.send({ embeds: [dm] }).catch(() => {});
    return;
  }

  async createLog(punishment: Punishment, content?: string | null) {
    const config = Config.get(punishment.guildId)!;

    if (!config!.data.logging?.punishments?.enabled && !config!.data.logging?.punishments?.channelId) return false;

    const channel = await client.channels.fetch(config!.data.logging.punishments.channelId)!;
    if (!channel || !channel.isTextBased()) return false;

    const user = await getUser(punishment.userId);
    const moderator = await getUser(punishment.moderatorId);
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${moderator?.username} (${moderator?.id})`, iconURL: moderator?.displayAvatarURL() })
      .setColor(punishmentColors[punishment.type as PunishmentType])
      .setDescription(
        `**${
          punishment.type === PunishmentType.Ban || punishment.type === PunishmentType.Unban ? 'User' : 'Member'
        }:** \`${user!.username}\` (${user!.id})\n**Action:** ${punishment.type.toString()}${
          punishment.expires
            ? `\n**Duration:** ${formatDuration(punishment.expires - punishment.date)}\n**Expires:** <t:${Math.floor(
                Number(punishment.expires) / 1000
              )}> (<t:${Math.floor(Number(punishment.expires) / 1000)}:R>)`
            : ''
        }\n**Reason:** ${punishment.reason}${
          content
            ? content.length > 500
              ? `\n**Trigger:** [View Here](${await bin(content)})`
              : `\n**Trigger:** \`${content}\``
            : ''
        }`
      )
      .setFooter({ text: `Punishment ID: ${punishment.id ? punishment.id : 'Undefined'}` })
      .setTimestamp(Number(punishment.date));

    await channel.send({ embeds: [embed] });
    return;
  }

  async createEditLog(
    punishment: PunishmentEdit,
    editType: 'reason' | 'expiration' | 'delete' | 'bulkdelete',
    ids?: string[]
  ) {
    const config = Config.get(punishment.guildId)!;
    if (!config!.data.logging?.punishmentEdit?.enabled && !config!.data.logging?.punishmentEdit?.channelId)
      return false;

    const channel = await client.channels.fetch(config!.data.logging.punishmentEdit.channelId);
    if (!channel || !channel.isTextBased()) return false;

    const moderator = await getUser(punishment.moderatorId);
    const user = await getUser(punishment.userId);
    const upperTense = editType[0].toUpperCase() + editType.slice(1);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${moderator!.username} (${moderator!.id})`,
        iconURL: moderator!.displayAvatarURL()
      })
      .setColor(
        editType === 'expiration' || editType === 'reason'
          ? punishmentColors[punishment.type as PunishmentType]
          : Colors.Red
      )
      .setDescription(
        `**${
          punishment.type === PunishmentType.Ban || punishment.type === PunishmentType.Unban ? 'User' : 'Member'
        }** \`${user!.username}\` (${
          user!.id
        })\n**Punishment Type:** ${punishment.type.toString()}\n**Action:** ${upperTense}${
          editType !== 'delete' ? ' Change' : ''
        }${punishment.reason ? `\n**Edit Reason:** ${punishment.reason}` : ''}${
          punishment.newExpiration
            ? `\n**Old Expiration:** <t:${Math.floor(Number(punishment.oldExpiration) / 1000)}>`
            : ''
        }${
          punishment.newExpiration
            ? `\n**New Expiration:** <t:${Math.floor(Number(punishment.newExpiration) / 1000)}> (<t:${Math.floor(
                Number(punishment.newExpiration) / 1000
              )}:R>)`
            : ''
        }${punishment.oldReason ? `\n**Old Reason:** ${punishment.oldReason}` : ''}${
          punishment.newReason ? `\n**New Reason:** ${punishment.newReason}` : ''
        }`
      )
      .setFooter({ text: `Punishment ID: ${punishment.id}` })
      .setTimestamp();

    const embed2 = new EmbedBuilder()
      .setColor(Colors.Red)
      .setAuthor({ name: `${moderator!.username} (${moderator!.id})`, iconURL: moderator!.displayAvatarURL() })
      .setDescription(
        `
        **User:** \`${user!.username}\` (${user!.id})\n**Action:** Bulk Delete\n**Deleted Punishments:** ${
          ids?.length! > 4
            ? `[View Here](${await bin(ids?.map(id => id).join(', '))})`
            : `${ids?.map(id => `\`${id}\``).join(', ')}`
        }
      `
      )
      .setTimestamp();

    if (editType !== 'bulkdelete') await channel.send({ embeds: [embed] });
    else await channel.send({ embeds: [embed2] });
    return;
  }
  async createMessage(punishment: Punishment, channel: GuildTextBasedChannel) {
    const tense: string =
      pastTensePunishmentTypes[punishment.type.toLowerCase() as keyof typeof pastTensePunishmentTypes];

    const alts = await client.db.alt.findMany({
      where: {
        guildId: punishment.guildId,
        mainId: punishment.userId
      }
    });

    const altNames = await Promise.all(
      alts.map(async alt => {
        const altUser = await client.users.fetch(alt.id);
        return `${altUser.toString()}`;
      })
    );

    const user = await getUser(punishment.userId);
    return channel.send({
      content: alts.length > 0 ? `This user has the following alts registered: ${altNames.join(', ')}` : undefined,
      embeds: [
        {
          description: `${user!.toString()} has been **${tense}** | \`${punishment.id}\``,
          color: punishmentColors[punishment.type as PunishmentType]
        }
      ]
    });
  }
}
