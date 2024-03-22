import { PermissionFlagsBits, type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'alt-manager',
  description: 'Manage the alt accounts of a user.',
  aliases: ['alts'],
  args: ['alt-manager add <user> <alt>', 'alt-manager remove <user> <alt>', 'alt-manager view <user>'],
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class AltManagerCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0)
      throw "You must provide a subcommand option. View this command's help menu for more information.";

    if (!['view', 'add', 'remove'].includes(args[0]))
      throw "Invalid subcommand option. View this command's help menu for all available options.";
    const subcmd = args[0];

    args.shift();
    switch (subcmd) {
      case 'add': {
        if (args.length === 0) throw 'You must provide a user to assign an alt to.';
        if (args.length === 1) throw 'You must provide an alt to assign.';

        const user = await getUser(args[0]);
        const alt = await getUser(args[1]);

        if (!user) throw 'Invalid user.';
        if (!alt) throw 'Invalid alt.';

        const reg = await this.client.db.alt.create({
          data: {
            id: alt.id,
            mainId: user.id,
            guildId: message.guildId
          }
        });

        return message.channel.send(
          `Assigned alt ${alt.toString()} (${alt.id}) to user ${user.toString()} (${user.id}).`
        );
      }
      case 'remove': {
        if (args.length === 0) throw 'You must provide a user to remove an alt from.';
        if (args.length === 1) throw 'You must provide an alt to remove.';

        const user = await getUser(args[0]);
        const alt = await getUser(args[1]);

        if (!user) throw 'Invalid user.';
        if (!alt) throw 'Invalid alt.';

        const reg = await this.client.db.alt.findUnique({
          where: {
            id: alt.id,
            mainId: user.id,
            guildId: message.guildId
          }
        });

        if (!reg) throw 'That alt has not been assigned to that user.';

        await this.client.db.alt.delete({
          where: {
            id: alt.id,
            mainId: user.id,
            guildId: message.guildId
          }
        });

        return message.channel.send(
          `Removed alt ${alt.toString()} (${alt.id}) from user ${user.toString()} (${user.id}).`
        );
      }
      case 'view': {
        const user = await getUser(args[0]);
        if (!user) throw 'Invalid user.';

        const alts = await this.client.db.alt.findMany({
          where: {
            mainId: user.id,
            guildId: message.guildId
          }
        });

        if (alts.length === 0)
          return message.channel.send(`There are no alts assigned to ${user.toString()} (${user.id}).`);

        const altNames = await Promise.all(
          alts.map(async alt => {
            const altUser = await this.client.users.fetch(alt.id);
            return `${altUser.toString()}`;
          })
        );

        return message.channel.send(
          `${user.toString()} (${user.id}) has the following alts registered: ${altNames.join(', ')}`
        );
      }
    }
  }
}

export default AltManagerCommand;
