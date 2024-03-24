import { PunishmentType } from '../util/constants';

export interface PunishmentEdit {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  type: PunishmentType;
  reason?: string;
  oldReason?: string;
  newReason?: string;
  oldExpiration?: bigint | number | null;
  newExpiration?: bigint | number | null;
  deleted?: boolean;
}

export interface ConfigData {
  commands: {
    prefix: string;
    enabled: boolean;
    channels?: string[];
    overrides?: { name: string; roles: string[] }[];
  };

  punishments?: {
    managers?: string[];
    editors?: string[];

    defaultWarnDuration?: bigint;
    defaultMuteDuration?: bigint;
    defaultBanDuration?: bigint;

    additionalInfo?: {
      warn: string;
      mute: string;
      kick: string;
      ban: string;
    };
  };

  lock?: {
    channels?: string[];
    overrides?: bigint;
  };

  automod?: {
    filters?: {
      name: string;
      enabled: boolean;
      immuneRoles: string[];
      immuneChannels: string[];
      punishment: PunishmentType | 'delete';
      duration?: number;
      customInfo?: string;
      fallbackResponse?: string;
      content: string[];
    }[];

    links?: {
      name: string;
      enabled: boolean;
      immuneRoles: string[];
      immuneChannels: string[];
      punishment: PunishmentType | 'delete';
      duration?: number;
      customInfo?: string;
      fallbackResponse?: string;
      whitelist: string[];
    }[];

    mentions?: {
      name: string;
      enabled: boolean;
      immuneRoles: string[];
      immuneChannels: string[];
      punishment: PunishmentType | 'delete';
      duration?: number;
      customInfo?: string;
      fallbackResponse?: string;
      list: string[];
    }[];

    antiSpam?: {
      maxMentions?: {
        enabled: boolean;
        immuneRoles: string[];
        immuneChannels: string[];
        punishment: PunishmentType | 'delete';
        duration?: number;
        customInfo?: string;
        fallbackResponse?: string;
        limit: number;
      };

      maxAttachments?: {
        enabled: boolean;
        immuneRoles: string[];
        immuneChannels: string[];
        punishment: PunishmentType | 'delete';
        duration?: number;
        customInfo?: string;
        fallbackResponse?: string;
        limit: number;
      };

      maxCharacters?: {
        enabled: boolean;
        immuneRoles: string[];
        immuneChannels: string[];
        punishment: PunishmentType | 'delete';
        duration?: number;
        customInfo?: string;
        fallbackResponse?: string;
        limit: number;
      };
    };
  };

  logging?: {
    punishments?: {
      enabled: boolean;
      channelId: string;
    };
    punishmentEdit?: {
      enabled: boolean;
      channelId: string;
    };
    messages?: {
      enabled: boolean;
      channelId: string;
      excluded?: string[];
    };
    commands?: {
      enabled: boolean;
      channelId: string;
    };
    mediaConversion?: {
      enabled: boolean;
      channelIds: string[];
      logChannelId: string;
    };
  };
}
