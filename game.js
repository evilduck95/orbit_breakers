

var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });

var aspect = window.availWidth / window.availHeight;

//Player paddle vars.
var paddle, secondPaddle;
var paddleSize = { x: 150, y:24};
var secondPaddleActive = false;
//Paddle circle radius.
var paddleRunRadius = 350;


//Points needed to remember.
var mousePoint, centerPoint, paddlePoint;
mousePoint = centerPoint = paddlePoint = new Phaser.Point(0, 0);
//Ball vars.
var ball;
var ballSize = 15;
var ballSpeed = 200;

var ballVector = new Phaser.Point();


//Size difference in a single axis between body and sprite.
var bodyOffsetSize = 15;

var lineAngle = 0;

var mobile = false;
var messageTimedOut = false;

var blockSize = 30;

var blockCollisionGroup;
var ballCollisionGroup;
var paddleCollisionGroup;

var levelBuffer = blockSize * 3;
var levels = new Array();
var currentLevel = 0;

var line1, line2, line3, line4;

var blockID = 0;

var mainMenu, optionsMenu, nextLevelMenu, failScreen;

var menuStages = { main: true, options: false, game: false };
var buttonGroup;

var sounds;
var soundEnabled = true;


var globalDebug = false;


function preload() {
	
	game.load.image('paddle', 'assets/paddle(blurred).png');
	game.load.image('ball', 'assets/ball.png');
	game.load.image('redblock', 'assets/block(red).png');
	game.load.image('greenblock', 'assets/block(green).png');
	game.load.image('blueblock', 'assets/block(blue).png');
	game.load.image('yellowblock', 'assets/block(yellow).png');
	game.load.image('button', 'assets/button.png');
	game.load.image('mutedSpeaker', 'assets/speakeroff.png');

	if(this.game.device.desktop){

		game.load.image('background', 'assets/background.png');


	}
	else{

		mobile = true;

		game.load.image('background', 'assets/background(long).png');



	}

	game.load.audio('pop', 'assets/pop.mp3');
	game.load.audio('beep', 'assets/beep.mp3');

}



function create() {


	//Setup reference points, center, mouse and paddle.
	centerPoint = new Phaser.Point(game.width / 2, game.height / 2);
	mousePoint = new Phaser.Point();
	paddlePoint = new Phaser.Point();




	//Add a background image.
	backgroundImage = game.add.sprite(0, 0, 'background');
	var imageAspect = 16/9;

	backgroundImage.anchor.setTo(0.5, 0.5);


	centerPoint.set(backgroundImage.x, backgroundImage.y);

	mutedSpeaker = game.add.sprite(100, 100, 'mutedSpeaker');
	mutedSpeaker.visible = false;


	//Load in paddle asset in center.
	paddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');
	secondPaddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');

	secondPaddle.visible = false;

	//Setup paddle size.
	paddle.width = secondPaddle.width = paddleSize.x;
	paddle.height = secondPaddle.height = paddleSize.y;



	//Load in ball asset at center.
	ball = game.add.sprite(game.width * 0.9, game.height * 0.9, 'ball');

	ball.width = ball.height= ballSize;


	/*
	
		PHYSICS

	*/

	initPhysics();

	///SINGLE CLICK TO HIT BALL???

	if(mobile){

		game.scale.startFullScreen(false);
		game.input.addPointer();

	}

	game.input.onUp.add(function(pointer){ mouseUpEvents(pointer); }, this);

	game.paused = true;


	

	
	//Initial Resize.
	resizeGame($(window).width, $(window).height, centerPoint, currentLevel);



	mainMenu = new Menu("Orbit Breaker");
	mainMenu.addButton(game.width / 2, game.height / 2, "Play", "play");
	mainMenu.addButton(game.width / 2, game.height * (2 / 3), "Options", "options");


	optionsMenu = new Menu("Game Options");
	optionsMenu.addButton(game.width / 2, game.height / 2, "Sound", "togglesound");
	optionsMenu.addButton(game.width / 2, game.height * (2 / 3), "Back", "mainmenu");

	optionsMenu.setVisibility(false);




	sounds = {
		pop: game.add.audio('pop'),
		beep: game.add.audio('beep')

	};

	console.log("level num", currentLevel);
	//Read in Xml values and build levels.
	initXMLLevel(currentLevel);


	this.spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

}






function update() { 


	if(menuStages.main){

		game.paused = true;

	}
	else if(menuStages.options){

		game.paused = true;

	}
	else if(menuStages.game){

		game.paused = false;	

		if(levels[currentLevel].numBlocksLeft() == 0){

			currentLevel += 1;
			levels[currentLevel].setVisibility(true, true);
			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, true);

		}



		centerPoint.set(backgroundImage.x, backgroundImage.y);

		//Collect mouse co-ordinates into a point.
		mousePoint.set(game.input.x, game.input.y);

		//Get angle between the center and the mouse, account for offset.
		lineAngle = game.physics.arcade.angleBetween(centerPoint, mousePoint) + (Math.PI / 2);

		if(mobile){

			touchControls(lineAngle);

		}
		else{

			pcControls(lineAngle);

		}

		//game.physics.arcade.collide(ball, paddle);

		updateBallVelocity();
	}



}





function render(){

	if(globalDebug){

		game.debug.geom(line1);
		game.debug.geom(line2);
		game.debug.geom(line3);
		game.debug.geom(line4);

	}



}

/*			#####
	
	CUSTOM DESIGNED FUNCTIONS

			#####

*/

/*

	INITIALISERS

*/

function initPhysics(){

	game.physics.startSystem(Phaser.Physics.P2JS);

	game.physics.p2.setImpactEvents(true);
	game.physics.p2.enable([paddle, secondPaddle, ball], false);

	paddle.body.setRectangle(paddleSize.x, paddleSize.y, 0, 0, 0);
	paddle.body.static = true;

	secondPaddle.body.setRectangle(paddleSize.x, paddleSize.y, 0, 0, 0);
	secondPaddle.body.static = true;

	secondPaddle.body.x = -100;
	secondPaddle.body.y = -100;

	ball.body.setCircle(ballSize / 2);

	ball.body.velocity.x = -10;
	ball.body.velocity.y = -10;

	ball.body.damping = 0;


	game.physics.p2.restitution = 1;

	paddle.physicsBodyType = Phaser.Physics.P2JS;
	secondPaddle.physicsBodyType = Phaser.Physics.P2JS;

	ball.physicsBodyType = Phaser.Physics.P2JS;

	ballCollisionGroup = game.physics.p2.createCollisionGroup();
	paddleCollisionGroup = game.physics.p2.createCollisionGroup();
	blockCollisionGroup = game.physics.p2.createCollisionGroup();
	//powerupCollisionGroup = game.physics.p2.createCollisionGroup();

	paddle.body.setCollisionGroup(paddleCollisionGroup);
	secondPaddle.body.setCollisionGroup(paddleCollisionGroup);

	paddle.body.collides([ballCollisionGroup, blockCollisionGroup]);
	secondPaddle.body.collides(ballCollisionGroup);

	ball.body.setCollisionGroup(ballCollisionGroup);

	ball.body.collides(paddleCollisionGroup, hitPaddle, this);
	ball.body.collides(blockCollisionGroup, hitBlock, this);

}

function initXMLLevel(levelNumber){


	$(function(){

			$.ajax(

					{

						type: "GET",
						url: "assets/levels.xml",
						dataType: "xml",

						success: function(xml){

							var xmlDocument = $.parseXML(xml), $xml = $(xmlDocument);


							buildLevels(xml);

							for(var i = 0; i < levels.length; i++){

								levels[i].setVisibility(false, true);

							}

							levels[currentLevel].setVisibility(true, true);


						}

					}

				);
		}
	);


	

}

function buildLevels(xml){



	var blockLines = new Array();
	var blocks = new Array();

	levels = $(xml).find("level").map(

		function(){

			var newLevel = new Level($(this).attr("name"));


			blockLines = $(this).children("blockLine").map(

				function(){

					var start = { x: 0, y: 0};

					start.x = parseInt($(this).find("position > x").text());
					start.y = parseInt($(this).find("position > y").text());

					var direction = $(this).find("direction").text();
					var numberOfBlocks = parseInt($(this).find("length").text());


					var color = $(this).find("color").text();

					//blockLines.push(new BlockLine(start, direction, numberOfBlocks, color));

					return new BlockLine(start, direction, numberOfBlocks, color);

				}

			);

			for(var i = 0; i < blockLines.length; i++){

				newLevel.addBlocks(blockLines[i]);

			}


			blocks = $(this).children("block").map(

				function(){

					var block = new Block($(this).find("color").text());

				block.setPos(

						parseInt($(this).find("x").text()),
						parseInt($(this).find("y").text())

				);


				if($(this).attr("absolute") == "true"){

					block.makeAbsolute(true);

				}
				else{

					block.makeAbsolute(false);

				}

				return block;

				}

			);

			for(var i = 0; i < blocks.length; i++){

				newLevel.addBlocks(blocks[i]);

			}

			//levels.push(newLevel);

			return newLevel;

			console.log("level", newLevel);

		}


	);


	console.log(levels);


}

function loadBlocks(xml){

	var blocks = new Array();

	blocks = $(this).find("block").map(

		function(){	

				if(parseInt($(this).parent().attr("id")) == number){

				var block = new Block($(this).find("color").text());

				block.setPos(

						parseInt($(this).find("x").text()),
						parseInt($(this).find("y").text())

				);


				if($(this).attr("absolute") == "true"){

					block.makeAbsolute(true);

				}
				else{

					block.makeAbsolute(false);

				}

				return block;
			}


		}
	);

}

function loadBlockLines(xml, level, number){

	var start = {x: 0, y: 0};

	var blockLines = new Array();

	//NEED TO ITERATE OVER BLOCKLINES, NOT LEVELS!!!

	blockLines = $(xml).find('level > blockLine').map(

			function(){	

				console.log(parseInt($(this).parent().attr("id")),  number)

				if(parseInt($(this).parent().attr("id")) == number){

					start.x = parseInt($(this).find("position > x").text());
					start.y = parseInt($(this).find("position > y").text());

					var direction = $(this).find("direction").text();
					var numberOfBlocks = parseInt($(this).find("length").text());


					var color = $(this).find("color").text();

					//blockLines.push(new BlockLine(start, direction, numberOfBlocks, color));

					return new BlockLine(start, direction, numberOfBlocks, color);

				}

			}

		);

	//Maybe use ".get(index)" to fill array???




	
	for(var i = 0; i < blockLines.length; i++){

		level.addBlocks(blockLines[i]);

	}
	


}

/*

	DISPLAY

*/



function resizeGame(x, y, centerPoint, currentLevel) {

	console.log("Resizing to", $(window).width(), "x", $(window).height());

	game.scale.setGameSize($(window).width(), $(window).height());

	backgroundImage.anchor.setTo(0.5, 0.5);
	backgroundImage.x = game.width / 2;
	backgroundImage.y = game.height / 2;

	if($(window).width() > backgroundImage.width && $(window).height > backgroundImage.height){

		backgroundImage.scale.setTo($(window).width / backgroundImage.width);
		console.log("scale");

	}

	if(typeof centerPoint != "undefined"){

		centerPoint.setTo(game.width / 2, game.height / 2);

	}

	if(typeof levels[currentLevel] != "undefined"){

		levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

	}

}

/*

	GRAPHICS

*/

function flashText(text, x, y){

	game.time.events.add(2000, function(){

				var textStyle = {font: "30px Arial", fill: "#FFFFFF"};
				var text = game.add.text(x, y, text, textStyle);
				text.anchor.set(0.5);
				text.setShadow(6, 6, "rgba(0, 0, 0, 1)", 5);
				game.add.tween(text).to({y: 0}, 1500, Phaser.Easing.Linear.None, true);
				game.add.tween(text).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);


			}, this);


}

/*

	EVENTS

*/

function mouseUpEvents(pointer){


		var doubleClick = (pointer.msSinceLastClick < game.input.doubleTapRate);

		if(!game.scale.isFullScreen && !mobile){


			resizeGame(window.innerWidth, window.innerHeight, centerPoint, currentLevel);

			if(game.paused){

				game.paused = false;

			}

		}
		
		if(game.scale.isFullScreen && doubleClick){

			game.scale.stopFullScreen();
			resizeGame(window.innerWidth, window.innerHeight, centerPoint, currentLevel);


		}
		else if(doubleClick){


			game.scale.startFullScreen(false);
			resizeGame(window.screen.width, window.screen.height, centerPoint, currentLevel);


		}
		else{

			flashText("Double Tap to Enter/Exit Fullscreen", game.world.centerX, game.world.centerY);

		}


}



function hitBlock(body1, body2){

	var rnd = game.rnd.frac();


	body2.static = false;
	body2.dynamic = true;
	

	//MAKE CHANCE DYNAMIC
	if(rnd >= 0.85){

		body2.sprite.visible = false;
		body2.sprite = game.add.sprite(body2.x, body2.y, 'yellowblock');

		var blockHit = levels[currentLevel].getBlock(body2.id);
		blockHit.setDormant();

		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0.25}, 1000, Phaser.Easing.Linear.None, true, 0, 100, true));

		console.log("Powerup Spawned!");

	}
	else{

		body2.clearCollision();
		game.add.tween(body2.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);
		levels[currentLevel].deactivateBlock(body2.id);

	}
	
	var blockVelocity = new Phaser.Point(ball.body.velocity.x + game.rnd.integerInRange(-100, 100), ball.body.velocity.y + game.rnd.integerInRange(-100, 100));

	blockVelocity.setMagnitude((ballVector.getMagnitude() * (2 / 3)) * -1);

	body2.velocity.x = blockVelocity.x;
	body2.velocity.y = blockVelocity.y;

	body2.angularVelocity = game.rnd.integerInRange(-Math.PI, Math.PI);

	sounds.pop.play();


	updateBallVelocity();

	levels[currentLevel].blockHit();
	console.log("Blocks Remaining", levels[currentLevel].numBlocksLeft());


}

function hitPaddle(body1, body2){

	sounds.pop.play();

}

function collectPowerup(body1, body2){

	console.log("Powerup Collected!");

	secondPaddleActive = true;
	secondPaddle.visible = true;
	secondPaddle.alpha = 0;

	game.add.tween(secondPaddle.body.sprite).to({alpha: 1}, 1000, Phaser.Easing.Linear.None, true);


	game.time.events.add(Phaser.Timer.SECOND * 10, removePowerUp, this);

	var blockHit = levels[currentLevel].getBlock(body1.id);
	blockHit.setDormant();

	game.tweens.remove(blockHit.getTween());

	game.add.tween(body1.sprite).to({alpha: 0}, 500, Phaser.Easing.Linear.None, true);
	game.add.tween(body1.sprite.scale).to({x: 2, y: 2}, 500, Phaser.Easing.Linear.None, true);

	levels[currentLevel].deactivateBlock(body1.id);


}

function removePowerUp(){

	secondPaddleActive = false;

	secondPaddle.alpha = 1;

	game.add.tween(secondPaddle.body.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);


	//secondPaddle.visible = false;



}

function removeBody(body){

	//Destroy sprite and body of Block.
	body.sprite.destroy();
	body.removeFromWorld();
	body.destroy();

}

function levelFinished(){

	currentLevel++;


}



function buttonSelect(button){



	switch(button.name){

		case !"togglesound":

			button.visible = false;

		break;

		case "play":

			menuStages.main = false;
			menuStages.game = true;

			game.paused = false;

			mainMenu.setVisibility(false);


		break;

		case "options":

			menuStages.main = false;
			menuStages.options = true;
			menuStages.game = false;

			game.paused = true;

			mainMenu.setVisibility(false);

			optionsMenu.setVisibility(true);

		break;

		case "togglesound":

			game.sound.mute ^= true;
			mutedSpeaker.visible ^= true;

			optionsMenu.setVisibility(true);


		break;

		case "mainmenu":

			menuStages.options = false;
			menuStages.main = true;
			menuStages.game = false;

			game.paused = true;

			optionsMenu.setVisibility(false);


			mainMenu.setVisibility(true);

		break;


	}


}



/*

	MOVEMENT

*/

function paddleMove(paddleBody, lineAngle){

	
	var x = (Math.sin(lineAngle) * paddleRunRadius);
	//Some trigonometry to work out position from angle and know side (radius of circle).
	paddleBody.body.x = (x + (game.width / 2));
	paddleBody.body.y = (x / Math.tan(-lineAngle) + (game.height / 2));

	//Case of divide by zero when angle == 0, so deal with special case.
	if(lineAngle == 0){

		paddleBody.body.x = game.width / 2;
		paddleBody.body.y = (game.height / 2) - paddleRunRadius;


	}

	//Rotate paddle so it always faces center.
	paddleBody.body.rotation = lineAngle;

	

}



function pcControls(lineAngle){


	if( game.input.activePointer.isDown ){

		paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, mousePoint) - (Math.PI / 2);
		secondPaddle.body.rotation = game.physics.arcade.angleBetween(secondPaddle.position, mousePoint) - (Math.PI / 2);

	}
	else{

		paddleMove(paddle, lineAngle);

		if(secondPaddleActive){

			paddleMove(secondPaddle, lineAngle - Math.PI);

		}

	}


}

function touchControls(lineAngle){

	var firstPoint = new Phaser.Point(game.input.pointer1.x, game.input.pointer1.y);
	var secondPoint = new Phaser.Point(game.input.pointer2.x, game.input.pointer2.y);

	if(game.input.pointer1.isDown && game.input.pointer2.isDown){

		paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, secondPoint) + (Math.PI / 2);
		secondPaddle.body.rotation = game.physics.arcade.angleBetween(secondPaddle.position, mousePoint) - (Math.PI / 2);

	}
	else if(game.input.pointer1.isDown && game.input.pointer2.isUp){


		paddleMove(lineAngle)

		if(secondPaddleActive){

			paddleMove(secondPaddle, lineAngle - Math.PI);

		}



	}


}

function updateBallVelocity(){

	ballVector.set(ball.body.velocity.x, ball.body.velocity.y);

	if(ballVector.getMagnitude() < ballSpeed){

		ballVector.setMagnitude(ballSpeed);

		ball.body.velocity.x = ballVector.x;
		ball.body.velocity.y = ballVector.y;

	}

}

/*

	TIMING

*/

function resetMessage(){


	messageTimedOut = false;


}








/*

	Block

	A square sprite with static collider physics placed at a position and may be moved.

*/

var Block = (
	
	function(){

		//Constructor, Specify starting color.
		function Block(color){

			this.x = 0;
			this.y = 0;

			this.width = 0;
			this.height = 0;

			this.color = color.toLowerCase();

			this.sprite = game.add.sprite(this.x, this.y, this.color.concat("block"));

			this.sprite.width = blockSize;
			this.sprite.height = blockSize;

			this.width = this.sprite.width;
			this.height = this.sprite.height;

			this.absolute = false;

			this.blockAlive = true;

			initBlockPhysics(this.sprite);

		}


		//Private function to define block static physics.
		var initBlockPhysics = function(sprite){

			game.physics.p2.enable(sprite);
			
			sprite.body.setRectangle(sprite.width, sprite.height, 0, 0, 0);
			sprite.body.x = this.x;
			sprite.body.y = this.y;
			sprite.body.static = true;


			sprite.physicsBodyType = Phaser.Physics.P2JS;

			sprite.body.setCollisionGroup(blockCollisionGroup);
			sprite.body.collides(ballCollisionGroup);
			sprite.body.collides(paddleCollisionGroup, collectPowerup, this);



		};

		//Set the block at a position.
		Block.prototype.setPos = function(x, y){

		this.x = x;
		this.y = y;

		this.sprite.body.x = x;
		this.sprite.body.y = y;


		
		};

		Block.prototype.setDormant = function(){

			this.blockAlive = false;

		}

		//Returns this blocks position. 
		Block.prototype.getPos = function(){

			return {x: this.x, y: this.y};

		};

		Block.prototype.getBody = function(){

			return this.sprite.body;

		};

		//Make this block dissapear.
		Block.prototype.hide = function(){

			this.sprite.visible = false;
			this.sprite.alive = false;

			this.blockAlive = false;

		};

		//Make this block appear.
		Block.prototype.show = function(){

			this.sprite.visible = true;
			this.sprite.alive = true;

			this.blockAlive = true;

		};


		Block.prototype.makeAbsolute = function(abs){

			this.absolute = abs;

		};

		Block.prototype.isAbsolute = function(){

			return this.absolute;

		}

		Block.prototype.isAlive = function(){

			return this.blockAlive;

		}

		Block.prototype.storeTween = function(tween){

			this.tween = tween;

		}

		Block.prototype.getTween = function(){

			return this.tween;

		}

		return Block;


	}()
);





/*

	Blockline

	Defines a container object able to encompass many Blocks, 
	makes for easier programming of many Blocks.

*/

function BlockLine(startPos, direction, numOfBlocks, color){

	this.numOfBlocks = numOfBlocks;
	this.startPos=  startPos;

	//Offset start position by block size as this is a cartesian coordinate.
	this.startPos.x *= blockSize;
	this.startPos.y *= blockSize;

	var differX = false;
	

	if(direction.toLowerCase().includes("x")){

		differX = true;

	}

	//Negative direction specified, correct.
	if(this.numOfBlocks < 0){

		console.log("BlockLine error: Negative number of blocks specified.");

	}

	this.blocks = new Array();

	for(var i = 0; i < this.numOfBlocks; i++){

		this.blocks.push(new Block(color));


		if(differX){

			this.blocks[i].setPos(startPos.x + (i * this.blocks[i].width), startPos.y);

		}
		else{

			this.blocks[i].setPos(startPos.x, startPos.y + (i * this.blocks[i].height));


		}



	}


}

//Returns the block instance at the index in the parameter.
BlockLine.prototype.getBlock = function(index){

	return this.blocks[index];


}

BlockLine.prototype.getLength = function(){

	return this.blocks.length;

}


/*

	Level

	An object containing many Blocks, this also contains a co-ordinate system, 
	keeps blocks alligned to a grid accoring to their size it also removes blocks 
	outside of the applicable Level space.

*/

var Level = (

	function(){

		function Level(name){

			this.blocks = new Array();
			this.name = name;
			this.zeroPos = {x: 0, y: 0};
			this.size = 0;
			this.blockPositions = new Array();
			this.blocksLeft = 0;

		}


		//Updates the origin co-ordinate of the Level space.
		Level.prototype.updatePosition = function(center, radius, buffer, checkOutOfBounds){

			var sideLength = (Math.sin(Math.PI / 4) * (radius * 2)) - buffer;

			this.zeroPos.x = center.x - (sideLength / 2);
			this.zeroPos.y = center.y - (sideLength / 2);

			this.size = sideLength;

			if(this.blocks.length > 0){

				blocksToBounds(this.blocks, this.blockPositions, this.zeroPos, this.size, checkOutOfBounds);

			}




		};

		//Add blocks to the Level container. Also is able to dissassemble BlockLines into Blocks.
		Level.prototype.addBlocks = function(blockObj){

			if(blockObj instanceof Block){


				this.blocks.push(blockObj);

				if(!blockObj.isAbsolute()){

					this.blockPositions.push({ x: blockObj.getPos().x * blockSize, y: blockObj.getPos().y * blockSize });

				}
				else{

					this.blockPositions.push({x: blockObj.getPos().x, y: blockObj.getPos().y});

				}

				this.blocksLeft++;

			}
			else if(blockObj instanceof BlockLine){

				for(var i = 0; i < blockObj.getLength(); i++){

					var block = blockObj.getBlock(i);

					this.blocks.push(block);

					this.blockPositions.push({x: block.getPos().x, y: block.getPos().y});

					this.blocksLeft++;

				}


			}



		};

		Level.prototype.numBlocksLeft = function(){

			return this.blocksLeft;

		};

		Level.prototype.blockHit = function(){

			this.blocksLeft--;

		}

		Level.prototype.getBlock = function(id){

			for(var i = 0; i < this.blocks.length; i++){

				if(this.blocks[i].getBody().id == id){

					return this.blocks[i];

				}

			}

		}

		Level.prototype.deactivateBlock = function(id){

			for(var i = 0; i < this.blocks.length; i++){

				if(this.blocks[i].getBody().id == id){

					this.blocks[i].setDormant();

				}

			}

		}

		Level.prototype.setVisibility = function(visibility, force){

			for(var i = 0; i < this.blocks.length; i++){


				if(visibility && (this.blocks[i].isAlive() || force)){

					this.blocks[i].show();

				}
				else{

					this.blocks[i].hide();

				}

			}

		}

		Level.prototype.checkBlocksInWorld = function(){

			for(var i = 0; i < this.blocks.length; i++){

				if(
					this.blocks[i].getPos().x < 0 ||
					this.blocks[i].getPos().x > game.world.width ||
					this.blocks[i].getPos().y < 0 ||
					this.blocks[i].getPos().y > game.world.height
					)

					this.blocks[i].setDormant();

			}

		}

		//Brings all blocks to the Level bounds space.
		var blocksToBounds = function(blocks, blockPositions, zeroPos, size, checkOutOfBounds){


			for(var i = 0; i < blocks.length; i++){

				if(blocks[i].isAlive()){

					blocks[i].setPos(zeroPos.x + blockPositions[i].x, zeroPos.y + blockPositions[i].y);

				}

			}


			if(checkOutOfBounds){

				checkBlocks(blocks, zeroPos, size);

			}

		};

		//Check if the Block at the passed index is out of bounds (Level Space).
		var outOfBounds = function(index, blocks, zeroPos, size){

			if(

				(blocks[index].getPos().x > (zeroPos.x + size + blockSize)) || 
				(blocks[index].getPos().y > (zeroPos.y + size + blockSize))

				){

				return true;

			}

			return false;


		};

		//Check for all out of bounds blocks.
		var checkBlocks = function(blocks, zeroPos, size){

			for(var i = 0; (i < blocks.length); i++){

				if(outOfBounds(i, blocks, zeroPos, size)){	


					blocks[i].kill();
					blocks.pop(i);

				}
				else if(blocks[i].isAlive()){



					blocks[i].show();


				}

			}

		};



		return Level;


	}()

);


function Button(x, y, xSize, ySize, name){

	this.x = x;
	this.y = y;
	
	this.button = game.add.button(x, y, 'button', buttonSelect, this, 2, 1, 0);
	this.button.anchor.setTo(0.5, 0.5);
	this.button.scale.setTo(2, 2);

	this.button.name = name;

	this.isVisible = true;

}

Button.prototype.addText = function(text){


	this.text = game.add.text(this.x, this.y, text, { font: "30px Bauhaus 93", fill: "#4fa" } );
	this.text.anchor.setTo(0.5, 0.5);

}

Button.prototype.remove = function(){

	this.button.visible = false;
	this.text.visible = false;


}

Button.prototype.getName = function(){

	return this.name;

}

Button.prototype.setVisibility = function(visibility){

		this.button.visible = visibility;
		this.text.visible 	= visibility;

}

Button.prototype.setPos = function(x, y){

	this.button.offsetX = x - 100;
	this.button.offsetY = y;


}

function Menu(title){

	this.title = game.add.text(game.width / 2, 	game.height / 3, title, { font: "50px Bauhaus 93", fill: "#4fc" } );
	this.title.anchor.setTo(0.5, 0.5);

	this.buttonPosDelta = 0;

	this.buttons = new Array();

}

Menu.prototype.addButton = function(x, y, text, id){

	var newButton = new Button(x, y, 200, 64, id);
	newButton.addText(text);


	this.buttons.push(newButton);


}


Menu.prototype.setVisibility = function(visibility){

	this.title.visible = visibility;

	for(var i = 0; i < this.buttons.length; i++){

		this.buttons[i].setVisibility(visibility);

	}

}