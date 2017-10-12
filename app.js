// Import the Express module
var express = require('express');

// Import the 'path' module (packaged with Node.js)
var path = require('path');

// Create a new instance of Express
var app = express();

//app.use(express.logger('dev'));

// Serve static html, js, css, and image files from the 'public' directory
app.use(express.static(path.join(__dirname,'public')));

// Create a Node.js based http server on port 8080
//var server = require('http').createServer(app).listen(8080, '192.168.0.101');
var server = require('http').createServer(app).listen(process.env.PORT || 8080);


// Create a Socket.IO server and attach it to the http server
var io = require('socket.io').listen(server);

// Reduce the logging output of Socket.IO
io.set('log level',1);

var userId;
var SOCKET_LIST = {};
var mapWidth = 1600;
var mapHeight = 1600;

var Entity = function() {
	var self = {
		//x:Math.random()*mapWidth,
		//y:Math.random()*mapHeight,
		x:0,
		y:0,
		spdX:0,
		spdY:0,
		id:"",
	}
	self.update = function() {
		self.updatePosition();
	}
	self.updatePosition = function() {
		self.x += self.spdX;
		self.y += self.spdY;
	}
	 self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
    }
	return self;
}

var Player = function(id) {
	var self = Entity();
	self.id = id;
	self.isUp = false;
	self.isDown = false;
	self.isLeft = false;
	self.isRight = false;
	self.maxSpd = 5;
	self.angel = 0;
	self.mouseX = 0;
	self.mouseY = 0;
	self.mouseAngle = 0;
	self.pressingAttack = false;
	self.color = Math.random().toFixed();
	self.timer = 0;
	self.gameWidth = 0;
	self.gameHeight = 0;
	self.teleportation = false;

	var super_update = self.update;


    self.update = function(){
        self.updateSpd();
        super_update();
        if(self.timer++ >= 25) {
        	if(self.pressingAttack){
            	self.shootBullet(self.mouseAngle);
            	self.timer = 0;
        }
        }
    } 

    self.shootBullet = function(angle){
        var b = Bullet(self.id,angle);
        b.x = self.x;
        b.y = self.y;
    }
	
	self.updateSpd = function() {
		// Базовое движение
		if(self.isUp) {
			self.y -= self.maxSpd;
			self.angel = 180;
		} 
		if(self.isDown) {
			self.y += self.maxSpd;
			self.angel = 0;
		}
		if(self.isRight) {
			self.x += self.maxSpd;
			self.angel = -90;
		}
		if(self.isLeft) {
			self.x -= self.maxSpd;
			self.angel = 90;
		}
		// Обработка поворота по диагоналям
		if(self.isLeft && self.isUp) {
			self.angel = 135;			
		} 
		if(self.isLeft && self.isDown) {
			self.angel = 45;
		} 
		if(self.isRight && self.isUp) {
			self.angel = -135;
		} 
		if(self.isRight && self.isDown) {
			self.angel = -45;
		}
		// Ограничение движения по карте
		if(self.x < 100/2) {
			self.x = 100/2;
		}
		if(self.x > mapWidth - 100/2) {
			self.x = mapWidth - 100/2;
		}
		if(self.y < 100/2) {
			self.y = 100/2;
		}
		if(self.y > mapHeight - 100/2) {
			self.y = mapHeight - 100/2;
		}
		self.mouseAngle = Math.atan2(self.mouseY - self.gameHeight/2, self.mouseX - self.gameWidth/2) / Math.PI*180;
	}
	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,	
			angel:self.angel,
			mouseAngle:self.mouseAngle,
			color:self.color
		}
	}

	self.getUpdatePack = function() {
		var updatePack = {
			id:self.id,
            x:self.x,
            y:self.y,
            angel:self.angel,
            mouseAngle:self.mouseAngle,
            teleportation:self.teleportation
		}
		self.teleportation = false;
		return updatePack
	}

	Player.list[id] = self;

	initPack.player.push(self.getInitPack());
	return self;
};

Player.list = {};

Player.onConnect = function(socket){
    var player = Player(socket.id);
    socket.on('keyPress',function(data){
        if(data.inputId === 'left')
			player.isLeft = data.state;
		else if(data.inputId === 'right')
			player.isRight = data.state;
		else if(data.inputId === 'up')
			player.isUp = data.state;
		else if(data.inputId === 'down')
			player.isDown = data.state;
        else if(data.inputId === 'attack')
            player.pressingAttack = data.state;
        else if(data.inputId === 'mouseAngle') {
            player.mouseX = data.stateX;
            player.mouseY = data.stateY;
        }
        else if(data.inputId === 'resizeScreen') {
            player.gameWidth = data.gameWidth;
            player.gameHeight = data.gameHeight;
        }
    });

	socket.emit('init', {
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack()
	})   
}

Player.getAllInitPack = function() {
	var players = [];
    for(var i in Player.list) { 
    	players.push(Player.list[i].getInitPack());
    }
    return players;
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}

Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push(player.getUpdatePack()); 
    }
    return pack;
}

var Bullet = function(userID,angle){
    var self = Entity();
    self.parent = userID;
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100){
            self.toRemove = true;
        }
        super_update();
        for(var i in Player.list){
            var p = Player.list[i];
            if(self.getDistance(p) < 40 && self.parent !== p.id){
            	var x = Math.random()*mapWidth;
            	var y = Math.random()*mapHeight;
            	x -= x%5;
            	y -= y%5;
                Player.list[i].x = x;
                Player.list[i].y = y;
                Player.list[i].teleportation = true;
                self.toRemove = true;
            }
        }
        
    }

    self.getInitPack = function() {
    	return {
    		id:self.id,
			x:self.x,
			y:self.y
    	};
    }

    self.getUpdatePack = function() {
    	return {
    		id:self.id,
			x:self.x,
			y:self.y
    	};
    }

    Bullet.list[self.id] = self;

    initPack.bullet.push(self.getInitPack());
    return self;
}

Bullet.list = {};

Bullet.update = function(){
    var pack = [];
    for(var i in Bullet.list){
        var bullet = Bullet.list[i];
        bullet.update();
        if(bullet.toRemove) {
            delete Bullet.list[i];
        	removePack.bullet.push(bullet.id);
        } else
            pack.push(bullet.getUpdatePack());  
    }
    return pack;
}
 
Bullet.getAllInitPack = function() {
	var bullets = [];
    for(var i in Bullet.list) { 
    	bullets.push(Bullet.list[i].getInitPack());
    }
    return bullets;
}

io.sockets.on('connection', function (socket) {
	console.log(socket.id);
	//console.log(io.sockets);
	socket.emit('connected', { ID: socket.id });
	SOCKET_LIST[socket.id] = socket;
	userId = socket.id;

	Player.onConnect(socket);

	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);

	});

});

var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

setInterval(function() {
	var pack = {
        player:Player.update(),
        bullet:Bullet.update(),
    }

    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('init',initPack);
        socket.emit('update',pack);
		socket.emit('remove',removePack);
    }
    initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
},1000/60);