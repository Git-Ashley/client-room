//TODO Make a different one for React and web components. Try and put the
// core parts in the same file. e.g. react oncomponent dismount will simply proxy
// pass the call to room.onLeave(); and web component disconnectedCallback etc

//TODO Disconnect fnality. Make new cleanup fn ... leave and disconnected will call it.
// There needs to be a way that wrapper components/classes can listen for a disconnect from ClientRoom.

import * as Sockets from './Sockets.js';


/**
* @deprecated
* If you want to globally store rooms (discouraged) then make your own map*/
const Rooms = new Map();

class ClientRoom {
  constructor(ops = {}){
    this._socket = null;
    this._id = null;
    this._socketEventsMap = new Map();
    this._url = ops.url;
    this._listenerContext = null;

    //bindings
    this.join = this.join.bind(this);
    this.emit = this.emit.bind(this);
    this.leave = this.leave.bind(this);
  }

  get id(){
    return this._id;
  }

  /**@deprecated*/
  get listenerContext(){
    return this._listenerContext;
  }

  /**@deprecated*/
  set listenerContext(context){
    this._listenerContext = context;
  }

  on(event, inputListener){
    let listener = inputListener;
    if(this.listenerContext){
      listener = (...args) => {
        if(this.listenerContext)
          return inputListener.apply(this.listenerContext, args);
        else
          console.log('Listener context not set');
      }
    }

    this._socketEventsMap.set(event, listener);
    if (this.id) {
      this._socket.on(`${['connect', 'reconnect', 'disconnect'].includes(event) ? '' : this.id}${event}`, listener);
    }
  }

  join(inputUrl, payload){
    const url = inputUrl || this._url;
    if(!url)
      return Promise.reject(new Error(`URL not defined when attempting to join room ${this._id}`));

    return fetch(url, {headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}, method: 'POST', credentials: 'same-origin', body: JSON.stringify(payload)})
      .then(response => {
        console.log(`status for join: ${response.status}`)
        if(response.ok)
          return response;
        else throw `${response.statusText}`;
      })
      .then(response => response.json())
      .then(response => {
        if(response.success && response.id){
          this._id = response.id;
        } else if(response.error && response.error.message) {
          throw response.error.message;
        } else {
          if(response.reason)
            throw response.reason;
          else
            throw `Error while requesting to join ${url} with result ${JSON.stringify(response)}. Please contact support and show them this result`;
        }
            
        for(let [event, listener] of this._socketEventsMap)
          this._socket.on(`${['connect', 'reconnect', 'disconnect'].includes(event) ? '' : response.id}${event}`, listener);
        return response.url;
      })
      .then(url => Sockets.get(url))
      .then(socket => {
        this._socket = socket;
        Rooms.set(this._id, this);
      });
  }

  emit(event, ...args){
    this._socket.emit(`${this._id}${event}`, ...args);
  }

  leave(){
    if(this._socket){ //check we have actually joined first
      this.emit('EXIT');
      Rooms.delete(this._id);
      for(let [event, listener] of this._socketEventsMap)
        this._socket.removeListener(`${['connect', 'reconnect', 'disconnect'].includes(event) ? '' : id}${event}`, listener);
      if(!Rooms.size)
        this._socket.close();
    } else {
      Rooms.delete(this._id);
    }
  }

}

export {ClientRoom, Rooms};
