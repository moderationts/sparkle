import Command, { properties } from '../../lib/structs/Command';
import { PermissionFlagsBits, Message, DefaultUserAgent } from 'discord.js';
import { ConfigData } from '../../lib/structs/Interfaces';
import * as yaml from 'js-yaml';
import { bin } from '../../lib/util/functions';

@properties<'message'>({
  name: 'config',
  description: 'Configuration related commands.',
  args: 'view',
  aliases: ['cfg'],
  userPermissions: PermissionFlagsBits.Administrator
})
class ConfigCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    if (args.length === 0)
      throw "You must provide a subcommand option. View this command's help menu for more information.";

    if (!['view'].includes(args[0]))
      throw "Invalid subcommand option. View this command's help menu for all available options.";
    const subcmd = args[0];

    switch (subcmd) {
      case 'view':
        const yamlString = yaml.dump(
          JSON.parse(JSON.stringify(config, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))
        );

        const url = await bin(yamlString, 'yaml');
        return message.channel.send(
          `You can view the contents of your configuration file [in this page](${url}).\nNote that things may look different compared to how they are in the actual file.`
        );
    }
  }
}

export default ConfigCommand;
