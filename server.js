const express= require("express");
const http=require("http");
const socketIO=require("socket.io");
const {generateMessage} = require('./util/message.js');
const {generateAdmin} = require('./util/admin.js');
const {generateDate} = require('./util/date.js');
const {isrealstring} =require('./util/isrealstring.js');
const {Users}=require('./util/users.js');
const port=process.env.PORT || 3000
const path=require("path");
var SocketIOFileUploadServer = require('socketio-file-upload');



let app=express();
let server=http.createServer(app);
let io=socketIO(server);
let users=new Users();

app.use(express.static('publicc'));
app.use(SocketIOFileUploadServer.router);



io.on('connection',(socket)=>{
    console.log("A new user just connected");
    
             // Do something when a file is saved:
            //  uploader.on("saved", function(event){
            //     console.log(event.file);
            //  });
    
    socket.on('join',(params,callback)=>{
        if(!isrealstring(params.name) || !isrealstring(params.room))
        {
           return callback('Name and Room are required');
        }
        socket.join(params.room);

        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUsersList', users.getUserList(params.room));
        socket.emit('dateMessage',generateDate());
        socket.emit('adminMessage',generateAdmin('Welcome to the Chat App!'));

        socket.broadcast.to(params.room).emit('adminMessage',generateAdmin(params.name+' has Joined the Chat'));

        callback();
    });


    socket.on('createMessage',(message, callback)=>{
        let user=users.getUser(socket.id);
        if(user && isrealstring(message.text))
        {
            var numClients = io.nsps['/'].adapter.rooms[user.room];
            if(numClients.length==2)
            {
                socket.emit('myMessage',generateMessage(user.name,message.text));
                socket.broadcast.to(user.room).emit('oneMessage',generateMessage(user.name,message.text));
            }
            else{
                socket.emit('myMessage',generateMessage(user.name,message.text));
                socket.broadcast.to(user.room).emit('newMessage',generateMessage(user.name,message.text));
            }
                                
        }
        
        callback('This is the Server');
        
    });

    var uploader = new SocketIOFileUploadServer();
            uploader.dir = "publicc/uploads";
            uploader.listen(socket);


    socket.on('image',(message, callback)=>{
        let user=users.getUser(socket.id);
        if(user && isrealstring(message.text))
        {
            var t=message.text;
            var string=path.basename(t);

            var numClients = io.nsps['/'].adapter.rooms[user.room];
            if(numClients.length==2)
            {
                
                socket.emit('myImage',generateMessage(user.name,string));
                socket.broadcast.to(user.room).emit('chatterImage',generateMessage(user.name,string));
            }
            else{
                socket.emit('myImage',generateMessage(user.name,string));
                socket.broadcast.to(user.room).emit('chatterImage',generateMessage(user.name,string));
            }
                                
        }
        
        callback('This is the Server');
        
    });
    

    socket.on('disconnect',()=>{
        let user=users.removeUser(socket.id);

        if(user){
            io.to(user.room).emit('updateUsersList',users.getUserList(user.room));
            io.to(user.room).emit('adminMessage',generateAdmin(user.name +' has left the chat room'));
        }
        console.log("user was disconnected");
    });
});



server.listen(port,()=>console.log("Server is running on port 3000"));
