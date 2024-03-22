import { PermissionFlagsBits, EmbedBuilder, type EmbedField, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { infractionsPerPage, mainColor } from '../../lib/util/constants';
import { getFlag, getUser } from '../../lib/util/functions';
import { PunishmentType } from '../../lib/util/constants';

@properties<'message'>({
  name: 'punishments',
  description: "View a user's (or your own) current punishments.",
  args: '<user> [page] [--automod]',
  aliases: ['warnings', 'warns', 'strikes'],
  commandChannel: true
})
class PunishmentsCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    const automodFlag = getFlag(message.content, 'automod', 'a', 'auto');
    if (automodFlag?.value) {
      const automodFlagTokens = automodFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(automodFlagTokens[0]), automodFlagTokens.length);
    }

    let user = await getUser(args[0]);

    let page = 1;
    if (!user && parseInt(args[1])) page = +args[1];
    else if (parseInt(args[0]) && !user) page = parseInt(args[0]);
    else if (user && parseInt(args[1])) page = +args[1];

    if (!user) user = message.author;

    if (user !== message.author && !message.member!.permissions.has(PermissionFlagsBits.ModerateMembers))
      user = message.author;

    const punishmentCount = await this.client.db.punishment.count({
      where: {
        guildId: message.guildId,
        userId: user.id,
        automod: automodFlag ? true : false
      }
    });

    if (punishmentCount === 0)
      return message.reply(
        `${user === message.author ? 'You have' : 'That user has'} no ${automodFlag ? 'automod ' : ''}strikes.`
      );
    const pages = Math.ceil(punishmentCount / 7);
    if (page > pages) page = pages;

    const punishments = await this.client.db.punishment.findMany({
      where: {
        guildId: message.guildId,
        userId: user.id,
        automod: automodFlag ? true : false
      },
      orderBy: {
        id: 'desc'
      },
      take: infractionsPerPage,
      skip: infractionsPerPage * (page - 1)
    });

    const punishmentsEmbed = new EmbedBuilder()
      .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })
      .setDescription(`All ${automodFlag ? 'automod ' : ''}punishments for ${user.toString()}.`)
      .setColor(mainColor)
      .setFooter({ text: `Page ${page}/${pages}` });

    const fields: EmbedField[] = [];
    for (const punishment of punishments) {
      const moderator = await getUser(punishment.moderatorId);
      const field: EmbedField = {
        name: `ID: ${punishment.id} | Moderator: ${
          message.member!.permissions.has(PermissionFlagsBits.ModerateMembers) ? `${moderator!.username}` : 'Hidden'
        }`,
        value: `**${punishment.type.toString()}** - ${punishment.reason.slice(0, 100)}${
          punishment.reason.length > 100 ? '...' : ''
        } - <t:${Math.floor(Number(punishment.date / 1000n))}>${
          punishment.type === PunishmentType.Mute
            ? ` (Expires <t:${Math.floor(Number(punishment.expires! / 1000n))}:R>)`
            : ''
        }`,
        inline: false
      };

      fields.push(field);
    }

    punishmentsEmbed.setFields(fields);

    return message.channel.send({ embeds: [punishmentsEmbed] });
  }
}

export default PunishmentsCommand;
