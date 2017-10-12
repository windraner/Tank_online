var player_atlas = new Image();
player_atlas.src = 'player_atlas.png'

var backgroundMini = new Image();
backgroundMini.src = 'map.png';

window.onload = function() {
	var isPlaying = false; //Запуск игрового цикла
	var selfId = 0; //Собыстенный ИД пользователя

	//Размеры игровогой видимости
	var gameWidth = window.innerWidth;
	var gameHeight = window.innerHeight;

	//Размеры игровой карты
	var mapWidth = 1600;
	var mapHeight = 1600;

	var scale = 1; //Изначальное значение машстабированиия

	//Ассеты
	var tank = {
		0: {"x":0,"y":210,"w":49,"h":71},
		1: {"x":0,"y":281,"w":49,"h":71}
	}
	var head = {
		0: {"x":0,"y":0,"w":38,"h":85},
		1: {"x":0,"y":86,"w":38,"h":85}
	}
	var tail = {"x":0,"y":172,"w":36,"h":36};

	//Создание холстов
	var map = document.createElement('canvas');
	var ctxMap = map.getContext("2d");
	var players = document.createElement('canvas');
	var ctxPlayers = players.getContext("2d");

	//Размеры холста для карты
	map.width = gameWidth;
	map.height = gameHeight;
	//Размеры холста для игроков
	players.width = gameWidth;
	players.height = gameHeight;

	//Добавлениие холстов на страницу
	var body = document.getElementById('body');
	body.appendChild(map).id = "map";
	body.appendChild(players).id = "player";


	var socket = io.connect();
	//socket.disconnect();
	//socket.socket.reconnect();
	
	//Локальный угол поворота башни пользователя
	var mouseAngleLocal = 0;

	var Player = function(initPack) {
		var self = {};
		self.id = initPack.id;
		self.xReal = initPack.x;
		self.x = initPack.x;
		self.yReal = initPack.y;
		self.y = initPack.y;
		self.angel = initPack.angel;
		self.mouseAngle = initPack.mouseAngle;
		self.color = initPack.color;
		self.teleportation = false;
		Player.list[self.id] = self;
		return self;
	}
	Player.list = {};

	var Bullet = function(initPack) {
		var self = {};
		self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
		Bullet.list[self.id] = self;
		return self;
	}
	Bullet.list = {};

	socket.on('init',function(data){	
		for(var i = 0 ; i < data.player.length; i++){
			new Player(data.player[i]);
		}
		for(var i = 0 ; i < data.bullet.length; i++){
			new Bullet(data.bullet[i]);
		}
	});

	socket.on('update',function(data){
		for(var i = 0 ; i < data.player.length; i++){
			var pack = data.player[i];
			var p = Player.list[pack.id];
			if(p){
				if(pack.x !== undefined)
					p.x = pack.x;
				if(pack.y !== undefined)
					p.y = pack.y;
				if(pack.angel !== undefined)
					p.angel = pack.angel;
				if(pack.mouseAngle !== undefined)
					p.mouseAngle = pack.mouseAngle;
				if(pack.teleportation !== undefined)
					p.teleportation = true;
			}
		}
		for(var i = 0 ; i < data.bullet.length; i++){
			var pack = data.bullet[i];
			var b = Bullet.list[data.bullet[i].id];
			if(b){
				if(pack.x !== undefined)
					b.x = pack.x;
				if(pack.y !== undefined)
					b.y = pack.y;
			}
		}
	});

	socket.on('remove',function(data){
		for(var i = 0 ; i < data.player.length; i++){
			delete Player.list[data.player[i]];
		}
		for(var i = 0 ; i < data.bullet.length; i++){
			delete Bullet.list[data.bullet[i]];
		}
	});


	socket.on('connected', function (data) {
		socket.emit('keyPress',{inputId:'resizeScreen', gameWidth:gameWidth,gameHeight:gameHeight});
		selfId = data.ID;
		isPlaying = true;
		loop();
		console.log(data.ID);
	});

    var requestAnimFrame = window.requestAnimationFrame ||	window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame;

    //счетчик fps
    var count = 0;

    //Основной игровой цикл
    function loop() {
		if(isPlaying) {
			draw();
			requestAnimFrame(loop);
			count++;
		}
	}

	//Вывод fps в консоль
	setInterval(function function_name(argument) {
		//console.log(count);
		count = 0;
	}, 1000)

	//Локальный расчет координат
	function interpolation () {
		var delta = 5;
		for (var i in Player.list) {
			if (Player.list[i].teleportation == true) {
				Player.list[i].xReal = Player.list[i].x;
				Player.list[i].yReal = Player.list[i].y;
				Player.list[i].teleportation = false;
			}
			if (Player.list[i].xReal < Player.list[i].x) {
				Player.list[i].xReal += delta;
			} else if (Player.list[i].xReal > Player.list[i].x) {
				Player.list[i].xReal -= delta;
			}
			if (Player.list[i].yReal < Player.list[i].y) {
				Player.list[i].yReal += delta;
			} else if (Player.list[i].yReal > Player.list[i].y) {
				Player.list[i].yReal -= delta;
			}
			
		}
	}

	//Рисование карты + игроков
	function draw () {

		ctxPlayers.clearRect(0, 0, gameWidth, gameHeight);
		ctxMap.clearRect(0, 0, gameWidth, gameHeight);

		var selfX;
		var selfY;

		interpolation();
		
		for(var i in Player.list){
			if(Player.list[i].id == selfId) {
				selfX = Player.list[i].x;
				selfY = Player.list[i].y;
				drawMap(Player.list[i].xReal*scale, Player.list[i].yReal*scale);
			}
		}
		for(var i in Player.list) {
			if(Player.list[i].id == selfId) {
				ctxPlayers.save();
				ctxPlayers.translate(gameWidth/2, gameHeight/2);
				ctxPlayers.rotate(Player.list[i].angel*Math.PI/180);
				ctxPlayers.scale(scale,scale);
				ctxPlayers.drawImage(player_atlas, tank[Player.list[i].color].x, tank[Player.list[i].color].y, tank[Player.list[i].color].w, tank[Player.list[i].color].h, -50/2, -52/2, tank[Player.list[i].color].w, tank[Player.list[i].color].h);
				ctxPlayers.rotate((mouseAngleLocal-90)*Math.PI/180 - Player.list[i].angel*Math.PI/180);
				ctxPlayers.drawImage(player_atlas, head[Player.list[i].color].x, head[Player.list[i].color].y, head[Player.list[i].color].w, head[Player.list[i].color].h, -1-38/2, 15-86/2, head[Player.list[i].color].w, head[Player.list[i].color].h);
				ctxPlayers.restore();
			} else {
				ctxPlayers.save();
				ctxPlayers.translate((gameWidth/2 - selfX*scale + Player.list[i].xReal*scale), (gameHeight/2 - selfY*scale + Player.list[i].yReal*scale));
				ctxPlayers.rotate(Player.list[i].angel*Math.PI/180);
				ctxPlayers.scale(scale,scale);
				ctxPlayers.drawImage(player_atlas, tank[Player.list[i].color].x, tank[Player.list[i].color].y, tank[Player.list[i].color].w, tank[Player.list[i].color].h, -50/2, -52/2, tank[Player.list[i].color].w, tank[Player.list[i].color].h);
				ctxPlayers.rotate((Player.list[i].mouseAngle-90)*Math.PI/180 - Player.list[i].angel*Math.PI/180);
				ctxPlayers.drawImage(player_atlas, head[Player.list[i].color].x, head[Player.list[i].color].y, head[Player.list[i].color].w, head[Player.list[i].color].h, -1-38/2, 15-86/2, head[Player.list[i].color].w, head[Player.list[i].color].h);
				ctxPlayers.restore();
			}
		}
		for(var i in Bullet.list) {
			ctxPlayers.save();
			ctxPlayers.scale(scale,scale);
			ctxPlayers.translate((gameWidth/2 - selfX*scale + Bullet.list[i].x*scale)/scale, (gameHeight/2 - selfY*scale + Bullet.list[i].y*scale)/scale);
			ctxPlayers.drawImage(player_atlas, tail.x, tail.y, tail.w, tail.h, -tail.w/2, -tail.h/2, tail.w, tail.h);
			ctxPlayers.restore();
        }
        function drawMap(plX, plY) {
			var x = gameWidth/2 - plX;
			var y = gameHeight/2 - plY;
			ctxMap.save();
			ctxMap.scale(scale,scale);
			ctxMap.drawImage(backgroundMini, x/scale, y/scale);
			ctxMap.restore();
		}
	}
	
	document.onkeydown = function(e) {
		if(e.keyCode === 68) //d
			socket.emit('keyPress', {inputId:'right', state:true});
		else if(e.keyCode === 83) //s
			socket.emit('keyPress', {inputId:'down', state:true});
		else if(e.keyCode === 65) //a
			socket.emit('keyPress', {inputId:'left', state:true});
		else if(e.keyCode === 87) //w
			socket.emit('keyPress', {inputId:'up', state:true});
	}

	document.onkeyup = function(e) {
		if(e.keyCode === 68) //d
			socket.emit('keyPress', {inputId:'right', state:false});
		else if(e.keyCode === 83) //s
			socket.emit('keyPress', {inputId:'down', state:false});
		else if(e.keyCode === 65) //d
			socket.emit('keyPress', {inputId:'left', state:false});
		else if(e.keyCode === 87) //w
			socket.emit('keyPress', {inputId:'up', state:false});
	}
	
	document.onmousedown = function(e){
        socket.emit('keyPress',{inputId:'attack',state:true});
        e.preventDefault();
    }
    document.onmouseup = function(e){
        socket.emit('keyPress',{inputId:'attack',state:false});
        e.preventDefault();
    }
    document.onmousemove = function(e){
    	if(e.target.id == "player") {
    		var x = e.pageX - e.target.offsetLeft;
	        var y = e.pageY - e.target.offsetTop;
	        mouseAngleLocal = Math.atan2(y - gameHeight/2, x - gameWidth/2) / Math.PI*180;
	        socket.emit('keyPress',{inputId:'mouseAngle',stateX:x,stateY:y});
    	}
    }
    window.onresize = function() {
    	gameWidth = window.innerWidth;
    	gameHeight = window.innerHeight;;

    	map.width = window.innerWidth;
		map.height  = window.innerHeight;

		players.width = window.innerWidth;
		players.height  = window.innerHeight;

		scale = 1/(1920/gameWidth);
		if(scale<0.85) scale = 0.85;

		socket.emit('keyPress',{inputId:'resizeScreen', gameWidth:gameWidth,gameHeight:gameHeight});
    }

};