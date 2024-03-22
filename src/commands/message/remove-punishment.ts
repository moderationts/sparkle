import { PermissionFlagsBits, EmbedBuilder, Colors, Message, MessageCollector } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { genID, getFlag, getMember, throwError } from '../../lib/util/functions';
import { PunishmentType } from '../../lib/util/constants';
import { ConfigData, PunishmentEdit } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'remove-punishment',
  description: 'Remove a punishment.',
  args: '<id> <reason> [--undo-punishment] [--silent]',
  aliases: ['rmwarn', 'del-pun', 'rmpunish'],
  clientPermissions: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.BanMembers],
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class RemovePunishmentCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const undoFlag = getFlag(message.content, 'undo', 'undo-punishment', 'u');
    if (undoFlag?.value) {
      const undoFlagTokens = undoFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(undoFlagTokens[0]), undoFlagTokens.length);
    }

    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a punishment ID to remove.';

    const id = args[0];
    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to remove a punishment.';

    const punishment = await this.client.db.punishment.findUnique({
      where: {
        id
      },
      include: {
        guild: true
      }
    });

    if (!punishment || punishment.guildId !== message.guildId) throw 'No punishment with that ID exists in this guild.';
    if (
      punishment.moderatorId !== message.author.id &&
      !message.member!.roles.cache.some(role => config.punishments?.managers?.includes(role.id))
    )
      throw 'You must be a punishment manager to remove a punishment not given by you.';

    if (undoFlag && punishment.type !== PunishmentType.Ban && punishment.type !== PunishmentType.Mute)
      throw 'You can only undo ban or mute punishments.';

    await message.reply(
      `Are you sure you want to remove the ${punishment.type.toLowerCase()} punishment \`${punishment.id}\` for <@!${
        punishment.userId
      }> (${
        punishment.userId
      })? This is a dangerous operation and it cannot be undone. To confirm say \`yes\`. To cancel say \`cancel\`.`
    );

    const filter = (response: { content: string; author: { id: string } }) => {
      return ['yes', 'cancel'].includes(response.content.toLowerCase()) && response.author.id === message.author.id;
    };

    const collector = new MessageCollector(message.channel, { filter, time: 15000 });

    collector.on('collect', async response => {
      if (response.content.toLowerCase() === 'yes') {
        if (undoFlag) {
          switch (punishment.type) {
            case PunishmentType.Ban:
              await message.guild.members.unban(punishment.userId, reason).catch(() => {
                collector.stop();
                return message.reply('That user is not banned.');
              });
              break;
            case PunishmentType.Mute:
              await message.guild.members
                .fetch(punishment.userId)
                .then(member => member.timeout(null, reason))
                .catch(() => {
                  collector.stop();
                  return message.reply(
                    'I could not undo the punishment because the user is no longer in the server or because of inadequete hierarchy.'
                  );
                });
              break;
          }

          const newPun = await this.client.db.punishment.create({
            data: {
              id: genID(),
              guildId: message.guildId,
              userId: punishment.userId,
              moderatorId: message.author.id,
              type: punishment.type === PunishmentType.Ban ? PunishmentType.Unban : PunishmentType.Unmute,
              reason: `${reason}`,
              date: BigInt(Date.now())
            }
          });

          this.client.punishments.createLog(newPun);
        }

        await this.client.db.punishment.delete({
          where: {
            id
          }
        });

        await this.client.db.task
          .delete({
            where: {
              userId_guildId_type: {
                userId: punishment.userId,
                guildId: message.guildId,
                type: punishment.type
              }
            }
          })
          .catch(() => {});

        const notifyDM = new EmbedBuilder()
          .setAuthor({ name: `${this.client.user!.username}`, iconURL: this.client.user!.displayAvatarURL() })
          .setTitle(`${punishment.type} Punishment Removed`)
          .setColor(Colors.Green)
          .addFields(
            {
              name: 'Reason',
              value: reason
            },
            {
              name: 'Actions',
              value: undoFlag
                ? `You were also ${punishment.type === PunishmentType.Mute ? 'unmuted' : 'unbanned'}.`
                : 'None'
            }
          )
          .setFooter({ text: `Original Punishment ID: ${punishment.id}` })
          .setTimestamp();

        const member = await getMember(message.guildId, punishment.userId);
        if (member && !silentFlag) member.send({ embeds: [notifyDM] }).catch(() => {});

        await message.channel.send(
          `${punishment.type.toString()} punishment \`${punishment.id}\` for <@${punishment.userId}> (${
            punishment.userId
          }) has been removed. ${
            undoFlag
              ? `The ${punishment.type === PunishmentType.Mute ? 'member' : 'user'} was also ${
                  punishment.type === PunishmentType.Mute ? 'unmuted' : 'unbanned'
                }.`
              : ''
          }`
        );

        this.client.punishments.createEditLog(
          {
            id,
            guildId: message.guildId,
            userId: punishment.userId,
            moderatorId: message.author.id,
            type: punishment.type,
            reason: `${reason}`,
            deleted: true
          } as PunishmentEdit,
          'delete'
        );
      } else if (response.content.toLowerCase() === 'cancel') {
        message.channel.send('Operation canceled.');
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        message.channel.send('Confirmation timed out. Operation automatically canceled.');
      }
    });
  }
}
export default RemovePunishmentCommand;
