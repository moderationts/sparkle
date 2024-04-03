# Dan's Utilities

This file serves as documentation for the bot.
It is still a work in progress and will be updated over time.

### Disclaimer

This bot is meant for large servers, server owners who take owning a server seriously, or people who need a strong moderation bot.
For that reason it is not recommended that youself host it if you have a small, or medium sized server with not a lot of activity.
The code in this repository is provided on an "AS-IS" basis without warranties of any kind, and is a work in progress. You may edit it to your liking, however do be careful when doing so. Note that this bot is meant to be extremely similair to Sound's Utilities, and it was built with the purpose of replicating said bot as closely as possible.

## Requirements

Before you start, you muse ensure that you have the following:

- **Node JS**: NodeJS needs to be installed on your machine. See [this page](https://nodejs.org/en/download) for more information.
- **PostgreSQL Server:** You need to have a PostgreSQL Server up and running to store the data on.
- **Virtual Private Server (VPS) | Hosting Platform** You need to own and manage a VPS to run the code on. You may also use any other hosting platform, like [railway](https://railway.app/) for example. It is not recommended to host this bot on your personal computer or home network.

### Installation (VPS)

The following steps apply to a Windows, Mac, or Linux environment.
For linux users it is recommened that you create a new sudo user to host the bot and PostgreSQL server on.

1. Clone the repository or download it from this page

```bash
git clone https://github.com/jxstdan/dans-utilities.git
```

2. Navigate to the project directory

```bash
cd dans-utilities
```

3. Install the project dependencies using npm

```bash
npm install
```

4. Make sure your database matches the prisma schema

```bash
npx prisma db push
```

5. Compile the typescript code

```bash
npm run build
```

6. Start the bot by running the start command

```bash
npm run start
```

Please note that a `.env` file is required to run the bot. See [`.env.example`](https://github.com/jxstdan/dans-utilities/blob/main/.env.example) for an example of what variables need to be set.

## Configuration

All configuration files must be located in the [`config`](https://github.com/jxstdan/dans-utilities/tree/main/config) directory and their name must use the following format: `<guild-id>.yaml`. If the bot is added to a guild and no configuration file is found it will automaticlly leave.
For a full example of the configuration file, you may view the [`example.yaml`](https://github.com/jxstdan/dans-utilities/blob/main/config/example.yaml) file.

### Commands

The core configuration module. Allows you to configure the behavior of commands for the bot.
This section also allows you to configure channels in which non moderators can use commands, and permission overrides for specific roles.

```yaml
commands:
  prefix: '!' # Required for the bot to work
  enabled: true
  channels: ['channel-id'] # An array of channel ids in which non mods can use commands (e.x to view their punishments) (can be blank)
  overrides:
    - name: 'command-name' # The name of a command you want to override the default permissions for
      roles: ['role-id', 'role-id'] # An array of role ids that will have access to this command if they do not have the default required permissions
```

### Punishments

This section configures the behavior of punishments issued by moderators. Namely default durations, roles allowed to manage/edit punishments, and the additional information field in the punishment DMs.

```yaml
punishments:
  managers: ['role-id', 'role-id'] # An array of role ids (can be blank)
  editors: ['role-id', 'role-id'] # An array of role ids (can be blank)

  defaultWarnDuration: 123 # In milliseconds
  defaultMuteDuration: 123 # In milliseconds (cannot be longer than 28 days)
  defaultBanDuration: 123 # In milliseconds

  additionalInfo:
    warn: 'warn-info'
    mute: 'mute-info'
    kick: 'kick-info'
    ban: 'ban-info'
```

To convert units like seconds, minutes, hours, or days into milliseconds you can use [this tool](https://convertlive.com/u/convert/days/to/milliseconds).

### Lock

This section allows you to configure how channels (or the server) are locked. It is important to configure this beforehand as the `lock` and `unlock` commands will not work unless everything has been configured.

```yaml
lock:
  channels: ['channel-id', 'channel-id'] # An array of channel ids to lock when the --all flag is present (can be blank)
  overrides: 1234567890 # A bigint representing permissions that need to be denied
```

For more information on what overrides can be passed, see [this page](https://discordapi.com/permissions.html).

### Tags

This section allows you to configure the tags (reference texts) for the bot.

```yaml
tags:
  - name: 'mod' # The name of the tag
    aliases: [] # A list of alternative names for it, e.g ['moderation', 'mods']
    embed: # The embed that is going to get sent
      color: 0x00ffea # The format must be 0x followed by the hex color code
      title: 'Moderation Tag' # The title of the embed
      description: 'Some description...' # The description of the embed
      fields: # Fields
        - name: 'Requirements' # Field name
          value: 'Some requirements...' # Field description
          inline: false # Can be true as well, the recommended setting is false
```

For more information on what embed attributes can be passed, see [Discord Documentation](https://discord.com/developers/docs/resources/channel#embed-object).

### Automod

You know it, you love it. This section allows you to configure the behavior of the bot's automod.
Each automod module has it's own customInfo property (additional information field in dms) and fallbackResponse. The fallback response will get sent whenever automod punishes a user, and it's of the following format `${usermention}, ${fallbackResponse}`.
Below is a list of supported modules. Pay attention though, as this section can be really tricky!

* `filters` - Allows you to filter messages that contain specific words (can be multiple).
* `links` - Allows you to filter messages that contain specific non-whitelisted links (can be multiple).
* `mentions` - Allows you to filter messages that mention a certain group of users/user (can be multiple).
* `antiSpam` - Allows you to filter messages and prevent spam (contains sub modules).
  - `maxMentions` - The maximum number of mentions a message can have.
  - `maxAttachments` - The maximum number of media attachments a message can have.
  - `maxCharacters` - The maximum number of characters a message can have.

```yaml
automod:
  filters:
    - name: 'Example filter'
      enabled: true
      immuneRoles: ['role-id', 'role-id'] # An array of role ids immune to the automod module (can be blank)
      immuneChannels: ['channel-id', 'channel-id'] # An array of channel ids immune to the automod module (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      content: ['word 1', 'word 2'] # The list of words that need to be filtered

  links:
    - name: 'Example link filter'
      enabled: true
      immuneRoles: ['role-id', 'role-id'] # An array of role ids immune to the automod module (can be blank)
      immuneChannels: ['channel-id', 'channel-id'] # An array of channel ids immune to the automod module (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      whitelist: ['youtube.com', 'discord.com'] # The list of domains that are not considered a violation

  mentions:
    - name: 'Example mention filter'
      enabled: true
      immuneRoles: ['role-id', 'role-id'] # An array of role ids immune to the automod module (can be blank)
      immuneChannels: ['channel-id', 'channel-id'] # An array of channel ids immune to the automod modules (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      list: ['user-id', 'user-id'] # An array of user ids

  spamPrevention:
    maxMentions:
      enabled: true
      immuneRoles: [] # An array of role ids immune to the automod sub module (can be blank)
      immuneChannels: [] # An array of channel ids immune to the automod sub module (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      limit: 3 # The maximum number of mentions a message can have

    maxAttachments:
      enabled: true
      immuneRoles: [] # An array of role ids immune to the automod sub module (can be blank)
      immuneChannels: [] # An array of channel ids immune to the automod sub module (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      limit: 3 # The maximum number of attachments a message can have

    maxCharacters:
      enabled: true
      immuneRoles: [] # An array of role ids immune to the automod sub module (can be blank)
      immuneChannels: [] # An array of channel ids immune to the automod sub module (can be blank)
      punishment: 'Warn' / 'Mute' / 'Kick' / 'Ban'
      duration: 1234567890 # In milliseconds (not applicable for the kick punishment | cannot be longer than 28 days for mutes)
      customInfo: 'Example info' # A string that overrides the default additional information.
      fallbackResponse: 'Exampe response' # A message (string) that will get sent whenever automod punishes a user.
      limit: 3 # The maximum number of characters a message can have (300 recommended)
````

### Logging

This section allows you to configure the behavior of logs the bot sends to channels regarding specific events.
Below is a list of supported events. Please do note that only Text Channels are supported for logging.

- `punishments` - Triggers when a user is punished.
- `punishmentEdit` - Triggers when a punishment is edited (reason, duration), or is removed.
- `messages` - Triggers when a message (or group of messages) is deleted, or updated.
- `commands` - Triggers when a command is ran (including shortcuts).
- `mediaConversion` - Triggers when a message with no content but only attachments is sent into a channel and is converted to a link that never expires.

```yaml
logging:
  punishments:
    enabled: true
    channelId: 'channel-id' # The log channel where the logs will be sent
  punishmentEdit:
    enabled: true
    channelId: 'channel-id' # The log channel where edit/remove logs will be sent
  messages:
    enabled: true
    channelId: 'channel-id' # The log channel where edit/remove logs will be sent
    excluded: ['channel-id', 'channel-id'] # An array of channel ids in which updated/deleted messages will be ignored
  commands:
    enabled: true
    channelId: 'channel-id' # The log channel where the logs will be sent
  mediaConversion:
    enabled: true
    channelIds: ['channel-id'] # An array of channel ids in which messages with no content but just attachments will trigger the media conversion
    logChannelId: 'channel-id' # The log channel where the media will be stored.
```
