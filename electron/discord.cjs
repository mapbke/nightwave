const DiscordRPC = require('discord-rpc');

class DiscordPresence {
  constructor() { this.client = null; this.clientId = ''; this.ready = false; }
  async connect(clientId) {
    const id = String(clientId || '').trim();
    if (!id) throw new Error('Discord Application Client ID is empty.');
    if (this.ready && this.clientId === id) return true;
    this.disconnect();
    this.clientId = id;
    const client = new DiscordRPC.Client({ transport: 'ipc' });
    this.client = client;
    client.on('ready', () => { this.ready = true; });
    await client.login({ clientId: id });
    this.ready = true;
    return true;
  }
  async update(track) {
    if (!this.client || !this.ready || !track?.title) return false;
    const activity = {
      details: String(track.title).slice(0, 128),
      state: track.artist ? `by ${String(track.artist).slice(0, 120)}` : 'SoundCloud',
      instance: false
    };
    if (track.url && /^https:\/\/soundcloud\.com\//i.test(track.url)) {
      activity.buttons = [{ label: 'Open on SoundCloud', url: track.url }];
    }
    if (track.playing && Number.isFinite(track.position) && Number.isFinite(track.duration) && track.duration > 0) {
      activity.startTimestamp = Date.now() - Math.round(track.position * 1000);
      activity.endTimestamp = Date.now() + Math.round((track.duration - track.position) * 1000);
    }
    try { await this.client.setActivity(activity); return true; } catch { return false; }
  }
  async clear() { try { await this.client?.clearActivity(); } catch {} }
  disconnect() { try { this.client?.destroy(); } catch {}; this.client = null; this.clientId = ''; this.ready = false; }
}
module.exports = { DiscordPresence };
