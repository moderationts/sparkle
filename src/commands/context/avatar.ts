import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  PermissionFlagsBits,
  UserContextMenuCommandInteraction
} from 'discord.js';
import CtxMenu, { ctxdata } from '../../lib/structs/Context';
import { mainColor } from '../../lib/util/constants';

@ctxdata(
  new ContextMenuCommandBuilder()
    .setName('avatar')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
)
class AvatarCtxMenu extends CtxMenu {
  async run(interaction: UserContextMenuCommandInteraction) {
    if (!interaction.isUserContextMenuCommand()) throw 'This command can only be ran on a user.';

    const user = interaction.targetUser;

    return interaction.reply({
      embeds: [
        {
          author: { name: `${user.username}'s Avatar`, icon_url: user.displayAvatarURL() },
          image: { url: user.displayAvatarURL({ size: 4096 }) },
          color: mainColor
        }
      ],
      ephemeral: true
    });
  }
}

export default AvatarCtxMenu;
