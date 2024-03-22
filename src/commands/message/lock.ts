import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits as Permissions, Colors, Message, TextChannel, VoiceChannel } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getChannel, getFlag, sleep } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'lock',
  description: 'Restrict members from sending messages in the target channel or in all channels.',
  args: ['[channel] <reason> [--all] [--silent]'],
  guildResolve: true,
  clientPermissions: [Permissions.ManageChannels],
  userPermissions: [Permissions.ManageMessages]
})
class LockCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const lockAllFlag = await getFlag(message.content, 'all', 'a');
    if (lockAllFlag?.value) {
      const lockAllFlagTokens = lockAllFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(lockAllFlagTokens[0]), lockAllFlagTokens.length);
    }

    const silentFlag = await getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (
      !config.lock ||
      !config.lock.channels ||
      config.lock.channels.length === 0 ||
      !config.lock.overrides ||
      config.lock.overrides === 0n
    )
      return message.reply(
        '**Configuration error.**\n> The command could not be executed as there is no lock configuration for this guild.\n> To fix this, please fill in the values in the configuration file.'
      );

    const lockChannels = config.lock.channels;
    const lockOverrides = BigInt(config.lock.overrides);

    if (!lockAllFlag) {
      let channel = args.length > 0 ? getChannel(message.guild, args[0]) : null;
      if (channel) args.shift();
      else channel = message.channel;

      if (!channel.isTextBased() && !channel.isVoiceBased()) throw 'This type of channel cannot be locked.';
      if (channel.isThread()) throw 'This type of channel cannot be locked.';

      if (!message.guild.members.me!.permissions.has(Permissions.Administrator)) {
        if (!channel.permissionsFor(message.guild.members.me!).has(Permissions.ManageChannels))
          return message.reply(
            "**Configuration error.**\n> I could not execute this command as I'm missing the `Manage Channel` permission in this channel.\n> To fix this, please give me the `Manage Channel` permission."
          );

        if (
          !channel.permissionOverwrites.cache.some(override => {
            if (override.id === message.guildId) return false;
            if (!override.allow.has(lockOverrides)) return false;

            return true;
          })
        )
          throw "I can't lock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`. Or, give me the `Administrator` permission.";
      }

      const reason = args.join(' ');
      if (!reason) throw 'You must provide a reason to lock a channel.';
      if (reason.length > 3500)
        throw `The reason may only be a maximum of 3500 characters (${reason.length} provided).`;

      const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
      const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
      const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

      const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
      if (newOverride === everyoneOverrideDeny) throw 'That channel is already locked.';

      const replyToMeLaterLol = await message.channel.send('Locking channel...');

      await channel.permissionOverwrites.set(
        [
          ...channel.permissionOverwrites.cache.values(),
          {
            id: message.guildId,
            deny: newOverride
          }
        ],
        reason
      );

      if ((everyoneOverrideAllow & lockOverrides) !== 0n) {
        const data = {
          guildId: message.guildId,
          channelId: channel.id,
          allow: everyoneOverrideAllow & lockOverrides
        };

        await this.client.db.lock.upsert({
          where: {
            channelId: channel.id
          },
          create: data,
          update: data
        });
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setAuthor({ name: `${this.client.user!.username}`, iconURL: this.client.user!.displayAvatarURL() })
        .setTitle('Channel Locked')
        .setDescription(
          `The channel has been locked by a staff member. You are not muted.\nMore information will be sent here eventually.`
        )
        .addFields({ name: 'Reason', value: `${reason}` })
        .setTimestamp();

      if (!silentFlag)
        return channel.send({ embeds: [embed] }).then(() => {
          if (channel?.id !== message.channelId || silentFlag) replyToMeLaterLol.reply('Channel locked.');
        });
    } else if (lockAllFlag) {
      const reason = args.join(' ');
      if (!reason) throw 'You must provide a reason to lock the server.';
      if (reason.length > 3500)
        throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;
      const replyToMeLaterLol = await message.channel.send(`Lockdown started...`);

      for (const channelId of lockChannels) {
        const channel = message.guild.channels.cache.get(channelId) as TextChannel | VoiceChannel | null;
        if (!channel) continue;

        if (!message.guild.members.me!.permissions.has(Permissions.Administrator)) {
          if (!channel.permissionsFor(message.guild.members.me!).has(Permissions.ManageChannels)) continue;

          if (
            !channel.permissionOverwrites.cache.some(override => {
              if (override.id === message.guildId) return false;
              if (!override.allow.has(lockOverrides)) return false;

              return true;
            })
          )
            continue;
        }

        const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
        const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
        const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

        const newOverride = everyoneOverrideDeny + (lockOverrides - (everyoneOverrideDeny & lockOverrides));
        if (newOverride === everyoneOverrideDeny) continue;

        await channel.permissionOverwrites.set(
          [
            ...channel.permissionOverwrites.cache.values(),
            {
              id: message.guildId,
              deny: newOverride
            }
          ],
          reason
        );

        if ((everyoneOverrideAllow & lockOverrides) !== 0n) {
          const data = {
            guildId: message.guildId,
            channelId: channel.id,
            allow: everyoneOverrideAllow & lockOverrides
          };

          await this.client.db.lock.upsert({
            where: {
              channelId: channel.id
            },
            create: data,
            update: data
          });
        }

        if (channelId !== message.channelId && channel.isTextBased() && !silentFlag) {
          await channel
            .send(`The server is on lockdown. Look in ${message.channel.toString()} for more information.`)
            .catch(() => {});
        }
        await sleep(1000);
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setAuthor({ name: `${this.client.user?.username}`, iconURL: this.client.user?.displayAvatarURL() })
        .setTitle('Server Locked')
        .setDescription(
          `__You are not muted, no one can talk.__\n\nPlease do not contact any staff members to ask why, updates will be posted here eventually.`
        )
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] }).then(() => {
        replyToMeLaterLol.channel.send('Lockdown completed.');
      });
    }
  }
}

export default LockCommand;
