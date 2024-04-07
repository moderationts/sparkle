import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  PermissionFlagsBits,
  TextInputStyle,
  UserContextMenuCommandInteraction
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import Config from '../../lib/util/config';

@data<'context'>(
  new ContextMenuCommandBuilder()
    .setName('Report User')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
)
class ReportUserCtxMenu extends Command {
  async run(interaction: UserContextMenuCommandInteraction<'cached'>) {
    const config = Config.get(interaction.guildId)!;

    if (!config.data.reports?.enabled && !config.data.reports?.channelId)
      return interaction.reply({
        content: `**Configuration error.**\n> The command could not be executed as the reports module has not been configured for this server.\n> To fix this, please ask a bot operator to configure the settings in the configuration file.`,
        ephemeral: false
      });

    const user = interaction.targetUser;

    if (user === interaction.user) throw 'You cannot report yourself.';
    if (user === this.client.user) throw 'You cannot report me.';

    if (interaction.targetMember!.roles.cache.some(role => config.data.reports?.excluded.includes(role.id)))
      throw 'This user is immune to reports.';

    if (interaction.member.roles.cache.some(role => config.data.reports.blacklisted.includes(role.id)))
      throw 'You are blacklisted from creating reports.';

    const modal = new ModalBuilder();
    modal.setTitle('Report User').setCustomId(`report:user.${user.id}`);

    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
    const questionText = new TextInputBuilder()
      .setLabel('Reason')
      .setCustomId('reason')
      .setMinLength(50)
      .setMaxLength(500)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    row.setComponents(questionText);
    modal.components.push(row);

    interaction.showModal(modal);
  }
}

export default ReportUserCtxMenu;
