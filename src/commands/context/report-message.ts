import {
  ActionRowBuilder,
  ApplicationCommandType,
  Colors,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import Config from '../../lib/util/config';

@data<'context'>(
  new ContextMenuCommandBuilder()
    .setName('Report Message')
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
)
class ReportMessageCtxMenu extends Command {
  async run(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const config = Config.get(interaction.targetMessage.guildId)!;
    if (!config.data.reports?.message?.enabled && !config.data.reports?.message?.channelId)
      return interaction.reply({
        content: `**Configuration error.**\n> The command could not be executed as the message reports module has not been configured for this server.\n> To fix this, please ask a bot operator to configure the settings in the configuration file.`,
        ephemeral: false
      });

    if (interaction.targetMessage.author === interaction.user) throw 'You cannot report a message sent by yourself.';
    if (interaction.targetMessage.author === this.client.user) throw 'You cannot report a message sent by me.';

    const member = await interaction.guild.members.fetch(interaction.targetMessage.member!);
    if (member!.roles.cache.some(role => config.data.reports?.message?.excluded?.includes(role.id)))
      throw 'This user is immune to reports.';

    if (interaction.member!.roles.cache.some(role => config.data.reports?.message?.blacklist?.includes(role.id)))
      throw 'You are blacklisted from creating reports.';

    const message = interaction.targetMessage;

    const modal = new ModalBuilder();
    modal.setTitle('Report Message').setCustomId(`report:message.${message.id}.${message.channelId}`);

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

export default ReportMessageCtxMenu;
