import { CHANNEL_IDS, queueNameForChannel } from './types.js'
import { assembleEmailHtml } from './channels/email/emailAssembler.js'
import { registerEmailChannelSync } from './channels/email/emailChannel.js'
import { registerWhatsAppChannel } from './channels/whatsapp/whatsappChannel.js'
import { registerSmsChannel } from './channels/sms/smsChannel.js'

export function registerAllChannels() {
  registerEmailChannelSync()
  registerWhatsAppChannel()
  registerSmsChannel()
}

export { CHANNEL_IDS, queueNameForChannel, assembleEmailHtml }
