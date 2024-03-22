import { PermissionFlagsBits, Message, Colors, MessageCollector } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'yeet',
  description: 'Yeets you into oblivion.',
  userPermissions: PermissionFlagsBits.ManageMessages
})
class YeetCommand extends Command {
  async run(message: Message<true>) {
    await message.channel.send({ embeds: [{ description: 'Sure?', color: Colors.Red }] });

    const filter = (response: { content: string; author: { id: string } }) => {
      return response.content.trim().toLowerCase() !== '' && response.author.id === message.author.id;
    };

    const collector = new MessageCollector(message.channel, { filter, time: 15000 });

    collector.on('collect', async msg => {
      await message.channel.send({
        embeds: [{ description: 'SO YOU WANT ME TO BAN THEM, CORRECT?', color: Colors.Red }]
      });

      collector.stop();

      const nextMessageFilter = (response: { content: string; author: { id: string } }) => {
        return response.author.id === message.author.id;
      };

      const nextMessageCollector = new MessageCollector(message.channel, {
        filter: nextMessageFilter,
        time: 15000,
        max: 1
      });

      nextMessageCollector.on('collect', async () => {
        const progressEmbed = await message.channel.send({
          embeds: [{ description: `Banning ${message.guild!.memberCount} members... (2%)`, color: Colors.Red }]
        });
        let percentage = 0;

        const updateProgress = setInterval(() => {
          percentage += Math.floor(Math.random() * (17 - 1 + 1) + 1);

          if (percentage < 100) {
            progressEmbed.edit({
              embeds: [
                {
                  description: `Banning ${message.guild.memberCount} members... (${percentage}%)`,
                  color: Colors.Red
                }
              ]
            });
          } else {
            clearInterval(updateProgress);
            progressEmbed.channel.send('Nah.');
          }
        }, 3000);

        nextMessageCollector.stop();
      });

      nextMessageCollector.on('end', (_, reason) => {
        if (reason === 'time') {
          message.channel.send("You took too long to respond dude. I can't yeet anyone if you don't confirm it.");
        }
      });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        message.channel.send("You took too long to respond dude. I can't yeet anyone if you don't confirm it.");
      }
    });
  }
}

export default YeetCommand;
