

var game = new Phaser.Game(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });
	console.log(window.devicePixelRatio);

	//Import Javascript sounds. Imported here because they need to play whilst the game is paused.
var bgMusic = new Audio('assets/sound/music.mp3');
var ambience = new Audio('assets/sound/ambience.mp3');
var lostSound = new Audio('assets/sound/lost.mp3');

//Player paddle vars.
var paddle, secondPaddle;
var paddleSize = { x: 100, y:16};
var secondPaddleActive = false;

//Paddle circle radius.
var paddleRunRadius = 350;

//Track number of player lives.
var lives = 3;

//Points needed to remember.
var mousePoint, centerPoint;
mousePoint = centerPoint = new Phaser.Point(0, 0);
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
var fullscreenText, pauseText;

//Container for all sounds.
var sounds;

//Allows debug information to be shown.
var globalDebug = false;


function preload() {
	
	/*
		Load in all visual assets.
	*/

	//Player paddle and ball.
	game.load.image('paddle', 'assets/visual/paddle(sprite).png');
	game.load.image('ball', 'assets/visual/ball.png');

	//Blocks for targets and power ups.
	game.load.image('orangeblock', 'assets/visual/block(orange).png');
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

	//play ambient music, adjust volumes accordingly.
	ambience.play();
	bgMusic.volume = 0.25;
	lostSound.volume = 0.25;

	//Paddle circle radius is a quarter of the screen, block size is proportional.
	paddleRunRadius = $(window).width() / 4;
	blockSize = ((Math.sin(Math.PI / 4) * (paddleRunRadius * 2)) - levelBuffer) / 12;



	//Create all specialized in game objects.
	createObj();

	//Start up P2 Physics/
	initPhysics();

	//Add extra pointer for mobile users to use double touch.
	if(mobile){

		game.input.addPointer();

	}

	//Add mouse events to game on mouse up.
	game.input.onUp.add(function(pointer){ mouseUpEvents(pointer); }, this);
	
	//Initial Resize.
	resizeGame($(window).width, $(window).height, centerPoint, currentLevel);

	//Create all menus and add to game.
	createMenus();

	

	//Group sounds under a single object.
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

	//Create all needed text that isn't inside buttons.
	createText();


	//Make everything dissapear until the game starts.
	paddle.visible = false;
	ball.visible = false;

	game.sound.mute = false;

	loadGame();

	//If the loaded level is not a number, that indicates there is no save, revert to defaults.
	if(isNaN(currentLevel)){

		currentLevel = 0;
		lives = 3;

	}

	
}

function createObj(){

	//Setup reference points, center, mouse and paddle.
	centerPoint = new Phaser.Point(game.width / 2, game.height / 2);
	mousePoint = new Phaser.Point();

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

}

function createText(){

	//Default text style.
	var textStyle = { font: "30px Bauhaus 93", fill: "#fff"};

	//Setup HUD.
	hud = {

		level: game.add.text(10, 10, "n", textStyle), 
		levelName: game.add.text(100, 10, "level name", textStyle),
		blocksLeft: game.add.text(10, game.height - 40, "blocks left", textStyle),
		lives: game.add.text(game.width - 10, 10, "lives", textStyle)

	};

	hud.level.visible = false;
	hud.levelName.visible = false;
	hud.blocksLeft.visible = false;
	hud.lives.visible = false;

	hud.lives.anchor.setTo(1, 0);
	hud.lives.text = lives;


	//Setup text that reminds user how to go fullscreen.
	fullscreenText = game.add.text(game.width / 2, game.height / 2, "Double Click to go Fullscreen", textStyle);
	fullscreenText.anchor.set(0.5);
	fullscreenText.setShadow(6, 6, "rgba(0, 0, 0, 1)", 5);
	fullscreenText.alpha = 0;

	//Setup text telling the user that they have paused.
	pauseText = game.add.text(game.width / 2, game.height / 2, "Paused", textStyle);
	pauseText.anchor.set(0.5, 0.5);
	pauseText.setShadow(6, 6, "rgba(0, 0, 0, 1)", 5);
	pauseText.alpha = 0;

}

function createMenus() {

	//Create main menu for start of game.
	mainMenu = new Menu("Orbit Breaker");
	mainMenu.addButton(game.width / 2, game.height / 2, "Play", "play");
	mainMenu.addButton(game.width / 3, game.height * (2 / 3), "Options", "options");
	mainMenu.addButton(game.width * (2 / 3), game.height * (2 / 3), "How to Play", "tutorial");

	mainMenu.setVisibility(true);

	//Create options menu for settings manipulation.
	optionsMenu = new Menu("Game Options");
	optionsMenu.addButton(game.width / 2, game.height / 2, "Sound", "togglesound");
	optionsMenu.addButton(game.width * (2 / 3), game.height * (2 / 3), "Back", "mainmenu");
	optionsMenu.addButton(game.width / 3, game.height * (2 / 3), "Clear Save", "clearsaves");

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


	var textFileName;

	if(mobile){

		textFileName = 'data/tutorialMob.txt';

	}
	else{

		textFileName = 'data/tutorialPC.txt';

	}

	jQuery.get(textFileName, function(data){

		tutorialText = data;

	})



	endGameScreen.setVisibility(false);

}


function update() { 


	//Change function of update based on games current stage.
	if(menuStages.main || menuStages.options || menuStages.tutorial){

		bgMusic.pause();


		//Have levels ready but not visible as soon as they have been loaded from their file.
		if(typeof levels[currentLevel] != "undefined"){

			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, true);
			levels[currentLevel].setVisibility(false);
			
		}

	}
	else if(menuStages.endGame){

		//Show end screen and add credits to menu.
		endGameScreen.setVisibility(true);
		console.log("text", creditText);
		endGameScreen.addText(creditText, 10, game.height * 0.2, game.width * 0.7, game.height * 0.9);



	}
	else if(menuStages.levelFinish){

		game.paused = true;

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


function render() {

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

	//Start up P2 Physics system.
	game.physics.startSystem(Phaser.Physics.P2JS);

	//Enable impacts between paddles and balls (blocks are dealt with separately).
	game.physics.p2.setImpactEvents(true);
	game.physics.p2.enable([paddle, secondPaddle, ball], false);

	//Setup paddle body.
	paddle.body.setRectangle(paddleSize.x, paddleSize.y, 0, 0, 0);
	paddle.body.static = true;

	//Setup second paddle body.
	secondPaddle.body.setRectangle(paddleSize.x, paddleSize.y, 0, 0, 0);
	secondPaddle.body.static = true;

	//Second paddle body needs adjustment.
	secondPaddle.body.x = -100;
	secondPaddle.body.y = -100;

	//Setup ball body.
	ball.body.setCircle(ballSize / 2);

	//Ball initial velocity.	
	ball.body.velocity.x = -10;
	ball.body.velocity.y = -10;

	//Ball does not slow down, maximum inertia.
	ball.body.damping = 0;

	//Ball retains all energy(velocity) in a collision.
	game.physics.p2.restitution = 1;

	//Set Physics body types.
	paddle.physicsBodyType = Phaser.Physics.P2JS;
	secondPaddle.physicsBodyType = Phaser.Physics.P2JS;
	ball.physicsBodyType = Phaser.Physics.P2JS;

	//Set collision groups of all objects.
	ballCollisionGroup = game.physics.p2.createCollisionGroup();
	paddleCollisionGroup = game.physics.p2.createCollisionGroup();
	blockCollisionGroup = game.physics.p2.createCollisionGroup();

	paddle.body.setCollisionGroup(paddleCollisionGroup);
	secondPaddle.body.setCollisionGroup(paddleCollisionGroup);

	//Set collisions between groups.
	paddle.body.collides([ballCollisionGroup, blockCollisionGroup]);
	secondPaddle.body.collides(ballCollisionGroup);

	//Setup ball collision group.
	ball.body.setCollisionGroup(ballCollisionGroup);

	ball.body.collides(paddleCollisionGroup, hitPaddle, this);
	ball.body.collides(blockCollisionGroup, hitBlock, this);

}

function initXMLLevels(levelNumber){

	//Use AJAX to load information from XML file.
	$(function(){

		$.ajax({

			type: "GET",
			url: "data/levels.xml",
			dataType: "xml",

			success: function(xml){

				buildLevels(xml);


				//Deactivate all levels...
				for(var i = 0; i < levels.length; i++){

					if(i < levelNumber){

						//Stop blocks participating in collisions.
						levels[i].deactivateBlock("all");

					}

					//Force invisibility.
					levels[i].setVisibility(false, true);

				}
			}
		});
	});

}

function buildLevels(xml){

	//Create arrays to store blocks.
	var blockLines = new Array();
	var blocks = new Array();

	//Search through all levels...
	levels = $(xml).find("level").map(

		function(){

			//Get the name of the level, begin creating a level object...
			var newLevel = new Level($(this).attr("name"));

			//Get all blocklines and load them into the level.
			blockLines = $(this).children("blockLine").map(

				function(){

					//Temporary object to store starting position.
					var start = { x: 0, y: 0};

					//Get start position of blockline.
					start.x = parseInt($(this).find("position > x").text());
					start.y = parseInt($(this).find("position > y").text());

					//Get direction and length.
					var direction = $(this).find("direction").text();
					var numberOfBlocks = parseInt($(this).find("length").text());

					//Get the color.
					var color = $(this).find("color").text();

					//Return the new blocklne object.
					return new BlockLine(start, direction, numberOfBlocks, color);

				}

			);

			//Put blocklines into new level.
			for(var i = 0; i < blockLines.length; i++){

				newLevel.addBlocks(blockLines[i]);

			}

			//Get all blocks and load them into new level.
			blocks = $(this).children("block").map(

				function(){

					//Get the block's color and create block.
					var block = new Block($(this).find("color").text());

					//Set the position of the new block.
					block.setPos(

							parseInt($(this).find("x").text()),
							parseInt($(this).find("y").text())

					);


				//Check if the position of this block is on local coord system or global(absolute).
				if($(this).attr("absolute") == "true"){

					block.makeAbsolute(true);

				}
				else{

					block.makeAbsolute(false);

				}

				//Return the new block object.
				return block;

				}

			);

			//Add blocks to new level.
			for(var i = 0; i < blocks.length; i++){

				newLevel.addBlocks(blocks[i]);

			}

			//Return the finished level.
			return newLevel;

		}


	);

	console.log(levels);

}


/*

	DATA

*/

function saveGame(){

	//Locally store the latest completed level and the number of lives.
	localStorage.setItem("levelNumber", currentLevel + 1);
	localStorage.setItem("lives", lives);

	console.log("Game Saved", currentLevel + 1);

}

function loadGame(){

	//Retrieve the locally stored level number and lives.
	currentLevel = parseInt(localStorage.getItem("levelNumber"));
	lives = parseInt(localStorage.getItem("lives"));

	//Debug text for console.
	var debugLoad = ("Game Loaded, Level " + currentLevel + " | Lives " + lives).toString();
	debugLoad = debugLoad.replace(/NaN/g, "-");

	console.log(debugLoad);

}

function clearSave(){

	//Clear local storage, which consists of level number and lives.
	localStorage.removeItem("levelNumber");
	localStorage.removeItem("lives");

	console.log("All Saves Removed");

}

/*

	DISPLAY

*/

function resizeGame() {
	
	//Get the window width and height.
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();

	//Log the new size.
	console.log("Resizing to", windowWidth, "x", windowHeight);

	//Scale the game to the new size.
	game.scale.setGameSize(windowWidth, windowHeight);

	//Anchor the background at the center and move it to the center.
	backgroundImage.anchor.setTo(0.5, 0.5);
	backgroundImage.x = game.width / 2;
	backgroundImage.y = game.height / 2;

	//If the image does not fit in the window.	
	if(windowWidth > backgroundImage.width && windowHeight > backgroundImage.height){

		backgroundImage.scale.setTo(windowHeight / backgroundImage.height);

	}
	else if(windowHeight > backgroundImage.height){		//Scale image based on window aspect ratio.

		backgroundImage.scale.setTo(windowWidth / backgroundImage.width);

	}

	//These items depend on possibly unavailable information, and thus, may be undefined yet.

	//Set the center point as long as it is defined and player is playing the game.
	if(typeof centerPoint != "undefined" && menuStages.game){

		centerPoint.setTo(game.width / 2, game.height / 2);

	}

	//Update level position as long as it is defined and player is playing the game.
	if(typeof levels[currentLevel] != "undefined" && menuStages.game){

		levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

	}

}

/*

	GRAPHICS

*/

function showFullscreenText(){

	//After 500ms show a sliding text informing the user on how to go fullscreen.
	game.time.events.add(500, function(){

				fullscreenText.alpha = 1;	
				fullscreenText.y = 0			
				game.add.tween(fullscreenText).to({y: game.height / 2}, 1500, Phaser.Easing.Linear.None, true);
				game.add.tween(fullscreenText).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);


			}, this);

}

function showPauseText(){

	//Show the pause game text and center it.
	pauseText.alpha = 1;	
	pauseText.y = game.height / 2;
	pauseText.x = game.width / 2;

}

function hidePauseText(){

	//Remove the pause game text by making it fade out slowly over 1.5s.
	game.time.events.add(0, function(){

		game.add.tween(pauseText).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);

	}, this);

}

/*

	EVENTS

*/

function mouseUpEvents(pointer){

	//Track a boolean as to whether a double click has been performed.
	var doubleClick = (pointer.msSinceLastClick < game.input.doubleTapRate);

	//If not fullscreen, mobile and in game, resize the game.
	if(!game.scale.isFullScreen && !mobile && menuStages.game){

		//Resize the game to window.
		resizeGame();

		//Unpause in case menu was exited
		if(game.paused){

			game.paused = false;

		}

	}
	
	//If currently fullscreen, exit on double click.
	if(game.scale.isFullScreen && doubleClick){

		game.scale.stopFullScreen();

		//Resize again to adjust to window again.
		resizeGame();


	}
	else if(doubleClick && !mobile){	//If double clicking on desktop (Don't allow on mobile, unnecessary).


		game.scale.startFullScreen(false);
		resizeGame();


	}
	else if(!doubleClick && pointer.msSinceLastClick < game.input.doubleTapRate * 2){	//If double click was *almost* performed.

		//Show user how to go fullscreen in case they wanted to.
		showFullscreenText();

	}

}
	
//Setup pause event using JQuery.
$(document).keyup(function(event){

	//Check if "esc" key was pressed.
	if(event.keyCode == 27){

		//If game is paused.
		if(game.paused){

			//Revert to live game condition.
			menuStages.game = true;
			menuStages.paused = false;

			//Unpause.
			game.paused = false;

			//Remove paused game text.
			hidePauseText();


		}
		else{	//If not paused

			//Show paused text.
			showPauseText();

			//Revert to paused state.
			menuStages.game = false;
			menuStages.paused = true;

			//Pause game.
			game.paused = true;


		}

	}

});


function hitBlock(body1, body2){

	//Generate random chance number.
	var rnd = game.rnd.frac();

	//Standard blocks are static.
	body2.static = false;

	//Get the block that has been hit.
	var blockHit = levels[currentLevel].getBlock(body2.id);

	//If undefined, it has already been hit.
	if(typeof blockHit == "undefined" || blockHit.isPowerup()){

		return;

	}

	//Set the block as dormant (no physics).
	blockHit.setDormant();
	

	if(rnd >= 0.85){


		body2.dynamic = true;

		body2.sprite.visible = false;

		rnd = game.rnd.frac();

		if(rnd >= 0.5){

			//Spawn a paddle powerup!
			body2.sprite = game.add.sprite(body2.x, body2.y, 'yellowblock');
			blockHit.markPowerup("paddle");

		}
		else if(rnd >= 0.25){

			//Spawn an extra life!
			body2.sprite = game.add.sprite(body2.x, body2.y, 'redblock');
			blockHit.markPowerup("life");

		}

		//All powerups have a constant tween.
		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0.25}, 1000, Phaser.Easing.Linear.None, true, 0, 100, true));

		//Log that a powerup has spawned.
		console.log("Powerup Spawned!");

	}
	else{	//If not a powerup, create a standard fly-off block.

		//Standard fly-off blocks are kinematic and do not collide.
		body2.kinematic = true;
		body2.clearCollision();

		//Start temporary tween to fade out.
		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true));
		//Destroy block when tween is complete.
		blockHit.getTween().onComplete.add(function(){blockHit.destroy()}, this);
	}
	
	//Set block to fly off opposite ball hit point.
	var blockVelocity = new Phaser.Point(ball.body.velocity.x + game.rnd.integerInRange(-100, 100), ball.body.velocity.y + game.rnd.integerInRange(-100, 100));
	blockVelocity.setMagnitude((ballVector.getMagnitude() * (2 / 3)) * -1);

	//Translate to body corresponding to block.
	body2.velocity.x = blockVelocity.x;
	body2.velocity.y = blockVelocity.y;

	//Give a little random rotation to make it seem more dynamic.
	body2.angularVelocity = game.rnd.frac(-Math.PI, Math.PI);

	//Play a pop sound effect when colliding with a block.
	sounds.pop.play();

	//Ensure ball velocity remains constant.
	updateBallVelocity();

	//Inform level object that a block has been detroyed.
	levels[currentLevel].blockHit();
	//Log how many blocks are left in this level.
	console.log("Blocks Remaining", levels[currentLevel].numBlocksLeft());

	//Update HUD to new blocks remaining number.
	hud.blocksLeft.text = levels[currentLevel].numBlocksLeft();

}

function hitPaddle(body1, body2){

	//Play a sound when paddle is hit.
	sounds.pop.play();

}

function collectPowerup(body1, body2){

	//Log that powerup has been collected.
	console.log("Powerup Collected!");


	

	var blockHit = levels[currentLevel].getBlock(body1.id);
	
	if(typeof blockHit == "undefined"){

		return;

	}

	if(blockHit.getPowerup() == "paddle"){

		//Set paddle as active.
		secondPaddleActive = true;
		secondPaddle.visible = true;
		secondPaddle.alpha = 0;

		//Fade paddle in and stay for 10 seconds.
		game.add.tween(secondPaddle.body.sprite).to({alpha: 1}, 1000, Phaser.Easing.Linear.None, true);
		game.time.events.add(Phaser.Timer.SECOND * 10, removePowerUp, this);
			

	}
	else if(blockHit.getPowerup() == "life"){

		//Increment lives and update hud.
		lives++;
		hud.lives.text = lives;

	}

	//Ensure powerup block will not interact anymore.
	blockHit.setDormant();

	//Remove permanent tween from powerup block.
	game.tweens.remove(blockHit.getTween());

	//Create temporary tween to make smooth transition out.
	game.add.tween(body1.sprite).to({alpha: 0}, 500, Phaser.Easing.Linear.None, true);
	game.add.tween(body1.sprite.scale).to({x: 2, y: 2}, 500, Phaser.Easing.Linear.None, true);

	//Deactivate block from level.
	levels[currentLevel].deactivateBlock(body1.id);

	//Play powerup sound as collected.
	sounds.power.play();

}

function removePowerUp(){

	//Set paddle to inactive.
	secondPaddleActive = false;
	secondPaddle.alpha = 1;

	//Make paddle fade out.
	game.add.tween(secondPaddle.body.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);

}

function checkBallOutOfBounds(){

	//If the ball is outside the game world and player is not in a menu.
	if(

		ball.body.x < 0 ||
		ball.body.x > game.width ||
		ball.body.y < 0 ||
		ball.body.y > game.height 

		&&

		!menuStages.endGame &&
		!menuStages.levelFinish

		){

		//Play losing sound.
		lostSound.play();

		//Move to fail menu.
		menuStages.game = false;
		menuStages.fail = true;

		//Disable level and enable fail screen.
		levels[currentLevel].setVisibility(false);
		failScreen.setVisibility(true);

		//If out of lives, disable retry button.		
		if(lives <= 0){

			failScreen.disableButton("retry");

		}

	}

}

function buttonSelect(button){

	//Play button select sound.
	sounds.beep.play();

	//Select event based on name of button pressed.
	switch(button.name){

		case !"togglesound":

			button.visible = false;

		break;

		case "play":

			//Make HUD visible.
			hud.level.visible = true;
			hud.levelName.visible = true;
			hud.blocksLeft.visible = true;
			hud.lives.visible = true;

			//Move to game stage.
			menuStages.main = false;
			menuStages.tutorial = false;
			menuStages.game = true;

			//Unpause game if it is.
			game.paused = false;

			//Disable main menu.
			mainMenu.setVisibility(false);

			//Enable level and specialised objects.
			levels[currentLevel].setVisibility(true, true);
			paddle.visible = true;
			ball.visible = true;

			//Resize game so player can see everything.
			resizeGame();


		break;

		case "options":

			//Move to options state.
			menuStages.main = false;
			menuStages.options = true;
			menuStages.game = false;

			//Disable main menu and enable options.
			mainMenu.setVisibility(false);
			optionsMenu.setVisibility(true);

		break;

		case "tutorial":

			//Move to tutorial stage.
			menuStages.main = false;
			menuStages.tutorial = true;

			//Setup buffer for text.
			var widthBuffer = game.width * 0.2;
			var heightBuffer = game.height * 0.3;

			//Add text from text file to tutorial menu.
			tutorialScreen.addText(tutorialText, widthBuffer, heightBuffer, game.width - (widthBuffer * 2), game.height - (heightBuffer * 2));

			//Make tutorial menu visible.			
			mainMenu.setVisibility(false);
			tutorialScreen.setVisibility(true);

		break;

		case "togglesound":
			
			//if game is muted.
			if(game.sound.mute){

				//Play sounds.
				bgMusic.play();
				ambience.play();
				lostSound.volume = 1;

				//Enable game sound.
				game.sound.mute = false;
				//Make speaker invisible.
				mutedSpeaker.visible = false;

			}
			else{	//if not muted.

				//Stop sounds.
				bgMusic.pause();
				ambience.pause();
				lostSound.volume = 0;

				//Stop game audio.
				game.sound.mute = true;
				//Show speaker to inform user.
				mutedSpeaker.visible = true;

			}

			//Show options menu again.
			optionsMenu.setVisibility(true);


		break;

		case "clearsaves":

			//Clear local save.
			clearSave();

			//Change button text to confirm with user.
			optionsMenu.changeText("clearsaves", "Deleted");

			//Revert to default level and lives.
			currentLevel = 0;
			lives = 3;

		break;

		case "mainmenu":

			//Main menu state.
			menuStages.options = false;
			menuStages.main = true;
			menuStages.game = false;

			//Show main menu.
			optionsMenu.setVisibility(false);
			tutorialScreen.setVisibility(false);
			mainMenu.setVisibility(true);


		break;

		case "nextlevel":

			//Game state.
			menuStages.levelFinish = false;
			menuStages.game = true;

			//Remove between levels menu.
			nextLevelMenu.setVisibility(false);

			//Increment level number and setup new level.
			currentLevel++;
			levels[currentLevel].setVisibility(true, true);
			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

			//Update relevent hud items.
			hud.level.text = currentLevel;
			hud.levelName.text = levels[currentLevel].getName();

			//Reset ball to corner.
			resetBall();

			//Unpause game.
			game.paused = false;

		break;

		case "retry":

			//Game state.
			menuStages.fail = false;
			menuStages.game = true;

			//Remove fail screen, bring level back.
			failScreen.setVisibility(false);
			levels[currentLevel].setVisibility(true, false);
			levels[currentLevel].updatePosition(centerPoint, paddleRunRadius, levelBuffer, false);

			//Reset ball again.
			resetBall();

			//Decrement lives.
			lives--;

			//Update hud text.
			hud.lives.text = lives;

			//Unpause game.
			game.paused = false;


		break;

		case "restart":

			//Clear saves and reload page if user chooses to restart game.
			clearSave();
			location.reload();


		break;


	}

}

function checkLevelCompletion(){

	//Check for whether the current level is finished.
	if(levels[currentLevel].numBlocksLeft() <= 0){

		game.paused = true;
		menuStages.game = false;

		//If there are no levels left, show end game screen, otherwise show level finish menu.
		if(typeof levels[currentLevel + 1] == "undefined"){

			menuStages.endGame = true;
			endGameScreen.setVisibility(true);

		}
		else{

			//Save the game so user can continue later.
			saveGame();

			//Level finish state and show between levels menu.
			menuStages.game = false;
			menuStages.levelFinish = true;
			nextLevelMenu.setVisibility(true);

			//Choose console based on browser.
			if (typeof console._commandLineAPI !== 'undefined') {

			    console.API = console._commandLineAPI; //Clear Chrome Console.

			} else if (typeof console._inspectorCommandLineAPI !== 'undefined') {

			    console.API = console._inspectorCommandLineAPI; //Clear Safari Console.

			} else if (typeof console.clear !== 'undefined') {

			    console.API = console;

			}

			//Clear browser console to keep debug tidy.
			console.API.clear();			

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

	//Move ball to near corner.
	ball.body.x = game.width * 0.1;
	ball.body.y = game.height * 0.1;

	//Send ball at level.
	ball.body.velocity.x = 0;
	ball.body.velocity.y = 0;

}



function pcControls(lineAngle){

	//If mouse button is held.
	if( game.input.activePointer.isDown ){

		//Rotate paddle to face mouse pointer.
		paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, mousePoint) - (Math.PI / 2);
		secondPaddle.body.rotation = game.physics.arcade.angleBetween(secondPaddle.position, mousePoint) - (Math.PI / 2);

	}
	else{

		//Move paddle along circle.
		paddleMove(paddle, lineAngle);


		//Move second paddle to opposite point if active.
		if(secondPaddleActive){

			paddleMove(secondPaddle, lineAngle - Math.PI);

		}

	}


}

function touchControls(lineAngle){

	//Setup finger points.
	var firstPoint = new Phaser.Point(game.input.pointer1.x, game.input.pointer1.y);
	var secondPoint = new Phaser.Point(game.input.pointer2.x, game.input.pointer2.y);

	//if both pointers down, face paddle to points.
	if(game.input.pointer1.isDown && game.input.pointer2.isDown){

		paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, secondPoint) + (Math.PI / 2);
		secondPaddle.body.rotation = game.physics.arcade.angleBetween(secondPaddle.position, mousePoint) - (Math.PI / 2);

	}
	else if(game.input.pointer1.isDown && game.input.pointer2.isUp){ //If only one point held.

		//Move paddle along circle nearest to point.
		paddleMove(paddle, lineAngle)

		//Move second paddle to opposite side if active.
		if(secondPaddleActive){

			paddleMove(secondPaddle, lineAngle - Math.PI);

		}



	}


}

function setReferenceParameters(){

	//Center of game area.
	centerPoint.set(game.width / 2, game.height / 2);

	//Collect mouse co-ordinates into a point.
	mousePoint.set(game.input.x, game.input.y);

	//Get angle between the center and the mouse, account for offset.
	lineAngle = game.physics.arcade.angleBetween(centerPoint, mousePoint) + (Math.PI / 2);

}

function updateBallVelocity(){

	//Get the balls velocity.
	ballVector.set(ball.body.velocity.x, ball.body.velocity.y);

	//If vector is zero magnitude, offset to prevent error.
	if(ballVector.getMagnitude() == 0){

		ballVector.set(0.01, 0.01);


	}

	//If the balls speed is less than specified value.
	if(ballVector.getMagnitude() < ballSpeed || ballVector.getMagnitude() == 0){

		//Accelerate ball.
		ballVector.setMagnitude(ballVector.getMagnitude() + 1);

		//Update ball velocity.
		ball.body.velocity.x = ballVector.x;
		ball.body.velocity.y = ballVector.y;

	}

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
			this.powerup = false;

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
		Block.prototype.destroy = function(){

			this.sprite.visible = false;

			this.blockAlive = false;

			this.sprite.body.removeFromWorld();
			this.sprite.body.sleepMode = p2.World.BODY_SLEEPING;

		};

		Block.prototype.hide = function(){

			this.sprite.visible = false;
			this.sprite.body.removeFromWorld();

			//this.sprite.body.sleepMode = p2.World.BODY_SLEEPING;

		}

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

		Block.prototype.markPowerup = function(type){

			this.powerupType = type;
			this.powerup = true;

		}

		Block.prototype.getPowerup = function(){

			return this.powerupType;

		}

		Block.prototype.isPowerup = function(){

			return this.powerup;

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

					blocks[i].destroy();

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

	return this.button.name;

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

Button.prototype.setText = function(newText){

	this.text.setText(newText);
}

Button.prototype.getText = function(){

	return this.text;

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

Menu.prototype.changeText = function(buttonName, newText){

	for(var i = 0; i < this.buttons.length; i++){

		if(this.buttons[i].getName() == buttonName){

			this.buttons[i].setText(newText);

		}

	}

}