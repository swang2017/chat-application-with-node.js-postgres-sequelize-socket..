var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var session = require('express-session');
var models = require('./models')
var bodyParser = require('body-parser')
var exphbs = require('express-handlebars')
var cookieParser = 	require('cookie-parser');
var Sequelize = require('sequelize')


users = [];
connections = [];



var SequelizeStore = require('connect-session-sequelize')(session.Store);

// create database, ensure 'sqlite3' in your package.json
var sequelize = new Sequelize(
"database",
"username",
"password", {
    "dialect": "sqlite",
    "storage": "./session.sqlite"
});

app.use(cookieParser())
var myStore = new SequelizeStore({
    db: sequelize
})
app.use(session({
    secret: 'keyboard cat',
    store: myStore,
    proxy: true,
    resave: false,
    saveUninitialized: false
}));

myStore.sync();


app.use(bodyParser.urlencoded({extended :false}))

// set view engine
app.set('views', './views')
app.engine('hbs', exphbs({
    extname: '.hbs'
}));
app.set('view engine', '.hbs');




// routes----------------------------------------
app.get('/', function(req, res){
  res.render(__dirname + '/views/login');
});



app.get('/app', function(req, res){
  res.render(__dirname + '/views/login');
});

app.get('/login', function(req, res){
  res.render(__dirname + '/views/login');
});


app.post('/login',function(req,res){

  let inputusername = req.body.username
  let inputpassword = req.body.password

  models.user.findOne({
    where:
      {username: inputusername,
      password: inputpassword}
    }

  ).then(function(user){
    if(!user){
      console.log("user not registered")}
    else if (user.password!=inputpassword){
      console.log("password wrong")
  }
    else {
      req.session.username = inputusername
      if (users.includes(inputusername)){
        res.redirect('login')
      }
        else{ res.redirect('/chatPage?username='+req.session.username) }
    }
  })
})



app.get('/register', function(req, res){
  res.render(__dirname + '/views/register');
});

app.get('/chatPage', function(req, res){
  res.render(__dirname + '/views/app');
});

app.get('/logout', function(req, res) {
    req.session.destroy();

    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');

    res.redirect('/login');
});


app.post('/user',function(req,res){
const post = models.user.build({
  username:req.body.username,
  email:req.body.email,
  password:req.body.password,
})

post.save().then(function(newPost){
  console.log("newPost object")
  console.log(newPost)
})

res.redirect('/chatPage?username='+req.body.username)

})

// routes----------------------------------------------

// brandon's part
io.sockets.on('connection', function(socket){

  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);

  // Disconnect
  socket.on('disconnect', function(data){
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets disconnected', connections.length);
  })

  // Send messages
  socket.on('send message', function(data){
    io.sockets.emit('new message', {msg: data, user: socket.username});
  })

  // New User
  socket.on('new user', function(data, callback){
    callback(true);
    var parsedName = data.split("=")
    socket.username = parsedName[1];
    users.push(socket.username);
    updateUsernames();
  })

  function updateUsernames(){
    io.sockets.emit('get users', users);
  }

})
// brandon's part


http.listen(3000, function(){
  console.log('listening on *:3000');
});
