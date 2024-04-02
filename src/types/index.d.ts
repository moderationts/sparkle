import { PunishmentType } from '@prisma/client';
import { PreconditionType } from '../lib/util/constants';

export type AutoModSpamTrigger = {
  amount: number;
  within: number;
};

export type EscalationType = 'Manual' | 'AutoMod';

export type Escalation = {
  amount: number;
  within: `${number}`;
  punishment: PunishmentType;
  duration: `${number}`;
};

type MessageCommandProperties = {
  name: string;
  description: string;
  args?: string | string[];
  clientPermissions?: bigint | bigint[];
  userPermissions?: bigint | bigint[];
  aliases?: string[];
  commandChannel?: boolean;
  guildResolve?: boolean;
  slashOnly?: boolean;
  precondition?: PreconditionType;
};

export type CommandProperties<M extends 'slash' | 'message'> = M extends 'message'
  ? MessageCommandProperties
  : {
      clientPermissions?: bigint | bigint[];
      userPermissions?: bigint | bigint[];
      guildResolve?: boolean;
      commandChannel?: boolean;
      precondition?: PreconditionType;
    };
