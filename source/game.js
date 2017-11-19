

var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });

var bgMusic = new Audio('assets/sound/music.mp3');
var ambience = new Audio('assets/sound/ambience.mp3');
var lostSound = new Audio('assets/sound/lost.mp3');

var aspect = window.availWidth / window.availHeight;

//Player paddle vars.
var paddle, secondPaddle;
var paddleSize = { x: 150, y:24};
var secondPaddleActive = false;
//Paddle circle radius.
var paddleRunRadius = 350;

//Track number of player lives.
var lives = 3;

//Points needed to remember.
var mousePoint, centerPoint, paddlePoint;
mousePoint = centerPoint = paddlePoint = new Phaser.Point(0, 0);
//Ball vars.
var ball;
var ballSize = 15;
var ballSpeed = 200;

//Tracking for the balls velocity.
var ballVector = new Phaser.Point();


//Size difference in a single axis between body and sprite.
var bodyOffsetSize = 15;

//Angle between the center of the screen and the mouse position.
var lineAngle = 0;

//Track whether the browser is running on mobile OS.
var mobile = false;

//Track global block size.
var blockSize = 30;

//Collision groups for optimizing and efficient tracking of collisions.
var blockCollisionGroup;
var ballCollisionGroup;
var paddleCollisionGroup;

//Buffer around levels so paddle can hit 
var levelBuffer = blockSize * 3;

//Store all game levels and track which level is currently active.
var levels = new Array();
var currentLevel = 0;

//All game Menus.
var mainMenu, optionsMenu, nextLevelMenu, failScreen, endGameScreen, tutorialScreen;

//Array tracking the currently active game stage, different to menus so that gameplay can be tracked also.
var menuStages = { main: true, options: false, game: false, levelFinish: false, fail: false, endGame: false, tutorial: false };

//Container for UI and storage of Credits from text file.
var hud;
var creditText, tutorialText;
var fullscreenText;

//Container for all sounds.
var sounds;

//Allows debug information to be shown.
var globalDebug = false;


function preload() {
	
	/*
		Load in all visual assets.
	*/

	//Player paddle and ball.
	game.load.image('paddle', 'assets/visual/paddle(blurred).png');
	game.load.image('ball', 'assets/visual/ball.png');

	//Blocks for targets and power ups.
	game.load.image('redblock', 'assets/visual/block(red).png');
	game.load.image('greenblock', 'assets/visual/block(green).png');
	game.load.image('blueblock', 'assets/visual/block(blue).png');
	game.load.image('yellowblock', 'assets/visual/block(yellow).png');

	//Buttons.
	game.load.image('button', 'assets/visual/button.png');
	game.load.image('disabledbutton', 'assets/visual/button(inactive).png');

	//Muted speaker icon indicating whether game is muted.
	game.load.image('mutedSpeaker', 'assets/visual/speakeroff.png');

	//Background.
	game.load.image('background', 'assets/visual/background(square,space).png');

	//Set mobile bool to not desktop.
	mobile = !this.game.device.desktop;

	//Audio for physics.
	game.load.audio('pop', 'assets/sound/pop.mp3');
	game.load.audio('beep', 'assets/sound/beep.mp3');
	game.load.audio('powerup', 'assets/sound/pwrup.mp3');
	game.load.audio('lost', 'assets/sound/lost.mp3');



}



function create() {

	ambience.play();
	bgMusic.volume = 0.25;
	lostSound.volume = 0.25;

	//Setup reference points, center, mouse and paddle.
	centerPoint = new Phaser.Point(game.width / 2, game.height / 2);
	mousePoint = new Phaser.Point();
	paddlePoint = new Phaser.Point();




	//Add a background image, anchor from center.
	backgroundImage = game.add.sprite(0, 0, 'background');
	backgroundImage.anchor.setTo(0.5, 0.5);

	//Get the center point of the screen.
	centerPoint.set(backgroundImage.x, backgroundImage.y);


	//Load in paddle asset in center, also load in second paddle.
	paddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');
	secondPaddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');

	secondPaddle.visible = false;

	//Setup paddle size.
	paddle.width = secondPaddle.width = paddleSize.x;
	paddle.height = secondPaddle.height = paddleSize.y;



	//Load in ball asset at center.
	ball = game.add.sprite(game.width * 0.9, game.height * 0.9, 'ball');

	//Set ball to global size.
	ball.width = ball.height= ballSize;


	/*
	
		PHYSICS

	*/

	initPhysics();

	//Add extra pointer for mobile users to use double touch.
	if(mobile){

		game.input.addPointer();

	}

	//Add mouse events to game on mouse up.
	game.input.onUp.add(function(pointer){ mouseUpEvents(pointer); }, this);

	game.paused = true;


	

	
	//Initial Resize.
	resizeGame($(window).width, $(window).height, centerPoint, currentLevel);


	//Create all menus and add to game.
	createMenus();

	//Default text style.
	var textStyle = { font: "30px Bauhaus 93", fill: "#fff"};

	//Setup HUD.
	hud = {

		level: game.add.text(10, 10, "n", textStyle), 
		levelName: game.add.text(100, 10, "level name", textStyle),
		blocksLeft: game.add.text(10, game.height - 40, "blocks left", textStyle),
		lives: game.add.text(game.width - 10, 10, "lives", textStyle)

	};

	hud.lives.anchor.setTo(1, 0);
	hud.lives.text = lives;

	sounds = {

		pop: game.add.audio('pop'),
		beep: game.add.audio('beep'), 
		power: game.add.audio('powerup'),
		lost: game.add.audio('lost')

	};


	//Add muted speaker to game but don't show yet.
	mutedSpeaker = game.add.sprite(100, 100, 'mutedSpeaker');
	mutedSpeaker.visible = false;

	//Read in Xml values and build levels.
	initXMLLevels();


	fullscreenText = game.add.text(game.width / 2, game.height / 2, "Double Click to go Fullscreen", {font: "30px Arial", fill: "#FFFFFF"});
	fullscreenText.anchor.set(0.5);
	fullscreenText.setShadow(6, 6, "rgba(0, 0, 0, 1)", 5);
	fullscreenText.alpha = 0;

	//Make everything dissapear until the game starts.
	paddle.visible = false;
	ball.visible = false;


}

function createMenus(){

	//Create main menu for start of game.
	mainMenu = new Menu("Orbit Breaker");
	mainMenu.addButton(game.width / 2, game.height / 2, "Play", "play");
	mainMenu.addButton(game.width / 3, game.height * (2 / 3), "Options", "options");
	mainMenu.addButton(game.width * (2 / 3), game.height * (2 / 3), "How to Play", "tutorial");

	mainMenu.setVisibility(true);

	//Create options menu for settings manipulation.
	optionsMenu = new Menu("Game Options");
	optionsMenu.addButton(game.width / 2, game.height / 2, "Sound", "togglesound");
	optionsMenu.addButton(game.width / 2, game.height * (2 / 3), "Back", "mainmenu");

	optionsMenu.setVisibility(false);

	//Next level menu for ending of levels.
	nextLevelMenu = new Menu("Level Complete!");
	nextLevelMenu.addButton(game.width / 2, game.height / 2, "Continue", "nextlevel");

	nextLevelMenu.setVisibility(false);

	//Screen to show if player fails.
	failScreen = new Menu("You have Lost");
	failScreen.addButton(game.width / 2, game.height / 2, "Try Again", "retry");
	failScreen.addButton(game.width / 2, game.height * (2 / 3), "Start Over", "restart");

	failScreen.setVisibility(false);

	//Screen for end of game.
	endGameScreen = new Menu("You have Completed Orbit Breakers!");
	endGameScreen.addButton(game.width * 0.8, game.height / 2, "Try Again?", "restart");

	tutorialScreen = new Menu("How to Play");
	tutorialScreen.addButton(game.width / 2, game.height - 200, "Back", "mainmenu");

	tutorialScreen.setVisibility(false);


	//Query credits file.
	jQuery.get('data/credits.txt', function(data){

		creditText = data;

	});

	jQuery.get('data/tutorial.txt', function(data){

		tutorialText = data;

	})

	endGameScreen.setVisibility(false);

}


function update() { 



	//Change function of update based on games current stage.
	if(menuStages.main || menuStages.options || menuStages.tutorial){

		//Pause and hide level so buttons can be seen.
		game.paused = true;

		levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, true);
		levels[currentLevel].setVisibility(false);
			

	}
	else if(menuStages.endGame){

		//Show end screen and add credits to menu.
		endGameScreen.setVisibility(true);
		console.log("text", textFile);
		endGameScreen.addText(textFile, 10, game.height * 0.2, game.width * 0.7, game.height * 0.9);


	}
	else if(menuStages.fail){

		//Game failed, disable current level and pause game.
		game.paused = true;
		levels[currentLevel].setVisibility(false);

		console.log("Lives Remaining", lives);

		//If no lives are left, player may not retry.
		if(lives == 0){

			failScreen.title.text += "\nAnd You're Out of Lives!";
			failScreen.disableButton("retry");

			
		}

	}
	else if(menuStages.game){

		if(!game.sound.mute){
			
			bgMusic.play();

		}

		//Update HUD on every frame.
		hud.levelName.text = levels[currentLevel].getName();
		hud.level.text = currentLevel;

		//Check for the current levels completion.
		checkLevelCompletion();

		//Update necessary references in space for game function (e.g. center point).
		setReferenceParameters();

		//Ensure game is not paused!
		game.paused = false;
		
		//Choose control function based on running OS type.
		if(mobile){

			touchControls(lineAngle);

		}
		else{

			pcControls(lineAngle);

		}

		//Ensure ball travels at correct speed and slowly speeds up in the beginning.
		updateBallVelocity();

		//Check if the ball goes out of bounds for failure condition.
		checkBallOutOfBounds();

	}

}


function render(){

	if(globalDebug){

		

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

function initXMLLevels(levelNumber){


	$(function(){

			$.ajax(

					{

						type: "GET",
						url: "data/levels.xml",
						dataType: "xml",

						success: function(xml){

							var xmlDocument = $.parseXML(xml), $xml = $(xmlDocument);


								buildLevels(xml);


							for(var i = 0; i < levels.length; i++){

								if(i < levelNumber){

									levels[i].deactivateBlock("all");

								}

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

	var searchString = "level";


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

	if($(window).width() > backgroundImage.width && $(window).height() > backgroundImage.height){

		backgroundImage.scale.setTo($(window).width / backgroundImage.width);

	}

	if(typeof centerPoint != "undefined" && menuStages.game){

		centerPoint.setTo(game.width / 2, game.height / 2);

	}

	if(typeof levels[currentLevel] != "undefined" && menuStages.game){

		levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

	}



}

/*

	GRAPHICS

*/

function flashText(text, x, y){

	game.time.events.add(500, function(){

				fullscreenText.alpha = 1;	
				fullscreenText.y = 0			
				game.add.tween(fullscreenText).to({y: game.height / 2}, 1500, Phaser.Easing.Linear.None, true);
				game.add.tween(fullscreenText).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);


			}, this);


}

/*

	EVENTS

*/

function mouseUpEvents(pointer){


		var doubleClick = (pointer.msSinceLastClick < game.input.doubleTapRate);

		if(!game.scale.isFullScreen && !mobile && menuStages.game){


			resizeGame(window.innerWidth, window.innerHeight, centerPoint, currentLevel);

			if(game.paused){

				game.paused = false;

			}

		}
		
		if(game.scale.isFullScreen && doubleClick){

			game.scale.stopFullScreen();
			resizeGame(window.innerWidth, window.innerHeight, centerPoint, currentLevel);


		}
		else if(doubleClick && !mobile){


			game.scale.startFullScreen(false);
			resizeGame(window.screen.width, window.screen.height, centerPoint, currentLevel);


		}
		else if(!doubleClick && pointer.msSinceLastClick < game.input.doubleTapRate * 2){

			flashText("Double Tap to Enter/Exit Fullscreen", game.width / 2, game.height / 2);

		}

}



function hitBlock(body1, body2){


	var rnd = game.rnd.frac();


	body2.static = false;

	var blockHit = levels[currentLevel].getBlock(body2.id);

	if(typeof blockHit == "undefined"){

		return;

	}

	blockHit.setDormant();
	

	//MAKE CHANCE DYNAMIC
	if(rnd >= 0.85){


		body2.dynamic = true;

		body2.sprite.visible = false;
		body2.sprite = game.add.sprite(body2.x, body2.y, 'yellowblock');

		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0.25}, 1000, Phaser.Easing.Linear.None, true, 0, 100, true));

		console.log("Powerup Spawned!");

	}
	else{

		body2.kinematic = true;
		body2.clearCollision();
		game.add.tween(body2.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);

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

	hud.blocksLeft.text = levels[currentLevel].numBlocksLeft();


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

	if(typeof blockHit == "undefined"){

		return;

	}

	blockHit.setDormant();

	game.tweens.remove(blockHit.getTween());

	game.add.tween(body1.sprite).to({alpha: 0}, 500, Phaser.Easing.Linear.None, true);
	game.add.tween(body1.sprite.scale).to({x: 2, y: 2}, 500, Phaser.Easing.Linear.None, true);

	levels[currentLevel].deactivateBlock(body1.id);

	sounds.power.play();



}

function removePowerUp(){

	secondPaddleActive = false;

	secondPaddle.alpha = 1;

	game.add.tween(secondPaddle.body.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);


	//secondPaddle.visible = false;



}



function levelFinished(){

	currentLevel++;


}

function checkBallOutOfBounds(){

	if(

		ball.body.x < 0 ||
		ball.body.x > game.width ||
		ball.body.y < 0 ||
		ball.body.y > game.height 

		&&

		!menuStages.endGame &&
		!menuStages.levelFinish

		){

		lostSound.play();

		menuStages.game = false;
		menuStages.fail = true;

		levels[currentLevel].setVisibility(false);
		failScreen.setVisibility(true);


		if(lives <= 0){

			failScreen.disableButton("retry");

		}

	}



}



function buttonSelect(button){

	switch(button.name){

		case !"togglesound":

			button.visible = false;

		break;

		case "play":

			menuStages.main = false;
			menuStages.tutorial = false;
			menuStages.game = true;

			game.paused = false;

			mainMenu.setVisibility(false);

			levels[currentLevel].setVisibility(true, true);
			paddle.visible = true;
			ball.visible = true;

			resizeGame()


		break;

		case "options":

			menuStages.main = false;
			menuStages.options = true;
			menuStages.game = false;

			game.paused = true;

			mainMenu.setVisibility(false);
			optionsMenu.setVisibility(true);

		break;

		case "tutorial":

			menuStages.main = false;
			menuStages.tutorial = true;

			game.paused = true;

			var widthBuffer = game.width * 0.2;
			var heightBuffer = game.height * 0.3;

			tutorialScreen.addText(tutorialText, widthBuffer, heightBuffer, game.width - (widthBuffer * 2), game.height - (heightBuffer * 2));

			mainMenu.setVisibility(false);
			tutorialScreen.setVisibility(true);



		break;

		case "togglesound":
			
			console.log(game.sound.mute);

			if(game.sound.mute){

				bgMusic.play();
				ambience.play();
				lostSound.volume = 1;

				game.sound.mute = false;
				mutedSpeaker.visible = false;

			}
			else{

				bgMusic.pause();
				ambience.pause();
				lostSound.volume = 0;

				game.sound.mute = true;
				mutedSpeaker.visible = true;

			}


			optionsMenu.setVisibility(true);


		break;

		case "mainmenu":

			menuStages.options = false;
			menuStages.main = true;
			menuStages.game = false;

			game.paused = true;

			optionsMenu.setVisibility(false);
			tutorialScreen.setVisibility(false);
			mainMenu.setVisibility(true);


		break;

		case "nextlevel":

			menuStages.levelFinish = false;
			menuStages.game = true;

			nextLevelMenu.setVisibility(false);

			currentLevel++;
			levels[currentLevel].setVisibility(true, true);
			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

			hud.level.text = currentLevel;
			hud.levelName.text = levels[currentLevel].getName();

			resetBall();

			game.paused = false;

		break;

		case "retry":

			console.log("Retry Pressed");

			menuStages.fail = false;
			menuStages.game = true;

			failScreen.setVisibility(false);
			levels[currentLevel].setVisibility(true, true);
			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

			resetBall();

			lives--;

			hud.lives.text = lives;

			game.paused = false;


		break;

		case "restart":

			location.reload();


		break;


	}

	sounds.beep.play();

	resizeGame(window.screen.width, window.screen.height, centerPoint, currentLevel);



}

function checkLevelCompletion(){

	//Check for whether the current level is finished.
	if(levels[currentLevel].numBlocksLeft() <= 0){

		//game.paused = true;
		menuStages.game = false;

		//If there are no levels left, show end game screen, otherwise show level finish menu.
		if(typeof levels[currentLevel + 1] == "undefined"){

			menuStages.endGame = true;
			endGameScreen.setVisibility(true);

		}
		else{

			menuStages.levelFinish = true;
			nextLevelMenu.setVisibility(true);

		}

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

function resetBall(){

	ball.body.x = game.width * (2 / 3);
	ball.body.y = game.height * (2 / 3);

	ball.body.velocity.x = 0;
	ball.body.velocity.y = 0;

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


		paddleMove(paddle, lineAngle)

		if(secondPaddleActive){

			paddleMove(secondPaddle, lineAngle - Math.PI);

		}



	}


}

function setReferenceParameters(){

	centerPoint.set(backgroundImage.x, backgroundImage.y);

	//Collect mouse co-ordinates into a point.
	mousePoint.set(game.input.x, game.input.y);

	//Get angle between the center and the mouse, account for offset.
	lineAngle = game.physics.arcade.angleBetween(centerPoint, mousePoint) + (Math.PI / 2);

}

function updateBallVelocity(){

	ballVector.set(ball.body.velocity.x, ball.body.velocity.y);

	if(ballVector.getMagnitude() == 0){

		ballVector.set(ball.body.velocity.x + 0.01, ball.body.velocity.y);


	}


	if(ballVector.getMagnitude() < ballSpeed || ballVector.getMagnitude() == 0){

		ballVector.setMagnitude(ballVector.getMagnitude() + 1);

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

			sprite.body.allowSleep = true;
			
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
			this.sprite.body.sleepMode = p2.World.BODY_SLEEPING;

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

			this.sprite.body.removeFromWorld();

		};

		//Make this block appear.
		Block.prototype.show = function(){

			this.sprite.visible = true;
			this.sprite.alive = true;

			this.blockAlive = true;
			this.sprite.body.addToWorld();

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
			this.alive = true;

		}

		Level.prototype.getName = function(){

			return this.name;

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

					console.log("Block Added", blockObj.getPos().x, blockObj.getPos().y);

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

			var allBlocks = false;

			if(id == "all"){

				id = null;
				allBlocks = true;

			}

			for(var i = 0; i < this.blocks.length; i++){

				if(allBlocks == true || this.blocks[i].getBody().id == id){

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

				if(outOfBounds(i, blocks, zeroPos, size) && blocks[i].isAlive()){	

					console.log("hide");

					blocks[i].hide();

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

Button.prototype.deactivate = function(){

	this.button.inputEnabled = false;
	this.button.loadTexture('disabledbutton', 0, false);	

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
	this.texts = new Array();


}

Menu.prototype.addButton = function(x, y, text, id){

	var newButton = new Button(x, y, 200, 64, id);
	newButton.addText(text);


	this.buttons.push(newButton);


}

Menu.prototype.disableButton = function(name){

	for(var i = 0; i < this.buttons.length; i++){

		if(this.buttons[i].button.name == name){

			this.buttons[i].deactivate();

		}

	}


}

Menu.prototype.setVisibility = function(visibility){

	this.title.visible = visibility;

	for(var i = 0; i < this.buttons.length; i++){


		this.buttons[i].setVisibility(visibility);

	}

	for(var i = 0; i < this.texts.length; i++){

		this.texts[i].visible = visibility;

	}

}

Menu.prototype.addText = function(text, x, y, dx, dy){

	var newText = game.add.text(0, 0, text, { font: "20px Courier New", fill: "#fff", boundsAlignH: "center", boundsAlignV: "middle"});
	//newText.setShadow(1, 1, 'rgba(0, 0, 0, 0.5)', 2);
	newText.setTextBounds(x, y, dx, dy);

	this.texts.push(newText);

}