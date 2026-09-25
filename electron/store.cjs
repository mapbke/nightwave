const fs = require('node:fs');
const path = require('node:path');

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'nightwave.json');
    this.data = {
      eqEnabled: true,
      eqGains: [0,0,0,0,0,0,0,0,0,0],
      volume: 0.82,
      globalHotkeys: true,
      discordEnabled: false,
      discordClientId: '',
      overlayEnabled: true,
      overlayPort: 17942,
      favorites: [],
      history: []
    };
    this.load();
  }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...this.data, ...raw };
      if (!Array.isArray(this.data.eqGains) || this.data.eqGains.length !== 10) this.data.eqGains = [0,0,0,0,0,0,0,0,0,0];
      if (!Array.isArray(this.data.favorites)) this.data.favorites = [];
      if (!Array.isArray(this.data.history)) this.data.history = [];
    } catch {}
  }
  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {}
  }
  patch(patch = {}) {
    const allowed = ['eqEnabled','eqGains','volume','globalHotkeys','discordEnabled','discordClientId','overlayEnabled','overlayPort','favorites','history'];
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch, key)) this.data[key] = patch[key];
    this.save();
    return this.public();
  }
  public() { return JSON.parse(JSON.stringify(this.data)); }
}
module.exports = { Store };
