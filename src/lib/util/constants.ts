import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } from 'discord.js';
import ms from 'ms';

export const infractionsPerPage = 7;

export const yesButton = new ButtonBuilder().setLabel('Yes').setStyle(ButtonStyle.Success).setCustomId('?yes');

export const noButton = new ButtonBuilder().setLabel('No').setStyle(ButtonStyle.Danger).setCustomId('?no');

export const yesNoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

export const mainColor = 0x1e1f22;
export const secondaryColor = 0x9b9b97;
export const commonChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
export const domainReg = /(?:[A-z0-9](?:[A-z0-9-]{0,61}[A-z0-9])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/;
export const urlReg = /http(s):\/\/(?:[A-z0-9](?:[A-z0-9-]{0,61}[A-z0-9])?\.)+[A-z0-9][A-z0-9-]{0,61}[A-z0-9]/;
export const pastTensePunishmentTypes = {
  ban: 'banned',
  kick: 'kicked',
  mute: 'muted',
  warn: 'warned',
  unban: 'unbanned',
  unmute: 'unmuted'
};

export const punishmentColors = {
  Warn: Colors.Yellow,
  Mute: Colors.Yellow,
  Kick: Colors.Yellow,
  Ban: Colors.Red,
  Unmute: Colors.Green,
  Unban: Colors.Green
};

export const d28 = ms('28d');

export const channelPermissionOverrides = [
  { name: 'Add Reactions', value: 'AddReactions' },
  { name: 'Attach Files', value: 'AttachFiles' },
  { name: 'Connect', value: 'Connect' },
  { name: 'Create Invite', value: 'CreateInstantInvite' },
  { name: 'Create Private Threads', value: 'CreatePrivateThreads' },
  { name: 'Create Public Threads', value: 'CreatePublicThreads' },
  { name: 'Embed Links', value: 'EmbedLinks' },
  { name: 'Manage Channel', value: 'ManageChannels' },
  { name: 'Manage Messages', value: 'ManageMessages' },
  { name: 'Manage Threads', value: 'ManageThreads' },
  { name: 'Manage Webhooks', value: 'ManageWebhooks' },
  { name: 'Mention Everyone', value: 'MentionEveryone' },
  { name: 'Priority Speaker', value: 'PrioritySpeaker' },
  { name: 'Read Message History', value: 'ReadMessageHistory' },
  { name: 'Request to Speak', value: 'RequestToSpeak' },
  { name: 'Send Messages', value: 'SendMessages' },
  { name: 'Send Messages in Threads', value: 'SendMessagesInThreads' },
  { name: 'Send TTS Messages', value: 'SendTTSMessages' },
  { name: 'Send Voice Messages', value: 'SendVoiceMessages' },
  { name: 'Speak', value: 'Speak' },
  { name: 'Stream', value: 'Stream' },
  { name: 'Use Application Commands', value: 'UseApplicationCommands' },
  { name: 'Use Activities', value: 'UseEmbeddedActivities' },
  { name: 'Use External Emojis', value: 'UseExternalEmojis' },
  { name: 'Use External Sounds', value: 'UseExternalSounds' },
  { name: 'Use External Stickers', value: 'UseExternalStickers' },
  { name: 'Use Soundboard', value: 'UseSoundboard' },
  { name: 'Use Voice-Activity-Detection (VAD)', value: 'UseVAD' },
  { name: 'View Channel', value: 'ViewChannel' }
];

export const commonDurations = [
  { name: '1 minute', value: '1 minute' },
  { name: '10 minutes', value: '10 minutes' },
  { name: '30 minutes', value: '30 minutes' },
  { name: '1 hour', value: '1 hour' },
  { name: '6 hours', value: '6 hours' },
  { name: '12 hours', value: '12 hours' },
  { name: '1 day', value: '1 day' }
];

export const commonDurationUnits = ['second', 'minute', 'hour', 'day', 'week'];

export enum PreconditionType {
  PunishmentEditor = 'Punishment Editor',
  PunishmentManager = 'Punishment Manager'
}

export const safeCommands = ['ping', 'yeet', 'bean', 'help', 'userinfo', 'avatar', 'config'];

export enum PunishmentType {
  Warn = 'Warn',
  Mute = 'Mute',
  Kick = 'Kick',
  Ban = 'Ban',
  Unmute = 'Unmute',
  Unban = 'Unban'
}
