//TODO Make a different one for React and web components. Try and put the
// core parts in the same file. e.g. react oncomponent dismount will simply proxy
// pass the call to room.onLeave(); and web component disconnectedCallback etc

//TODO Disconnect fnality. Make new cleanup fn ... leave and disconnected will call it.
// There needs to be a way that wrapper components/classes can listen for a disconnect from ClientRoom.

import * as Sockets from './Sockets.js';

const Rooms = new Map();

class ClientRoom {
  constructor(ops = {}){
    this._socket = null;
    this._id = null;
    this._socketEventsMap = new Map();
    this._url = ops.url;

    //bindings
    this.join = this.join.bind(this);

    //TODO Make this
    this.on('disconnect', () => {
      //For now, until reconnection capabalities are developed, we just leave room
      //and are expected to refresh page. (Server disconnect => leave, same as server)
      this.leave();

      //TODO this._reconnect()
      //Make this a hook? Better for inheritance, and not having to do multiple
      //listeners.... and there's other stuff which could trigger disconnects...
      //testing, etc... just do hooks like backend. onDisconnect, onReconnect.
    });
  }

  _reconnect(){
    //TODO
    //Try to re-establish the WS connection & wait for connect event? Then emit
    //reconnect on socket handler... but leaving the room should never be done
    //on reconnect, since the goal is to always reconnect.
    //P.S. this may be something to be handled by SocketHandler?
  }

  on(inputEvent, listener){
    const event = inputEvent === 'disconnect' ? inputEvent : `${this.id}${inputEvent}`;
    this._socketEventsMap.set(event, listener);
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
        if(response.success && response.id && response.url){
          this._id = response.id;
        } else if(response.error && response.error.message) {
          throw response.error.message;
        } else {
          if(response.reason)
            throw response.reason;
          else
            throw `Error while requesting to join ${url} with result ${JSON.stringify(response)}. Please contact support and show them this result`;
        }
        return response.url;
      })
      .then(url => Sockets.get(url))
      .then(socket => {this._socket = socket})
      .then(() => Rooms.set(this._id, this));
  }

  // Call this once you are ready to start receiving events from this room
  initialized(){
    console.log('Initialized() invoked');
    for(let [event, listener] of this._socketEventsMap)
      this._socket.on(event, listener);
    this.emit('CLIENT_INITIALIZED');
  }

  emit(event, ...args){
    console.log(`emitting ${this._id}${event}`);
    this._socket.emit(`${this._id}${event}`, ...args);
  }

  leave(){
    this.emit('EXIT');
    Rooms.delete(this._id);
    for(let [event, listener] of this._socketEventsMap)
      this._socket.removeListener(event, listener);
  }

}

export {ClientRoom, Rooms};
