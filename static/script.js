const formchannel = document.querySelector('#CreateChannel');
let username; 
let channels = [];
let users_channel = [];
let users_online = {};

document.addEventListener('DOMContentLoaded', () => {

  // Connect to websocket
  var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // Retrieve username from localstorage
  if (!localStorage.getItem('nickname')) {
    username = window.prompt("Enter you nickname","username" + (Math.ceil(Math.random() * 100)));
    localStorage.setItem('nickname', username)
  }
  username = localStorage.getItem('nickname')

  // Retrieve last channel and username
  document.querySelectorAll('#Channels li a').forEach(function(channel){
    channels.push((channel.innerHTML));
  })
  if (!localStorage.getItem('lastchannel') || !channels.includes(localStorage.getItem('lastchannel'))) {
    let lastchannel = "general";
    localStorage.setItem('lastchannel', lastchannel);
  }

  // Send connection notice to server
  socket.emit('connected', {'username': username});

  // Join last channel
  joinChannel(localStorage.getItem('lastchannel'));
  document.getElementById(localStorage.getItem('lastchannel')).setAttribute('class', 'c-sidebar-nav-link c-sidebar-nav-link-success')

  // Create list of online users
  socket.on('onlineusers', data => {
    const item = document.querySelector('#onlineUsers')
    while (item.firstChild) {
      item.removeChild(item.firstChild)
    }
    const title = document.createElement('li');
    title.setAttribute('class', 'c-sidebar-nav-title')
    title.innerHTML = 'Users'
    document.querySelector('#onlineUsers').append(title)
    let entries = Object.entries(data.onlineusers)
    for (let [user, sid] of entries) {
      users_online[user] = sid; 
      const li = document.createElement('li');
      li.setAttribute('id', sid)
      li.setAttribute('class', 'c-sidebar-nav-item')
      const a = li.appendChild(document.createElement('a')); 
      a.setAttribute('class', 'c-sidebar-nav-link') 
      a.innerHTML = user;
      a.href = "#";
      document.querySelector('#onlineUsers').append(li);
    }
  })

  // Update the user online list
  socket.on('disconnected', data => {
    delete users_online[data.user];
    let li = document.querySelector(`#${CSS.escape(data.usersid)}`)
    if (li) {
      li.remove();
    }
  })

  socket.on('check disconnect', data => {
    console.log(data)
    let user_left = data.user;
    let user_reconnected = false;
    if (user_left === username) {
      user_reconnected = true;
    }
    console.log(user_reconnected)
    socket.emit('reconnected', {'user_reconnected': user_reconnected, 'user': data.user, 'channel': data.channel});
    
  })

  // Logic form channel creation
  // By default, submit button is disabled
  document.querySelector('#submit').disabled = true;

  // Enable button only if there is text in the input field
  document.querySelector('#Channel').onkeyup = () => {
    if (document.querySelector('#Channel').value.length > 0) {
      document.querySelector('#submit').disabled = false;
    }
    else {
      document.querySelector('#submit').disabled = true;
    }
  }

  // When an user leaves update the user channel list
  socket.on('leaveuser', data => {
    users_channel.splice(users_channel.indexOf(data.user))
    let li = document.getElementById(data.user);
    if (li) {
      li.remove(); 
    }
  })

  // When an user joins update the user channel list
  socket.on('joinuser', data => {
    const item = document.querySelector('#SingleMessage')
    while (item.firstChild) {
      item.removeChild(item.firstChild)
    }
    let entries = Object.entries(data.messages)
    let message;
    let sendby;
    let datesend;
    let length = entries.length;
    if (length > 100) {
      length = 100;
    }
    if (length != 0){
      for (let i = 0; i < length; i++){
        len = entries[i].length
        for (let y = 0; y < len; y++) {
          if (entries[i][y][0].message != undefined){
            message = entries[i][y][0].message;
            datesend = entries[i][y][0].date
            sendby = entries[i][y][0].user
            appendMessage(message, sendby, datesend)
          }
        }
      }
    }
    let userlength = data.userlist.length;
    let userlist = document.querySelectorAll('#userList li');
    for(let i=0; li=userlist[i]; i++) {
      li.parentNode.removeChild(li);
    }
    for (let i = 0; i < userlength; i++){
      if (!users_channel.includes(data.userlist[i])){
        users_channel.push(data.userlist[i]);
      }
    }
    const title = document.createElement('li');
    title.setAttribute('class', 'c-sidebar-nav-title')
    title.innerHTML = 'Users'
    document.querySelector('#userList').append(title)
    for (user of users_channel){
      const li = document.createElement('li');
      li.setAttribute('class', 'c-sidebar-nav-item')
      li.setAttribute('id', user)
      const a = li.appendChild(document.createElement('a')); 
      a.setAttribute('class', 'c-sidebar-nav-link')       
      a.innerHTML = user;
      a.href = "#";
      document.querySelector('#userList').append(li); 
    }
  })

  // When connected, configure buttons
  socket.on('connect', () => {

    formchannel.addEventListener('submit', event => {

      // Create new item for list
      const channel = document.querySelector('#Channel').value;
      if (!channels.includes(channel)) {
        socket.emit('create channel', {'channel': channel, 'user': username});
        actualchannel = localStorage.getItem('lastchannel');
        document.getElementById(actualchannel).setAttribute('class', 'c-sidebar-nav-link');
        channels.push(channel);
        //if (!checkChannel(channel, actualchannel)){
          //leaveChannel(actualchannel);
          //joinChannel(channel);
          //document.getElementById(channel).setAttribute('class', 'c-sidebar-nav-link c-sidebar-nav-link-success');
          
        //}
      }
      else {
        window.alert("The channel already exists");
        return false;
      }
      // Clear input field and disable button again
      document.querySelector('#Channel').value = '';
      document.querySelector('#submit').disabled = true;

      // Stop form from submitting
      event.preventDefault();  
    })
  })

  socket.on('new channel', data => {
    let channel = data.channel;
    let user = data.user;
    channels.push(channel);
    const li = document.createElement('li');
    li.setAttribute('class', 'c-sidebar-nav-item')
    const a = li.appendChild(document.createElement('a'));
    a.setAttribute('class', 'c-sidebar-nav-link');
    a.setAttribute('id', channel);
    a.innerHTML = channel;
    a.href = "#";
    if (username === user){
      leaveChannel(localStorage.getItem('lastchannel'));
      joinChannel(channel);
      a.setAttribute('class', 'c-sidebar-nav-link c-sidebar-nav-link-success');
    }
    a.addEventListener("click", () => { 
      actualchannel = localStorage.getItem('lastchannel');
      document.getElementById(actualchannel).setAttribute('class', 'c-sidebar-nav-link');
      newchannel = a.innerHTML;
      if (checkChannel(actualchannel, newchannel)){
        leaveChannel(actualchannel);
        joinChannel(newchannel);
        document.getElementById(newchannel).setAttribute('class', 'c-sidebar-nav-link c-sidebar-nav-link-success');
        return false;
      }    
    })
    document.querySelector('#Channels').append(li);
  });

  /*socket.on('announcement', data =>{
    window.alert(data.message);
  }) */

  // When a channel is clicked, connect to that channel
  document.querySelectorAll('#Channels li a').forEach(function(channel){
    channels.push(channel.innerHTML);
    channel.onclick = () =>{
      actualchannel = localStorage.getItem('lastchannel');
      console.log(actualchannel)
      document.getElementById(actualchannel).setAttribute('class', 'c-sidebar-nav-link');
      newchannel = channel.innerHTML;
      if (checkChannel(newchannel, actualchannel)){
        leaveChannel(actualchannel);
        joinChannel(newchannel);
        channel.setAttribute('class', 'c-sidebar-nav-link c-sidebar-nav-link-success')
        return false;
      }
    }
  });

  // When a message is sent, call 'send message' function from server
  document.querySelector('#sendMessage').onsubmit = () => {
    const message = document.querySelector('#Message').value;
    const user = localStorage.getItem('nickname');
    const date = new Date();
    const messageJSON = {
      message: message,
      user: user,
      date: date
    }
    const lastchannel = localStorage.getItem('lastchannel');
    socket.emit('send message', {'JSON': messageJSON, 'channel': lastchannel});
    // Clear message form
    document.querySelector('#Message').value = "";
    return false;
  };

  // Callback from server for sending messages
  socket.on('broadcast message', data =>{
    appendMessage(data.message.message, data.username, data.date, data.messageID)
  });

  // Callback for deleting messages
  socket.on('message deleted', data => {
    let element = document.querySelector(`#${CSS.escape(data.messageID)}`)
    if (element){
      element.style.animationPlayState = 'running';
      element.addEventListener('animationend', () =>  {
        element.remove();
      });
    }
  })
  

  // Diplay message function
  function appendMessage(message, user, date, messageID) {
    let attClass = 'justify-content-start'
    if (user === localStorage.getItem('nickname')) {
      attClass = 'justify-content-end';
    }
    const row = document.createElement('div');
    if (messageID != undefined){
      row.setAttribute('id', messageID);
    }
    row.classList.add('row', 'message', attClass)
    document.querySelector('#SingleMessage').append(row);
    const col = document.createElement('div');
    col.classList.add('col-sm-10');
    const rowlist = document.querySelectorAll('#SingleMessage div');
    const last = rowlist[rowlist.length - 1];
    last.append(col)
    const card = document.createElement('div');
    card.classList.add('card', 'text-white', 'bg-primary', 'mb-3');
    col.append(card)
    const header = document.createElement('div');
    header.classList.add('card-header')
    if (attClass === 'justify-content-end') {
      header.innerHTML = 'You wrote';
      const button = document.createElement('button');
      button.classList.add('close');
      const span = document.createElement('span');
      span.innerHTML = '&times;';
      button.append(span)
      button.onclick = () => {
        socket.emit('delete message',{'messageID': messageID});
      }
      if (messageID != undefined) {
        header.append(button);
      }
    }
    else {
      header.innerHTML = `${user}`;
    }
    card.append(header)
    const body = document.createElement('div')
    body.classList.add('card-body');
    card.append(body);
    const p = document.createElement('p');
    p.classList.add('card.text');
    p.innerHTML= `${message}`;
    body.append(p);
    const footer = document.createElement('div');
    footer.classList.add('small', 'card-footer', 'bg-transparent', 'border-0');
    footer.innerHTML = `${date}`;
    card.append(footer);
  }
  function checkChannel(newchannel, oldchannel) {
    if (newchannel === oldchannel){
      return false;
    }
    return true;
  }

  function joinChannel(channel) {
    socket.emit('join',{"channel":channel, "username":username});
    localStorage.setItem('lastchannel', channel);
    document.querySelector('#channelName').innerHTML = channel;    
    users_channel = []
    if (channel == 'general') {
      document.getElementById('onlineUsers').style.display = 'block'
      document.getElementById('userList').style.display = 'none'
    }
    else {
      document.getElementById('onlineUsers').style.display = 'none'
      document.getElementById('userList').style.display = 'block'
    }
  }

  function leaveChannel(channel) {
    socket.emit('leave',{"channel":channel, "username":username});   
  }
}) 