import { EmbedBuilder } from '@discordjs/builders';
import { Colors, PermissionFlagsBits } from 'discord.js';
import { PunishmentType } from './lib/util/constants';
import client from './client';
import { genID, getMember } from './lib/util/functions';
import { pastTensePunishmentTypes } from './lib/util/constants';

const MS_1_MINUTE = 60000;

setInterval(async () => {
  await client.db.punishment.deleteMany({
    where: {
      type: PunishmentType.Warn,
      expires: {
        lte: Date.now()
      }
    }
  });

  const guilds = await client.db.guild.findMany({
    select: { id: true, tasks: { where: { expires: { lte: Date.now() } } } }
  });

  for (const guildTasks of guilds) {
    const guild = client.guilds.cache.get(guildTasks.id);
    if (!guild) {
      await client.db.task.deleteMany({
        where: {
          guildId: guildTasks.id,
          expires: { lte: Date.now() }
        }
      });

      continue;
    }

    const permissions = guild.members.me!.permissions;
    const banPerm = permissions.has(PermissionFlagsBits.BanMembers);

    if (!banPerm) {
      await client.db.task.deleteMany({
        where: {
          guildId: guild.id,
          type: PunishmentType.Ban,
          expires: { lte: Date.now() }
        }
      });

      continue;
    }

    for (const task of guildTasks.tasks) {
      if (task.type === PunishmentType.Ban) {
        await guild.members.unban(task.userId).catch(() => {});
      }
      const unPunish = await client.db.punishment.create({
        data: {
          id: genID(),
          userId: task.userId,
          guildId: task.guildId,
          moderatorId: client.user!.id,
          reason: `${task.type === PunishmentType.Ban ? 'Ban' : 'Mute'} expired.`,
          date: BigInt(Date.now()),
          type: task.type === PunishmentType.Ban ? PunishmentType.Unban : PunishmentType.Unmute
        }
      });

      const member = await getMember(guild, task.userId);
      if (member) {
        // if the user is timed out for more than `10` seconds then we'll update the expiration date accordingly
        if (member.communicationDisabledUntil && +member.communicationDisabledUntil > Number(task.expires) + 10000) {
          await client.db.task.update({
            where: {
              id: task.id
            },
            data: {
              expires: +member.communicationDisabledUntil
            }
          });

          continue;
        }

        const unDM = new EmbedBuilder()
          .setAuthor({ name: `${client.user!.username}`, iconURL: client.user!.displayAvatarURL() })
          .setTitle(
            `You've been ${
              pastTensePunishmentTypes[unPunish.type.toLowerCase() as keyof typeof pastTensePunishmentTypes]
            } ${unPunish.type === PunishmentType.Ban ? 'from' : 'in'} ${guild.name}`
          )
          .setColor(Colors.Green)
          .addFields({ name: 'Reason', value: `${unPunish.reason}` })
          .setFooter({ text: `Punishment ID: ${unPunish.id}` })
          .setTimestamp();

        await member.send({ embeds: [unDM] }).catch(() => {});
      }

      await client.db.task.delete({
        where: {
          id: task.id
        }
      });

      await client.punishments.createLog(unPunish);
    }
  }
}, MS_1_MINUTE);
