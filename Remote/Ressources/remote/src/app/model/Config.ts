export class Config {
  clientId : string;
  clientSecret : string;
  refreshKeys : string[];
  rooms : string[];
  uri : string;

  constructor( clientId : string,
    clientSecret : string,
    refreshKeys : string[],
    rooms : string[],
    uri : string)
  {
    this.clientSecret = clientSecret;
    this.clientId = clientId;
    this.refreshKeys = refreshKeys;
    this.rooms = rooms;
    this.uri = uri;
  }
}
