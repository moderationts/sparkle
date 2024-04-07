import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
  GuildMember
} from 'discord.js';
import Button from '../lib/structs/Button';
import { bin, getMember, getUser } from '../lib/util/functions';
import { mainColor } from '../lib/util/constants';
import { ReportType } from '@prisma/client';

class ReportManagerButton extends Button {
  constructor() {
    super('report-manager');
  }

  async run(interaction: ButtonInteraction<'cached'>) {
    const method = interaction.customId.split(':')[1].split('.')[0] as 'accept' | 'deny' | 'disregard' | 'context';
    const reportId = interaction.customId.split('.')[1];
    const userId = interaction.customId.split('.')[2];

    const report = await this.client.db.report.findUnique({
      where: {
        id: reportId
      }
    });

    if (!report) {
      const acceptedButton = new ButtonBuilder()
        .setCustomId('?')
        .setLabel('Accepted')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(acceptedButton);

      const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Green);

      return interaction.editReply({ components: [row], embeds: [embed] });
    }

    switch (report.type) {
      case ReportType.User: {
        switch (method) {
          case 'accept': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const acceptButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Accepted')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(acceptButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Green);

            interaction.editReply({ components: [row], embeds: [embed] });

            const reporter = await getUser(report.reporterId);
            const user = await getUser(userId);

            const acceptEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()!
              })
              .setColor(Colors.Green)
              .setTitle('Report Accepted')
              .setDescription(
                `Hey ${reporter!.toString()}! Your report in from <t:${Math.floor(
                  Number(report.date / 1000n)
                )}:R> has been accepted.\nYou reported ${user!.toString()} (\`${
                  user!.id
                }\`) for [this reason](${await bin(report.reason)}).`
              )
              .setFooter({ text: `Report ID: ${report.id}` })
              .setTimestamp();

            await reporter?.send({ embeds: [acceptEmbed] }).catch(() => {});
            return;
          }
          case 'deny': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const denyButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Denied')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(denyButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Red);

            interaction.editReply({ components: [row], embeds: [embed] });

            const reporter = await getUser(report.reporterId);
            const user = await getUser(userId);

            const denyEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()!
              })
              .setColor(Colors.Red)
              .setTitle('Report Denied')
              .setDescription(
                `Hey ${reporter!.toString()}! Your report in from <t:${Math.floor(
                  Number(report.date / 1000n)
                )}:R> has been denied.\nYou reported ${user!.toString()} (\`${
                  user!.id
                }\`) for [this reason](${await bin(report.reason)}).`
              )
              .setFooter({ text: `Report ID: ${report.id}` })
              .setTimestamp();

            await reporter?.send({ embeds: [denyEmbed] }).catch(() => {});
            return;
          }
          case 'disregard': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const disregardButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Disregarded')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(disregardButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Grey);

            return interaction.editReply({ components: [row], embeds: [embed] });
          }
          case 'context': {
            const user = (await getMember(interaction.guild, userId)) ?? (await getUser(userId));
            if (!user) throw 'Invalid user.';

            const createdStr = Math.floor(
              (user instanceof GuildMember ? user.user.createdTimestamp : user.createdTimestamp) / 1000
            );
            const joinedStr = user instanceof GuildMember ? Math.floor(user.joinedTimestamp! / 1000) : null;

            const alts = await this.client.db.alt.findMany({
              where: {
                guildId: interaction.guildId,
                mainId: user.id
              }
            });

            const altNames = await Promise.all(
              alts.map(async alt => {
                const altUser = await this.client.users.fetch(alt.id);
                return `${altUser.toString()}`;
              })
            );

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
                }\n**Bot:** ${(user instanceof GuildMember ? user.user.bot : user.bot) ? 'Yes' : 'No'}${
                  alts.length > 0 ? `\n**Alts:** ${altNames.join(', ')}` : ''
                }${user instanceof GuildMember ? `\n**Roles:** ${user.roles.cache.map(role => role).join(', ')}` : ''}`
              );

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
          }
        }
      }
      case ReportType.Message: {
        switch (method) {
          case 'accept': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const acceptButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Accepted')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(acceptButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Green);

            interaction.editReply({ components: [row], embeds: [embed] });

            const reporter = await getUser(report.reporterId);
            const user = await getUser(userId);

            const acceptEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()!
              })
              .setColor(Colors.Green)
              .setTitle('Message Report Accepted')
              .setDescription(
                `Hey ${reporter!.toString()}! Your message report from <t:${Math.floor(
                  Number(report.date / 1000n)
                )}:R> has been accepted.\nYou reported a message from ${user!.toString()} (\`${
                  user!.id
                }\`) for [this reason](${await bin(report.reason)}).`
              )
              .setFooter({ text: `Report ID: ${report.id}` })
              .setTimestamp();

            await reporter?.send({ embeds: [acceptEmbed] }).catch(() => {});
            return;
          }
          case 'deny': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const denyButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Denied')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(denyButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Red);

            interaction.editReply({ components: [row], embeds: [embed] });

            const reporter = await getUser(report.reporterId);
            const user = await getUser(userId);

            const denyEmbed = new EmbedBuilder()
              .setAuthor({
                name: `${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()!
              })
              .setColor(Colors.Red)
              .setTitle('Message Report Denied')
              .setDescription(
                `Hey ${reporter!.toString()}! Your report from <t:${Math.floor(
                  Number(report.date / 1000n)
                )}:R> has been denied.\nYou reported a message from ${user!.toString()} (\`${
                  user!.id
                }\`) for [this reason](${await bin(report.reason)}).`
              )
              .setFooter({ text: `Report ID: ${report.id}` })
              .setTimestamp();

            await reporter?.send({ embeds: [denyEmbed] }).catch(() => {});
            return;
          }
          case 'disregard': {
            await interaction.deferUpdate();
            await this.client.db.report
              .delete({
                where: {
                  id: reportId,
                  userId: userId,
                  guildId: interaction.guildId
                }
              })
              .catch(() => {});

            const disregardButton = new ButtonBuilder()
              .setCustomId('?')
              .setLabel('Disregarded')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true);

            const row = new ActionRowBuilder<ButtonBuilder>();
            row.addComponents(disregardButton);

            const embed = new EmbedBuilder(interaction.message.embeds[0] as EmbedData).setColor(Colors.Grey);

            return interaction.editReply({ components: [row], embeds: [embed] });
          }
          case 'context': {
            const user = (await getMember(interaction.guild, userId)) ?? (await getUser(userId));
            if (!user) throw 'Invalid user.';

            const createdStr = Math.floor(
              (user instanceof GuildMember ? user.user.createdTimestamp : user.createdTimestamp) / 1000
            );
            const joinedStr = user instanceof GuildMember ? Math.floor(user.joinedTimestamp! / 1000) : null;

            const alts = await this.client.db.alt.findMany({
              where: {
                guildId: interaction.guildId,
                mainId: user.id
              }
            });

            const altNames = await Promise.all(
              alts.map(async alt => {
                const altUser = await this.client.users.fetch(alt.id);
                return `${altUser.toString()}`;
              })
            );

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
                }\n**Bot:** ${(user instanceof GuildMember ? user.user.bot : user.bot) ? 'Yes' : 'No'}${
                  alts.length > 0 ? `\n**Alts:** ${altNames.join(', ')}` : ''
                }${user instanceof GuildMember ? `\n**Roles:** ${user.roles.cache.map(role => role).join(', ')}` : ''}`
              );

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
          }
        }
      }
    }
  }
}

export default ReportManagerButton;
