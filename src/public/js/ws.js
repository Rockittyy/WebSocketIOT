const init = (onConnect) => new Promise((res, rej) => {
    const isSecure = window.location.protocol == 'https:';
    const server = window.location.host;
    var socket = new WebSocket(`ws${isSecure ? 's' : ''}://${server}`);
    socket.addEventListener('open', (event) => {
        console.log('connected to webSocket')
        onConnect(socket);
        res(socket);
    })
    socket.addEventListener('message', (event) => {
        console.log(`server: ${event.data}`);
    })
    socket.addEventListener('close', async (event) => {
        console.log('reconnecting...');
        socket = await init(onConnect);
    })
})