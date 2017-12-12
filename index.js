//TODO Make a different one for React and web components. Try and put the
// core parts in the same file. e.g. react oncomponent dismount will simply proxy
// pass the call to room.onLeave(); and web component disconnectedCallback etc

//TODO Disconnect fnality. Make new cleanup fn ... leave and disconnected will call it.
// There needs to be a way that wrapper components/classes can listen for a disconnect from ClientRoom.

import * as Sockets from './Sockets.js';

export default class ClientRoom {
  constructor(ops = {}){
    this._socket = null;
    this._id = null;
    this._socketEventsMap = new Map();
    this._url = ops.url;
  }

  on(event, listener){
    this._socketEventsMap.set(`${this._id}${event}`, listener);
  }

  join(inputUrl){
    const url = inputUrl || this._url;
    if(!url)
      return Promise.reject(new Error(`URL not defined when attempting to join room ${this._id}`));

    return fetch(url, {headers: {'Accept': 'application/json'}, method: 'POST', credentials: 'same-origin'})
      .then(response => {
        console.log(`status for join: ${response.status}`)
        if(response.ok)
          return response;
        else throw `${response.statusText}`;
      })
      .then(response => response.json())
      .then(response => {
        console.log(`response json: ${JSON.stringify(response)}`);
        if(response.success && response.id && response.wsUrl){
          this._id = response.id;
        } else if(response.error) {
          throw `Error while requesting to join ${url}: ${response.error.message}`;
        } else {
          throw `Unspecified error while requesting to join ${url}`;
        }
        return response.wsUrl;
      })
      .then(wsUrl => Sockets.get(wsUrl))
      .then(socket => {this._socket = socket});
  }

  // Call this once you are ready to start receiving events from this room
  initialized(){
    console.log(`${this._id} emitting CLIENT_INITIALIZED`);
    for(let [event, listener] of this._socketEventsMap)
      this._socket.on(event, listener);
    this.emit('CLIENT_INITIALIZED');
  }

  emit(event, ...args){
    this._socket.emit(`${this._id}${event}`, ...args);
  }

  leave(){
    this.emit('EXIT');
    for(let [event, listener] of this._socketEventsMap)
      this._socket.removeListener(event, listener);
  }

}
