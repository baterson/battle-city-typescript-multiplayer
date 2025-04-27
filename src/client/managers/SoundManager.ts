import { assetsHolder } from "../utils";
import { TrackNames } from "../types";

/*
Stores references to audio assets and provides an interface to interact with them.
*/
export class SoundManager<T extends TrackNames> {
  tracks: { [key in T]?: HTMLAudioElement };

  // TODO: uncomment
  constructor(trackNames: (string | { trackName: string; loop: boolean })[]) {
    this.setupTracks(trackNames);
  }

  checkSounds(sounds) {
    Object.entries(sounds).forEach(([key, value]) => {
      if (value) {
        this.play(key);
      } else {
        this.pause(key);
      }
    });
  }

  setupTracks(trackNames: (string | { trackName: string; loop: boolean })[]) {
    this.tracks = trackNames.reduce((acc, track) => {
      if (typeof track === "string") {
        acc[track] = assetsHolder.audio[track].cloneNode();
      } else {
        const { trackName, loop } = track;
        acc[trackName] = assetsHolder.audio[trackName].cloneNode();
        acc[trackName].loop = loop;
      }
      return acc;
    }, {});
  }

  play(trackName: T) {
    return this.tracks[trackName].play().catch((e) => {});
  }

  pause(trackName: T) {
    return this.tracks[trackName].pause();
  }

  pauseAll() {
    Object.values<HTMLAudioElement>(this.tracks).forEach((track) =>
      track.pause()
    );
  }
}
