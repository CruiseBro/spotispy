import { Component } from '@angular/core';
import * as socketIo from 'socket.io-client'
import {Config} from './model/Config';
import * as queryString from 'query-string';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private socket;
  config : Config = new Config("", "", [], [], "");

  title = 'Spotiyspy';

  constructor() {
    this.socket = socketIo(this.config.uri);

    this.socket.emit('getConfig');

    this.socket.on('config', (config : Config) => {
      this.config = config;
    })
  }

  public onSubmit() {
    console.log("Submitted");
    this.socket.emit('saveConfig', this.config);
  }

  private generateRandomString(length) : string {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  }

  public onRemove(index) {
    this.config.refreshKeys.splice(index, 1);
  }

  public onLogin() {
    let scope = 'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-library-modify playlist-read-collaborative playlist-read-private user-read-recently-played user-read-playback-state user-read-private user-top-read';
    let state = this.generateRandomString(16);

    this.socket.emit('stateGenerated', state);

    window.location.href = 'https://accounts.spotify.com/authorize?' + queryString.stringify({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: scope,
      redirect_uri : this.config.uri + "/spotifycallback",
      state: state
    });
  }
}
