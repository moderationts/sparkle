import { PermissionFlagsBits, type Message, MessageCollector } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getFlag, getUser } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';
import { PreconditionType } from '../../lib/util/constants';

@properties<'message'>({
  name: 'remove-all-punishments',
  description: 'Remove all punishments from a user.',
  args: '<user> [--automod]',
  aliases: ['clear-warns', 'rm-all-punish', 'clear-all-warns', 'rap', 'cw'],
  userPermissions: PermissionFlagsBits.ModerateMembers,
  precondition: PreconditionType.PunishmentManager
})
class RemoveAllPunishmentsCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const automodFlag = getFlag(message.content, 'automod', 'a', 'auto');
    if (automodFlag?.value) {
      const automodFlagTokens = automodFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(automodFlagTokens[0]), automodFlagTokens.length);
    }

    if (!message.member!.roles.cache.some(role => config.punishments?.managers?.includes(role.id)))
      throw `You must be a punishment manager to remove all ${automodFlag ? 'automod ' : ''}punishments from a user.`;

    if (args.length === 0) throw `You must provide a user to remove all ${automodFlag ? 'automod ' : ''}punishments from.`;
    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';

    const reason = args.slice(1).join(' ');
    if (!reason) throw `You must provide a reason to remove all ${automodFlag ? 'automod ' : ''}punishments from a user.`;

    const count = await this.client.db.punishment.findMany({
      where: {
        userId: user.id,
        guildId: message.guildId,
        automod: automodFlag ? true : false
      }
    });

    if (count.length === 0) throw `That user has no ${automodFlag ? 'automod ' : ''}punishments in this guild.`;

    await message.reply(
      `Are you sure you want to remove ${count.length} ${automodFlag ? 'automod ' : ''}punishment${
        count.length > 1 ? 's' : ''
      } from ${user.toString()} (${
        user.id
      })? This is a dangerous operation and it cannot be undone. To confirm say \`yes\`. To cancel say \`cancel\`.`
    );

    const filter = (response: { content: string; author: { id: string } }) => {
      return ['yes', 'cancel'].includes(response.content.toLowerCase()) && response.author.id === message.author.id;
    };

    const collector = new MessageCollector(message.channel, { filter, time: 15000 });

    collector.on('collect', async response => {
      if (response.content.toLowerCase() === 'yes') {
        await this.client.db.punishment.deleteMany({
          where: {
            userId: user.id,
            guildId: message.guildId,
            automod: automodFlag ? true : false
          }
        });
        message.channel.send(
          `Removed ${count.length} ${automodFlag ? 'automod ' : ''}punishment${
            count.length > 1 ? 's' : ''
          } from ${user.toString()}.`
        );
        this.client.punishments.createEditLog(
          {
            id: '',
            guildId: message.guildId,
            userId: user.id,
            moderatorId: message.author.id,
            type: 'Warn'
          },
          'bulkdelete',
          count.map(punishment => punishment.id)
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

export default RemoveAllPunishmentsCommand;
