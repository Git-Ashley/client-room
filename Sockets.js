//import {apiPrefix} from '@global/SiteConfig';

// Client socket handler

//TODO
/*1. wsMap cleanup if no more references. Or use a weakmap?
  2. Multiple listeners per event should be an option you have to forcefully set
*/

class SocketHandler {

  constructor(url){
    if(!url.startsWith('ws'))
      this._url = `wss://${window.location.hostname}${url}`;
    else
      this._url = url;

    this._socket = new WebSocket(`${this._url}?live=false`);
    this._eventListeners = {};
    this._connectListeners = [];
    this._delayedTasks = [];
    this._live = false;
    this._init();
  }

  _init(){
    this._socket.addEventListener('open', () => {
      while(this._delayedTasks.length > 0)
        this._delayedTasks.shift()();
      while(this._connectListeners.length > 0)
        this._connectListeners.shift()();

      const eventType = this._live ? 'reconnect' : 'connect';
      console.log(`Socket to ${this._url} ${eventType}ed`);
      const listeners = this._eventListeners[eventType];
      this._live = true;
      if(listeners)
        listeners.forEach(listener => listener());
    });

    this._socket.addEventListener('message', eventJson => {
      const event = JSON.parse(eventJson.data);
      const listeners = this._eventListeners[event.type];
      if(!listeners)
        return console.log(`No listeners for event ${event.type}!`);
      for(let listener of listeners)
        listener(event.data);
    });

    this._socket.addEventListener('close', () => {
      const listeners = this._eventListeners['disconnect'];
      if(listeners)
        listeners.forEach(listener => listener());
      this._reconnect();
    });

    this._socket.addEventListener('error', error => {
      console.log(`Websocket error to ${this._url}: ${JSON.stringify(error)}`);
      const listeners = this._eventListeners['error'];
      if(listeners)
        listeners.forEach(listener => listener());
    });
  }

  _reconnect(){
    console.log(`Websocket to ${this._url} disconnected. Attempting to reconnect...`);
    setTimeout(() => {
      this._socket = new WebSocket(`${this._url}?live=true`);
      this._init();
    }, 3000);
  }

  _enqueue(task){
    if(this._socket.readyState === WebSocket.OPEN)
      task();
    else
      this._delayedTasks.push(task);
  }

  /**@deprecated*/ //Use 'connect' event instead
  onConnect(listener){
    this._connectListeners.push(listener);
  }

  on(event, listener){
    if(!this._eventListeners[event]){
      this._eventListeners[event] = new Set([listener]);
    } else {
      if(this._eventListeners[event].has(listener))
        console.log(`Same listener has been registered more than once for event ${event}!`);
      this._eventListeners[event].add(listener);
      if(this._eventListeners.lenth >= 5)
        console.log(`Warning! event ${event} has ${this._eventListeners.length} listeners!`);
    }
  }

  removeListener(event, listener){
    const listeners = this._eventListeners[event];
    if(listeners && listeners.has(listener))
      listeners.delete(listener);
    else
      console.log(`Attempted to remove listener for ${event}, but listener was not found`);
    if(!listeners || listeners.size === 0)
      delete this._eventListeners[event];
  }

  emit(type, data){
    this._enqueue(() => {
      this._socket.send(JSON.stringify({type,data}));
    });
  }

  close(...args){
    this._enqueue(() => this._socket.close(...args));
  }
}

const wsMap = new Map();

export function get(url){
  return new Promise((resolve, reject) => {
    let socket = wsMap.get(url);
    if(!socket){
      socket = new SocketHandler(url);
      wsMap.set(url, socket);
      socket.onConnect(() => resolve(socket));
    } else {
      return resolve(socket);
    }
  });
}
