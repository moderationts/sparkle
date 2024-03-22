import { EmbedBuilder } from '@discordjs/builders';
import { PermissionFlagsBits as Permissions, Colors, Message, TextChannel, VoiceChannel } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getChannel, getFlag, sleep } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'unlock',
  description: 'Allow members to speak in the target channel or in all channels.',
  args: ['[channel] <reason> [--all] [--silent]'],
  guildResolve: true,
  clientPermissions: [Permissions.ManageChannels],
  userPermissions: [Permissions.ManageMessages]
})
class UnlockCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const unlockAllFlag = await getFlag(message.content, 'all', 'a');
    if (unlockAllFlag?.value) {
      const unlockAllFlagTokens = unlockAllFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(unlockAllFlagTokens[0]), unlockAllFlagTokens.length);
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

    const lockOverrides = BigInt(config.lock.overrides);
    const lockChannels = config.lock.channels;

    if (!unlockAllFlag) {
      let channel = args.length > 0 ? getChannel(message.guild, args[0]) : null;
      if (channel) args.shift();
      else channel = message.channel;

      if (!channel.isTextBased() && !channel.isVoiceBased()) throw 'This type of channel cannot be unlocked.';
      if (channel.isThread()) throw 'This type of channel cannot be unlocked.';

      const lockAllow =
        (
          await this.client.db.lock.findUnique({
            where: {
              channelId: channel.id
            }
          })
        )?.allow ?? 0n;

      if (!message.guild.members.me!.permissions.has(Permissions.Administrator)) {
        if (!channel.permissionsFor(message.guild.members.me!).has(Permissions.ManageChannels))
          throw "I don't have permission to unlock this channel (Missing `Manage Channel` permissions.)";

        if (
          !channel.permissionOverwrites.cache.some(override => {
            if (override.id === message.guildId) return false;
            if (!override.allow.has(lockOverrides)) return false;

            return true;
          })
        )
          throw "I can't unlock this channel. Please create an override in this channel for me, setting the permissions I deny to `allow`, or give me the `Administrator` permission.";
      }

      const reason = args.join(' ');
      if (!reason) throw 'You must provide a reason to unlock a channel.';
      if (reason.length > 3500)
        throw `The reason may only be a maximum of 3500 characters (${reason.length} provided).`;

      const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
      const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
      const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

      const newDenyOverride = everyoneOverrideDeny - (everyoneOverrideDeny & lockOverrides);
      const newAllowOverride = everyoneOverrideAllow + (lockAllow - (everyoneOverrideAllow & lockAllow));

      if (lockAllow !== 0n)
        await this.client.db.lock.delete({
          where: {
            channelId: channel.id
          }
        });

      if (newDenyOverride === everyoneOverrideDeny) throw 'That channel is already unlocked.';

      const replyToMeLaterLol = await message.channel.send('Unlocking channel...');
      await channel.permissionOverwrites.set(
        [
          ...channel.permissionOverwrites.cache.values(),
          {
            id: message.guildId,
            allow: newAllowOverride,
            deny: newDenyOverride
          }
        ],
        reason
      );

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setAuthor({ name: `${this.client.user?.username}`, iconURL: this.client.user?.displayAvatarURL() })
        .setTitle('Channel Unlocked')
        .setDescription(`The channel has been unlocked, you may start chatting again.`)
        .addFields({ name: 'Reason', value: `${reason}` })
        .setTimestamp();

      return channel.send({ embeds: [embed] }).then(() => {
        if (channel?.id !== message.channelId || silentFlag) replyToMeLaterLol.reply('Channel unlocked.');
      });
    } else if (unlockAllFlag) {
      if (lockChannels.length === 0)
        throw 'This guild has no channels to unlock. To add some, please use `/config lock add-channel <channel>`';

      const reason = args.join(' ');
      if (!reason) throw 'You must provide a reason to unlock all channels.';
      if (reason.length > 3500)
        throw `The reason may only be a maximum of 3500 characters (${reason.length} provided).`;

      const replyToMeLaterLol = await message.channel.send(`Unlockdown started...`);

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

        const lockAllow =
          (
            await this.client.db.lock.findUnique({
              where: {
                channelId: channel.id
              }
            })
          )?.allow ?? 0n;

        const everyoneOverride = channel.permissionOverwrites.cache.get(message.guildId);
        const everyoneOverrideDeny = everyoneOverride?.deny.bitfield ?? 0n;
        const everyoneOverrideAllow = everyoneOverride?.allow.bitfield ?? 0n;

        const newDenyOverride = everyoneOverrideDeny - (everyoneOverrideDeny & lockOverrides);
        const newAllowOverride = everyoneOverrideAllow + (lockAllow - (everyoneOverrideAllow & lockAllow));

        if (lockAllow !== 0n)
          await this.client.db.lock.delete({
            where: {
              channelId: channel.id
            }
          });

        if (newDenyOverride === everyoneOverrideDeny) continue;

        await channel.permissionOverwrites.set(
          [
            ...channel.permissionOverwrites.cache.values(),
            {
              id: message.guildId,
              allow: newAllowOverride,
              deny: newDenyOverride
            }
          ],
          reason
        );

        if (channelId !== message.channelId && channel.isTextBased() && !silentFlag) {
          await channel.send(`The server has been unlocked, you may start chatting again.`).catch(() => {});
        }
        await sleep(1000);
      }

      const unlockEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setAuthor({ name: `${this.client.user?.username}`, iconURL: this.client.user?.displayAvatarURL() })
        .setTitle('Server Unlocked')
        .setDescription(`The server has been unlocked, you may start chatting again.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();
      return message.channel.send({ embeds: [unlockEmbed] }).then(() => {
        replyToMeLaterLol.channel.send('Unlockdown completed.');
      });
    }
  }
}

export default UnlockCommand;
