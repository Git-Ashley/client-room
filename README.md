# client-room
'Room' design pattern for the client.


Example use:

```javascript
import ClientRoom from './node_modules/client-room/index.js';

const testRoom = new ClientRoom();

testRoom.join('/api/testroom')
  .then(() => {
    testRoom.on('USER_MSG', msg => console.log(`USER_MSG: ${msg}`));
    testRoom.initialized();
    testRoom.emit('SEND_MSG', `Hi. I just joined the room at ${new Date()}`)
  })
  .catch(err => console.log(err));
```

You can also specify the room join url in the constructor ```new ClientRoom({url: '/api/testroom'});``` and use ```clientRoom.join()``` with no Url

Samples, tutorial and api-docs can be found at https://www.nodeocrat.com/projects/Room
