var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game-space', null, false, true);

game.state.add('boot', bootState);
game.state.add('play', playState);

game.state.start('boot');

//Import Javascript game.sounds. Imported here because they need to play whilst the game is paused.
var bgMusic = new Audio('assets/sound/music.mp3');
var ambience = new Audio('assets/sound/ambience.mp3');
var lostSound = new Audio('assets/sound/lost.mp3');

var backgroundImage, paddle, ball;

game.levels = [];

//Paddle circle radius.
function getPaddleRunRadius(){

	//Paddle circle radius is a quarter of the smallest dimension of the screen, block size is proportional.
	if(game.width < game.height){

		return game.width * 0.4;

	}
	else{

		return game.height * 0.4;

	}

};


//Player Related variables.
var player = {

	//Track number of player player.lives.
	lives: 3,

	//Hand tracking for leap motion.
	leftHand: new Object(),
	rightHand: new Object(),

	mousePoint: new Phaser.Point(),

	controlMethod: { desktop: true, mobile: false, leapMotion: false }

};

//Collision groups for optimizing and efficient tracking of collisions.
game.collisionGroups = {
	
	blockCollisionGroup: new Object(),
	ballCollisionGroup: new Object(),
	ballSensorGroup: new Object(),
	paddleCollisionGroup: new Object()

};

var menus = {
	
	//All game Menus.
	mainMenu: new Object(),
	optionsMenu: new Object(),
	nextLevelMenu: new Object(),
	failScreen: new Object(),
	endGameScreen: new Object(),
	tutorialScreen: new Object(),
	creditsScreen: new Object(),

	//Array tracking the currently active game stage, different to menus so that gameplay can be tracked also.
	stages: { main: true, options: false, game: false, levelFinish: false, fail: false, endGame: false, tutorial: false }

};

//Container for UI and storage of Credits from text file.
var hud;
var creditText, tutorialText;
var fullscreenText, pauseText;

var timer = 0


Number.prototype.map = function(inMin, inMax, outMin, outMax){

	return ((this - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

}

//Variable to hold loader progress bar.
var preloadBar;

function controllerSetup(){

	player.controlMethod.leapMotion = false;

	//Detect whether this device is a desktop or a mobile device.
	if(game.device.desktop){

		//Set device tracker to desktop.
		player.controlMethod.mobile = false;
		player.controlMethod.desktop = true;

	}
	else{

		//Set device tracker to mobile.
		player.controlMethod.mobile = true;
		player.controlMethod.desktop = false;
		
	}

	//Retrieve the Leap Motion controller.
	var controller = new Leap.Controller({ enableGestures: false });

	//On every frame...
	controller.loop(function(frame) {
	    
	    //Iterate through hand maps.
	    for(var i in frame.handsMap){

	    	//Get the current hand.
	    	let hand = frame.handsMap[i];

	    	//If this hand is the right hand...
	    	if(hand.type === "right"){

	    		//Update right hand variable.
	    		player.rightHand = hand;

	    	}
	    	else{

	    		//Otherwise update the left hand variable.
	    		player.leftHand = hand;

	    }

    	//As long as this is looping, the Leap Motion controller is in use.
      	player.controlMethod.mobile = false;
		player.controlMethod.desktop = false;
		player.controlMethod.leapMotion = true;

	   }


    });

}



//Funciton that creates game objects.
function createObj(){

	//Track body ID of last block that was hit.
	game.lastBlockHit = -1;

	//Track global block size.
	game.blockSize = getPaddleRunRadius() / 10;

	//Setup reference points, center, mouse and paddle.
	game.centerPoint = new Phaser.Point(game.width / 2, game.height / 2);
	player.mousePoint = new Phaser.Point();


	//Add a background image, anchor from center.
	backgroundImage = game.add.sprite(0, 0, 'background');
	backgroundImage.anchor.setTo(0.5, 0.5);


	//Load in paddle asset in center, also load in second paddle.
	paddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');

	paddle.paddleSize = { x: getPaddleRunRadius() * 0.25, y: getPaddleRunRadius() / 20 };
	paddle.paddleFollowLag = 8;
	paddle.lineAngle = 0;

	paddle.secondPaddle = game.add.sprite(game.width / 2, game.height / 2, 'paddle');
	paddle.secondPaddle.tint = 0xffaaff;
	paddle.secondPaddle.visible = false;
	paddle.secondPaddle.active = false;

	//Setup paddle size.
	paddle.width = paddle.secondPaddle.width = paddle.paddleSize.x;
	paddle.height = paddle.secondPaddle.height = paddle.paddleSize.y;


	//Load in ball asset at center.
	ball = game.add.sprite(game.width / 2, game.height / 2, 'ball');

	ball.ballSize = getPaddleRunRadius() / 40;
	ball.ballSpeed = 200;
	ball.superBall = false;

	//Set ball to global size.
	ball.width = ball.height = ball.ballSize;


	ball.ballTrail = game.add.emitter(0, 0, 2000);
	ball.ballTrail.makeParticles('ball');

	//ball.addChild(ball.ballTrail);

	ball.ballTrail.lifeSpan = 500;

	ball.ballTrail.maxParticleSpeed = 10;
	ball.ballTrail.minParticleSpeed = 10;

	ball.ballTrail.setAlpha(1, 0, 2000, Phaser.Easing.Linear.None, false);
	ball.ballTrail.setScale(1, 0, 1, 0, 2000, Phaser.Easing.Quintic.Out, false);
	ball.ballTrail.autoAlpha = true;
	ball.ballTrail.autoScale = true;

	ball.ballTrail.start(false, 2000, 10, 0, false);


}

//Function creating all game text strings.
function createText(){

	//Default text style.
	let textStyle = { font: "30px Bauhaus 93", fill: "#fff"};

	//Setup HUD.
	hud = {

		level: game.add.text(game.width * 0.01, game.height * 0.01, "n", textStyle), 
		levelName: game.add.text(game.width * 0.1, game.height * 0.01, "level name", textStyle),
		blocksLeft: game.add.text(game.width * 0.01, game.height * 0.95, "blocks left", textStyle),
		lives: game.add.text(game.width * 0.95, game.height * 0.01, "Lives", textStyle)

	};

	hud.level.visible = false;
	hud.levelName.visible = false;
	hud.blocksLeft.visible = false;
	hud.lives.visible = false;

	hud.lives.anchor.setTo(1, 0);
	hud.lives.text = "Lives: " + player.lives;


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

//Function creating all game menus.
function createMenus() {

	//Create main menu for start of game.
	menus.mainMenu = new Menu("Orbit Breakers");
	menus.mainMenu.addButton(game.width / 2, game.height / 2, "Play", "play");
	menus.mainMenu.addButton(game.width / 3, game.height * (2 / 3), "Options", "options");
	menus.mainMenu.addButton(game.width * (2 / 3), game.height * (2 / 3), "How to Play", "tutorial");

	menus.mainMenu.setVisibility(true);

	//Create options menu for settings manipulation.
	menus.optionsMenu = new Menu("Game Options");
	menus.optionsMenu.addButton(game.width / 3, game.height / 2, "Sound", "togglesound");
	menus.optionsMenu.addButton(game.width * (2 / 3), game.height / 2, "Credits", "credits");
	menus.optionsMenu.addButton(game.width * (2 / 3), game.height * (2 / 3), "Back", "back");
	menus.optionsMenu.addButton(game.width / 3, game.height * (2 / 3), "Clear Save", "clearsaves");

	menus.optionsMenu.setVisibility(false);

	//Next level menu for ending of game.levels.
	menus.nextLevelMenu = new Menu("Level Complete!");
	menus.nextLevelMenu.addButton(game.width / 2, game.height / 2, "Continue", "nextlevel");
	menus.nextLevelMenu.addText("Game Saved", (game.width / 2) - 100, (game.height / 2) - 100, game.width, game.height);

	menus.nextLevelMenu.setVisibility(false);

	//Screen to show if player fails.
	menus.failScreen = new Menu("You have Lost");
	menus.failScreen.addButton(game.width / 2, game.height / 2, "Try Again", "retry");
	menus.failScreen.addButton(game.width / 2, game.height * (2 / 3), "Start Over", "restart");

	menus.failScreen.setVisibility(false);

	//Screen for end of game.
	menus.endGameScreen = new Menu("You have Completed Orbit Breakers!");
	menus.endGameScreen.addButton(game.width * 0.8, game.height / 2, "Try Again?", "restart");

	menus.endGameScreen.setVisibility(false);

	menus.creditsScreen = new Menu("Game Credits");
	menus.creditsScreen.addButton(game.width / 2, game.height * 0.9, "Back", "back");

	menus.creditsScreen.setVisibility(false);

	menus.tutorialScreen = new Menu("How to Play");
	menus.tutorialScreen.addButton(game.width / 2, game.height * 0.9, "Back", "back");

	menus.tutorialScreen.setVisibility(false);



	let textFileName;

	if(player.controlMethod.mobile){

		textFileName = 'data/tutorialMob.txt';

	}
	else if(player.controlMethod.desktop){

		textFileName = 'data/tutorialPC.txt';

	}
	else{

		textFileName = 'data/tutorialLeap.txt';

	}

	jQuery.get(textFileName, function(data){

		tutorialText = data;

	})

	menus.endGameScreen.setVisibility(false);

}




/*	INITIALISERS

*/

//Initialise All Object Physics
function initPhysics(){

	//Buffer around game.levels so paddle surrounds level blocks.
	game.levelBuffer = game.blockSize * 3;

	//Start up P2 Physics system.
	game.physics.startSystem(Phaser.Physics.P2JS);

	//Enable impacts between paddles and balls (blocks are dealt with separately).
	game.physics.p2.setImpactEvents(true);
	game.physics.p2.enable([paddle, paddle.secondPaddle, ball], false);

	//Setup paddle body.
	paddle.body.setRectangle(paddle.paddleSize.x, paddle.paddleSize.y, 0, 0, 0);
	paddle.body.static = true;

	//Setup second paddle body.
	paddle.secondPaddle.body.setRectangle(paddle.paddleSize.x, paddle.paddleSize.y, 0, 0, 0);
	paddle.secondPaddle.body.static = true;

	//Second paddle body needs adjustment.
	paddle.secondPaddle.body.x = -100;
	paddle.secondPaddle.body.y = -100;

	//Setup ball body.
	ball.body.setCircle(ball.ballSize / 2);

	//Ball initial velocity.	
	ball.body.velocity.x = -10;
	ball.body.velocity.y = -10;

	//Ball does not slow down, maximum inertia.
	ball.body.damping = 0;

	//Ball retains all energy(velocity) in a collision.
	game.physics.p2.restitution = 1;

	
	//Set Physics body types.
	paddle.physicsBodyType = Phaser.Physics.P2JS;
	paddle.secondPaddle.physicsBodyType = Phaser.Physics.P2JS;
	ball.physicsBodyType = Phaser.Physics.P2JS;
	
	//Set collision groups of all objects.
	game.collisionGroups.ballCollisionGroup = game.physics.p2.createCollisionGroup();
	game.collisionGroups.ballSensorGroup = game.physics.p2.createCollisionGroup();
	game.collisionGroups.paddleCollisionGroup = game.physics.p2.createCollisionGroup();
	game.collisionGroups.blockCollisionGroup = game.physics.p2.createCollisionGroup();

}

function initCollisions(){

	var allCgs = game.collisionGroups;

	paddle.body.setCollisionGroup(allCgs.paddleCollisionGroup);
	paddle.secondPaddle.body.setCollisionGroup(allCgs.paddleCollisionGroup);

	//Set collisions between groups.
	paddle.body.collides([allCgs.ballCollisionGroup, allCgs.ballSensorGroup, allCgs.blockCollisionGroup]);
	paddle.secondPaddle.body.collides([allCgs.ballCollisionGroup, allCgs.ballSensorGroup]);

	//Setup ball collision group.
	ball.body.setCollisionGroup(allCgs.ballCollisionGroup);

	ball.body.collides(allCgs.paddleCollisionGroup, hitPaddle, this);
	ball.body.collides(allCgs.blockCollisionGroup, hitBlock, this);

}

//Obtain and implement all XML Data.
function initXMLLevels(levelNumber){

	//Use AJAX to load information from XML file.
	$(function(){
		$.when(
	
			$.ajax({

			type: "GET",
			url: "data/levels.xml",
			dataType: "xml",

			success: function(xml){

					buildLevels(xml);

				}

			})

		).done(function(){

			//If number stored is higher than number of levels, restart game.
			if(game.currentLevel > game.levels.length - 1){

				//Restart levels at zero.
				game.currentLevel = 0;

			}

			//Deactivate all game.levels...
			for(var i = 0; i < game.levels.length; i++){

				if(i < levelNumber){

					//Stop blocks participating in collisions.
					game.levels[i].deactivateBlock("all");

				}

				//Force invisibility.
				game.levels[i].setVisibility(false, true);


			}

			console.log("XML Loading Finished.");

			//Update HUD to new blocks remaining number.
			hud.blocksLeft.text = "Blocks Left: " + game.levels[game.currentLevel].numBlocksLeft();


		});
	});

	

}

//Subsidiary of initXMLLevels, uses xml data to build all game.levels.
function buildLevels(xml){

	//Create arrays to store blocks.
	var blockLines = [];
	var blocks = [];

	//Search through all game.levels...
	game.levels = $(xml).find("level").map(

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
				if($(this).attr("absolute") === "true"){

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

	console.log("All game.levels", game.levels);

}


/*	DATA

*/

//Store game data locally.
function saveGame(){

	//Locally store the latest completed level and the number of player.lives.
	localStorage.setItem("levelNumber", game.currentLevel + 1);
	localStorage.setItem("Lives", player.lives);

	console.log("Game Saved", game.currentLevel + 1);

}

//Obtain locally stored data and resume from last completed level.
function loadGame(){

	//Retrieve the locally stored level number and player.lives.
	game.currentLevel = parseInt(localStorage.getItem("levelNumber"));
	player.lives = parseInt(localStorage.getItem("lives"));

	//Debug text for console.
	var debugLoad = ("Game Loaded, Level " + game.currentLevel + " | player.lives " + player.lives).toString();
	debugLoad = debugLoad.replace(/NaN/g, "-");

	console.log(debugLoad);

}

//Delete all locally stored data.
function clearSave(){

	//Clear local storage, which consists of level number and player.lives.
	localStorage.removeItem("levelNumber");
	localStorage.removeItem("lives");

	console.log("All Saves Removed");

}

function saveVolume(value){

	//Save the passed value to local storage.
	localStorage.setItem("volume", value);

	var name = "";

	console.log("Saved value", value);


}

function loadVolume(){

	//Load the value from local storage into a local variable.
	var volume = parseInt(localStorage.getItem("volume"));

	console.log("Loaded", volume, "volume");

	//Check if the value is invalid.
	if(isNaN(volume)){

		//If so, then set to default 1.
		volume = 1;

	}

	//Return this value.
	return volume;


}

/*	DISPLAY

*/

//Resize game to browser window size.
function resizeGame() {
	
	if(game.height === $(window).height || game.width === $(window).width){

		console.log("No resize needed");
		return;

	}

	//Get the window width and height.
	var windowWidth = $(window).width();
	var windowHeight = $(window).width();

	//Log the new size.
	console.log("Resizing to", windowWidth, "x", windowHeight);

	//Anchor the background at the center and move it to the center.
	backgroundImage.anchor.setTo(0.5, 0.5);
	backgroundImage.x = game.width / 2;
	backgroundImage.y = game.height / 2;

	//If the image does not fit in the window, resize it to fit, but retain aspect ratio.
	if(windowWidth > backgroundImage.width && windowHeight > backgroundImage.height){

		backgroundImage.scale.setTo(windowHeight / backgroundImage.height);

	}
	else if(windowHeight > backgroundImage.height){		//Scale image based on window aspect ratio.

		backgroundImage.scale.setTo(windowWidth / backgroundImage.width);

	}

	//These items depend on possibly unavailable information, and thus, may be undefined yet.

	//Keep Center Point reference up to data and ensure that level stays in middle of screen.
	if(menus.stages.game){

		game.centerPoint.setTo(game.width / 2, game.height / 2);
		game.levels[game.currentLevel].updatePosition(game.centerPoint, getPaddleRunRadius(), game.levelBuffer, false);

	}


}

/*	GRAPHICS

*/

//Temporarily show fullscreen text.
function flashText(newText){


	fullscreenText.text = newText;

	if(game.time.now - timer > 5000){

		timer = game.time.now;


		//After 500ms show a sliding text informing the user on how to go fullscreen.
		game.time.events.add(500, function(){

					game.world.bringToTop(fullscreenText);
					fullscreenText.alpha = 1;	
					fullscreenText.y = 0			
					game.add.tween(fullscreenText).to({y: game.height / 2}, 3000, Phaser.Easing.Quadratic.Out, true);
					game.add.tween(fullscreenText).to({alpha: 0}, 3000, Phaser.Easing.Linear.None, true);


				}, this);

	}

}

//Show pause screen text.
function showPauseText(){

	if(typeof pauseText === "undefined"){

		console.warn("Pause Text is undefined.")
		return;

	}

	//Show the pause game text and center it.
	pauseText.alpha = 1;	
	pauseText.y = game.height / 2;
	pauseText.x = game.width / 2;

}

//Hide pause screen text.
function hidePauseText(){

	//Remove the pause game text by making it fade out slowly over 1.5s.
	game.time.events.add(0, function(){

		game.add.tween(pauseText).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);

	}, this);

}

/*	EVENTS

*/

//Pause the game animation and mute all audio.
function pauseGame(){

	//Pause simulation and show pause text.
	game.paused = true;
	showPauseText();

	console.log("Game Paused");

}


function unPauseGame(){

	//Unpause simulation and hide pause text.
	game.paused = false;
	hidePauseText();

	console.log("Game Unpaused");

}

function mouseUpEvents(pointer){

	//Track a boolean as to whether a double click has been performed.
	var doubleClick = (pointer.msSinceLastClick < game.input.doubleTapRate);

	//If not fullscreen, mobile and in game, resize the game.
	if(!game.scale.isFullScreen && !player.controlMethod.mobile && menus.stages.game){

		
		//Unpause in case menu was exited
		game.paused = false;


	}
	
	//If currently fullscreen, exit on double click.
	if(game.scale.isFullScreen && doubleClick){

		game.scale.stopFullScreen();

	}
	if(doubleClick && !player.controlMethod.mobile){	//If double clicking on desktop (Don't allow on mobile, unnecessary).

		game.scale.startFullScreen(false);

	}
	if(!doubleClick && pointer.msSinceLastClick < game.input.doubleTapRate * 2){	//If double click was *almost* performed.

		//Show user how to go fullscreen in case they wanted to.
		flashText("Double Click to go Fullscreen");

	}
	if(!doubleClick && !game.paused){

		//If mouse focus was lost on fullscreen allow unpausing via mouse click.
		unPauseGame();

	}
	

}

function toggleMute(){

	//if game is muted.
	if(game.sound.mute){

		playAll();

	}
	else{	//if not muted.

		muteAll();

	}

}

function muteAll(){

//Stop game.sounds.
bgMusic.pause();
ambience.pause();
lostSound.volume = 0;

//Stop game audio.
game.sound.mute = true;
//Show speaker to inform user.
mutedSpeaker.visible = true;

saveVolume(0)

}

function playAll(){

//Play game.sounds.
bgMusic.play();
ambience.play();
lostSound.volume = 1;

//Enable game sound.
game.sound.mute = false;
//Make speaker invisible.
mutedSpeaker.visible = false;

saveVolume(1)

}


//Key and mouse button press events.
$(document).ready(function(event){

	$(document).contextmenu(function(event){

		game.paused = true;

	});

	//Pause/unpause game when Escape key is pressed.
	$(document).keyup(function(event){

		//Check if "esc" key was pressed.
		if(event.keyCode === 27){

			//If game is paused.
			if(game.sound.mute){

				//Revert to live game condition.
				menus.stages.game = true;
				menus.stages.paused = false;

				//Unpause.
				game.paused = false;

				//Remove paused game text.
				hidePauseText();


			}
			else{	//If not paused

				//Show paused text.
				showPauseText();

				//Revert to paused state.
				menus.stages.game = false;
				menus.stages.paused = true;

				//Pause game.
				game.paused = true;


			}

		}

		if(event.keyCode === 77){

			toggleMute();

		}

	});

	//Pause game when mouse leaves window.
	$(document).mouseleave(function(){

		if(menus.stages.game){
			
			pauseGame();

		}

	});
	
});


function hitBlock(body1, body2){

	//Make block not static so it can now move.
	body2.static = false;

	//Get the block that has been hit.
	var blockHit = game.levels[game.currentLevel].getBlock(body2.id);

	//If undefined, it has already been hit and body hasn't been disabled yet.
	if(typeof blockHit === "undefined"){

		return;

	}

	//Set the block as dormant (no physics).
	blockHit.setDormant();
	blockHit.explode();
	
	//15% chance to spawn a powerup.
	if(blockHit.isPowerup()){

		//Powerups are dynamic colliders and the new sprite should be visible.
		body2.dynamic = true;
		body2.sprite.visible = false;

		console.log("Block", blockHit.getColor(), "hit");
		
		body2.sprite = null;

		//.
		if(blockHit.getColor() === "life"){

			//Spawn a paddle powerup!
			body2.sprite = game.add.sprite(body2.x, body2.y, 'lifeblock');

			blockHit.markPowerup("life");

		}
		else if(blockHit.getColor() === "paddle"){	//7.5% chance to spawn a life.

			//Spawn an extra life powerup!
			body2.sprite = game.add.sprite(body2.x, body2.y, 'paddleblock');

			blockHit.markPowerup("paddle");

		}
		else{

			body2.sprite = game.add.sprite(body2.x, body2.y, 'ballblock');

			blockHit.markPowerup("ball");

		}

		body2.sprite.visible = true;
		body2.sprite.width = game.blockSize;
		body2.sprite.height = game.blockSize;

		//All powerups have a constant tween.
		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0.25}, 500, Phaser.Easing.Linear.None, true, 0, 10).loop(false));

		//When the tween has completed, remove the block.
		blockHit.getTween().onComplete.add(function(){

			body2.sprite.visible = false;
			blockHit.destroy();

		})
		
	}
	else{	//If not a powerup, create a standard fly-off block.

		//Standard fly-off blocks are kinematic and do not collide.
		body2.kinematic = true;
		body2.clearCollision();

		//Start temporary tween to fade out.
		blockHit.storeTween(game.add.tween(body2.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true));
		//Destroy block when tween is complete.
		blockHit.getTween().onComplete.add(function(){body2.sprite.kill}, this);
	}
	
	//Set block to fly off opposite ball hit point.
	var blockVelocity = new Phaser.Point(ball.body.velocity.x + game.rnd.integerInRange(-100, 100), ball.body.velocity.y + game.rnd.integerInRange(-100, 100));
	var ballVelocity = new Phaser.Point(ball.body.velocity.x, ball.body.velocity.y);
	blockVelocity.setMagnitude(ballVelocity.getMagnitude() * -1);

	//Translate to body corresponding to block.
	body2.velocity.x = blockVelocity.x;
	body2.velocity.y = blockVelocity.y;

	//Give a little random rotation to make it seem more dynamic.
	body2.angularVelocity = game.rnd.frac(-Math.PI, Math.PI);

	//Play a pop sound effect when colliding with a block.
	game.sounds.pop.play();

	//Inform level object that a block has been detroyed.
	game.levels[game.currentLevel].blockHit();

	//Update HUD to new blocks remaining number.
	hud.blocksLeft.text = "Blocks Left: " + game.levels[game.currentLevel].numBlocksLeft();

}


function hitPaddle(body1, body2){

	//Play a sound when paddle is hit.
	game.sounds.pop.play();

}

function collectPowerup(body1, body2){

	//Check to see if this block has already been collected(is still colliding with paddle).
	if(body1.id === game.lastBlockHit){

		//If so, no further action needed.
		return;

	}
	else{

		//Otherwise, this is a new block, remember this new ID.
		game.lastBlockHit = body1.id;

	}

	//Log that powerup has been collected.
	console.log("Powerup Collected!");

	//Retrieve the block that has been collected using its ID.
	var blockHit = game.levels[game.currentLevel].getBlock(body1.id);

	//Remove the block body from all of it's collision groups and remove it's masks.
	body1.clearCollision(true, true);	
	
	//Make sure any blocks that are undefined are not collected, these have usually already been collected.
	if(typeof blockHit === "undefined"){

		return;

	}

	var powerupSuccess = false;

	//Check which type of powerup this block is.
	if(blockHit.getPowerup() === "paddle" && !paddle.secondPaddle.active){

		//Set paddle as active.
		paddle.secondPaddle.active = true;
		paddle.secondPaddle.visible = true;
		paddle.secondPaddle.alpha = 0;

		//Fade paddle in and stay for 10 seconds.
		game.add.tween(paddle.secondPaddle.body.sprite).to({alpha: 1}, 1000, Phaser.Easing.Linear.None, true);
		game.time.events.add(Phaser.Timer.SECOND * 10, removePaddlePowerUp, this);

		powerupSuccess = true;
			
	}
	else if(blockHit.getPowerup() === "life"){

		//Increment player.lives and update hud.
		player.lives++;
		hud.lives.text = "Lives: " + player.lives;

	}
	else if(blockHit.getPowerup() === "ball" && !ball.superBall){

		game.add.tween(ball.scale).to({x: 2, y: 2}, 500, Phaser.Easing.Linear.None, true);
		ball.ballTrail.setScale(2, 0, 1, 0, 2000, Phaser.Easing.Quintic.Out, false);

		game.time.events.add(Phaser.Timer.SECOND * 10, removeBallPowerUp, this);

		ball.superBall = true;

		powerupSuccess = true;

	}
	else if(!powerupSuccess){

		game.sounds.antiPower.play();

	}

	

	blockHit.kinematic = true;

	//Ensure powerup block will not interact anymore.
	blockHit.setDormant();

	//Remove permanent tween from powerup block.
	game.tweens.remove(blockHit.getTween());

	if(powerupSuccess){

			//Play powerup sound as collected.
			game.sounds.power.play();
			//Create temporary tween to make smooth transition out.
			game.add.tween(body1.sprite).to({alpha: 0}, 500, Phaser.Easing.Linear.None, true);
			game.add.tween(body1.sprite.scale).to({x: ball.ballSize * 2, y: ball.ballSize * 2}, 500, Phaser.Easing.Linear.None, true);

	}
	else{

		//Create temporary tween to make smooth transition out.
		game.add.tween(body1.sprite).to({alpha: 0}, 500, Phaser.Easing.Linear.None, true);
		game.add.tween(body1.sprite.scale).to({x: 0, y: 0}, 500, Phaser.Easing.Linear.None, true);


	}
	
	//Deactivate block from level.
	game.levels[game.currentLevel].deactivateBlock(body1.id);

	

}

function removePaddlePowerUp(){

	//Remove the Second Paddle powerup if active.
	if(paddle.secondPaddle.active){
	
		//Set paddle to inactive.
		paddle.secondPaddle.active = false;
		paddle.secondPaddle.alpha = 1;

		//Make paddle fade out.
		game.add.tween(paddle.secondPaddle.body.sprite).to({alpha: 0}, 1000, Phaser.Easing.Linear.None, true);

		game.sounds.antiPower.play();

	}
}

function removeBallPowerUp(){

	//Remove enlarged Ball powerup if active.
	if(ball.scale.x === 2){

		//Put scales back to defaults gradually.
		game.add.tween(ball.scale).to({x: 1, y: 1}, 500, Phaser.Easing.Linear.None, true);
		ball.ballTrail.setScale(1, 0, 1, 0, 2000, Phaser.Easing.Quintic.Out, false);

		ball.superBall = false;

		game.sounds.antiPower.play();

	}


}

function checkBallOutOfBounds(){

	//If the ball is outside the game world and player is not in a menu.
	if(

		outOfBounds(ball)

		&&

		//Ball checking is not valid for end game screen or level finish screens.
		!menus.stages.endGame &&
		!menus.stages.levelFinish

		){

		//Play losing sound.
		lostSound.play();

		//Move to fail menu.
		menus.stages.game = false;
		menus.stages.fail = true;

		//Disable level and enable fail screen.
		game.levels[game.currentLevel].setVisibility(false);
		menus.failScreen.setVisibility(true);

		//If out of player.lives, disable retry button.		
		if(player.lives <= 0){

			menus.failScreen.disableButton("retry");

		}

	}

}

function outOfBounds(sprite){

	if(
			sprite.body.x < 0 ||
			sprite.body.x > game.width ||
			sprite.body.y < 0 ||
			sprite.body.y > game.height 

		){

		return true;

	}

	return false

}

function buttonSelect(button){

	//Play button select sound.
	game.sounds.beep.play();

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
			menus.stages.main = false;
			menus.stages.tutorial = false;
			menus.stages.game = true;

			//Unpause game if it is.
			game.paused = false;

			//Disable main menu.
			menus.mainMenu.setVisibility(false);

			//Enable level and specialised objects.
			//game.levels[game.currentLevel].setVisibility(true, true);
			paddle.visible = true;
			ball.visible = true;


			initCollisions();

			//Resize game so player can see everything.
			resizeGame();


		break;

		case "options":

			//Move to options state.
			menus.stages.main = false;
			menus.stages.options = true;
			menus.stages.game = false;

			//Disable main menu and enable options.
			menus.mainMenu.setVisibility(false);
			menus.optionsMenu.setVisibility(true);

		break;

		case "tutorial":

			//Move to tutorial stage.
			menus.stages.main = false;
			menus.stages.tutorial = true;

			//Setup buffer for text.
			var widthBuffer = game.width * 0.5;
			var heightBuffer = game.height * 0.5;

			//Add text from text file to tutorial menu.
			menus.tutorialScreen.addText(tutorialText, game.width * 0.1, game.height / 2, game.width - (game.width * 0.2), game.height - (game.height * 0.2));

			//Make tutorial menu visible.			
			menus.mainMenu.setVisibility(false);
			menus.tutorialScreen.setVisibility(true);

		break;

		case "togglesound":
			
			toggleMute();

			//Show options menu again.
			menus.optionsMenu.setVisibility(true);


		break;

		case "clearsaves":

			//Clear local save.
			clearSave();

			//Make button grey out to show action has been performed.
			menus.optionsMenu.disableButton("clearsaves");

			//Change button text to confirm with user.
			menus.optionsMenu.changeText("clearsaves", "Deleted");

			//Revert to default level and player.lives.
			game.currentLevel = 0;
			player.lives = 3;

		break;

		case "credits":

			menus.optionsMenu.setVisibility(false);
			menus.creditsScreen.setVisibility(true);

			menus.stages.options = false;
			menus.stages.credits = true;

		break;

		case "back":

			//Credits menu has a special back button.
			if(!menus.stages.credits){

				//Main menu state.
				menus.stages.main = true;
				menus.stages.game = false;
				menus.stages.options = false;

				//Show main menu.
				menus.optionsMenu.setVisibility(false);
				menus.tutorialScreen.setVisibility(false);
				menus.creditsScreen.setVisibility(false);
				menus.mainMenu.setVisibility(true);

			}
			else{

				menus.stages.credits = false;
				menus.stages.options = true;

				menus.creditsScreen.setVisibility(false);
				menus.optionsMenu.setVisibility(true);

			}


		break;

		case "nextlevel":

			//Game state.
			menus.stages.levelFinish = false;
			menus.stages.game = true;

			//Remove between game.levels menu.
			menus.nextLevelMenu.setVisibility(false);

			//Increment level number and setup new level.
			game.currentLevel++;
			game.levels[game.currentLevel].setVisibility(true, true);
			game.levels[game.currentLevel].updatePosition(game.centerPoint, getPaddleRunRadius(), game.levelBuffer, false);

			//Update relevent hud items.
			hud.level.text = game.currentLevel;
			hud.levelName.text = game.levels[game.currentLevel].getName();

			//Reset ball to corner.
			resetBall();

			//Unpause game.
			game.paused = false;

		break;

		case "retry":

			//Game state.
			menus.stages.fail = false;
			menus.stages.game = true;

			//Remove fail screen, bring level back.
			menus.failScreen.setVisibility(false);
			game.levels[game.currentLevel].setVisibility(true, false);
			game.levels[game.currentLevel].updatePosition(game.centerPoint, getPaddleRunRadius(), game.levelBuffer, false);

			//Reset ball again.
			resetBall();

			//Decrement player.lives.
			player.lives--;

			//Update hud text.
			hud.lives.text = "Lives: " + player.lives;

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
	if(game.levels[game.currentLevel].numBlocksLeft() <= 0){

		game.paused = true;
		menus.stages.game = false;

		//If there are no game.levels left, show end game screen, otherwise show level finish menu.
		if(typeof game.levels[game.currentLevel + 1] === "undefined"){

			menus.stages.endGame = true;
			menus.endGameScreen.setVisibility(true);

		}
		else{

			//Save the game so user can continue later.
			saveGame();

			//Level finish state and show between game.levels menu.
			menus.stages.game = false;
			menus.stages.levelFinish = true;
			menus.nextLevelMenu.setVisibility(true);

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


/*	MOVEMENT

*/

function paddleMove(paddleBody, angle){

	
	var x = (Math.sin(angle) * getPaddleRunRadius());

	//Some trigonometry to work out position from angle and know side (radius of circle).
	paddleBody.body.x = (x + (game.width / 2));
	paddleBody.body.y = (x / Math.tan(-angle) + (game.height / 2));

	//Case of divide by zero when angle === 0, so deal with special case.
	if(angle === 0){

		paddleBody.body.x = game.width / 2;
		paddleBody.body.y = (game.height / 2) - getPaddleRunRadius();


	}

	//If using Leap Motion Controller and the Left Hand is visible.
	if(player.controlMethod.leapMotion && typeof player.leftHand != "undefined"){

		//Rotate paddle according to the rotation of the Left Hand mapped to a 180 degree (-PI/2 - PI/2) range.
		paddleBody.body.rotation = player.leftHand.roll().map(-1, 1, -Math.PI / 2, Math.PI / 2);

	}
	else{

		//Rotate paddle so it always faces center.
		paddleBody.body.rotation = angle;

	}

}

function pcControls(angle){
	
	//If using Leap Motion and Left hand is visible just move the paddle, don't rotate here.
	if(player.controlMethod.leapMotion && typeof player.leftHand != "undefined"){

		//Move paddle along circle.
		paddleMove(paddle, angle);


		//Move second paddle to opposite point if active.
		if(paddle.secondPaddle.active){

			paddleMove(paddle.secondPaddle, angle - Math.PI);

		}

	}			
	else{

		//If mouse button is held.
		if( game.input.activePointer.isDown ){
				
				//Rotate paddle to face mouse pointer.
				paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, player.mousePoint) - (Math.PI / 2);
				paddle.secondPaddle.body.rotation = game.physics.arcade.angleBetween(paddle.secondPaddle.position, player.mousePoint) - (Math.PI / 2);

		}
		else{

			//Move paddle along circle.
			paddleMove(paddle, angle);


			//Move second paddle to opposite point if active.
			if(paddle.secondPaddle.active){

				paddleMove(paddle.secondPaddle, angle - Math.PI);

			}

		}

	}

}

function touchControls(angle){

	//Setup finger points.
	var firstPoint = new Phaser.Point(game.input.pointer1.x, game.input.pointer1.y);
	var secondPoint = new Phaser.Point(game.input.pointer2.x, game.input.pointer2.y);

	//if both pointers down, face paddle to points.
	if(game.input.pointer1.isDown && game.input.pointer2.isDown){

		paddle.body.rotation = game.physics.arcade.angleBetween(paddle.position, secondPoint) + (Math.PI / 2);
		paddle.secondPaddle.body.rotation = game.physics.arcade.angleBetween(paddle.secondPaddle.position, player.mousePoint) - (Math.PI / 2);

	}
	else if(game.input.pointer1.isDown && game.input.pointer2.isUp){ //If only one point held.

		//Move paddle along circle nearest to point.
		paddleMove(paddle, angle)

		//Move second paddle to opposite side if active.
		if(paddle.secondPaddle.active){

			paddleMove(paddle.secondPaddle, angle - Math.PI);

		}



	}

}

function resetBall(){

	//Move ball to near corner.
	ball.body.x = (game.width / 2);
	ball.body.y = (game.height * 0.2);

	//Send ball at level.
	ball.body.velocity.x = game.rnd.integerInRange(1, 172);
	ball.body.velocity.y = 100;

}

var adjusted = false;


function setReferenceParameters(){

	//Center of game area.
	game.centerPoint.set(game.width / 2, game.height / 2);

	if(!player.controlMethod.leapMotion){
		
		//Collect mouse co-ordinates into a point.
		player.mousePoint.set(game.input.x, game.input.y);

	}

	//Get angle for incremental paddle movement.
	if(!player.controlMethod.leapMotion){

		//Get the current angle of the mouse.
		var mouseAngle = game.physics.arcade.angleBetween(game.centerPoint, player.mousePoint) + (Math.PI / 2);

		var adjusted = false;

		//Check if both angles are on either side of the zero boundary (Here is is (3 PI / 2) to -(PI / 2)).
		if(mouseAngle < 0 && paddle.lineAngle > Math.PI || paddle.lineAngle < 0 && mouseAngle > Math.PI){

			//Check which angle is in which boundary, offset the one in negative rotation round a full turn to positive rotation.
			if(mouseAngle > paddle.lineAngle){

				paddle.lineAngle += 2 * Math.PI;

			}else{

				mouseAngle += 2 * Math.PI;

			}

			//Set flag so this change can be undone.
			adjusted = true;

		}

		//Get a portion of the difference of angle between the paddle and the mouse.
		var dTheta = (mouseAngle - paddle.lineAngle) / paddle.paddleFollowLag;

		//Check if an offset was required and if that adjustment was to the paddle angle 
		//(no need for mouse angle as it will be re adjusted next time).
		if(adjusted && (mouseAngle > paddle.lineAngle)){

			paddle.lineAngle -= 2 * Math.PI;

		}

		//Add this difference to the paddle angle.
		paddle.lineAngle += dTheta;


	}
	else{

		console.log(player.rightHand);

		if(typeof player.rightHand != "undefined"){

			paddle.lineAngle = player.rightHand.roll().map(-1, 1, 2 * Math.PI, 0);
			console.log(paddle.lineAngle);

		}

	}

}

function updateBallVelocity(){

	var ballVector = new Phaser.Point();
	//Get the balls velocity.
	ballVector.set(ball.body.velocity.x, ball.body.velocity.y);

	//If vector is zero magnitude, offset to prevent error causing ball to stop.
	if(ballVector.getMagnitude() === 0){

		ballVector.set(0.01, 0.01);


	}

	//If the balls speed is less than specified value.
	if(ballVector.getMagnitude() < ball.ballSpeed || ballVector.getMagnitude() === 0){

		ball.body.damping = 0;

		//Accelerate ball.
		ballVector.setMagnitude(ballVector.getMagnitude() + 1);

		//Update ball velocity.
		ball.body.velocity.x = ballVector.x;
		ball.body.velocity.y = ballVector.y;

	}

	//If the bal is going too fast, make it decelerate slowly.
	if(ballVector.getMagnitude() > ball.ballSpeed){

		ball.body.damping = 0.1;

	}

}

function ballWander(radius){

	//Ball mustn't hit anything.
	ball.kinematic = true;

	//Radii of both circles ('a' is outer), ('b' is inner).
	var a = radius || getPaddleRunRadius();
	var b = a / 20;

	//Phase each circle a and b.
	var wa = Math.PI * 2 * (game.time.now / 20000);
	var wb = wa / 2;


	ball.body.x = (a - b) * Math.cos(wa) + 100 * Math.cos(((a - b) / b) * wb) + game.width / 2;
	ball.body.y = (a - b) * Math.sin(wa) - 100 * Math.sin(((a - b) / b) * wb) + game.height / 2;
	
	//Set ball wandering to true.		
	ball.wandering = true;

}

function ballFollow(target, speed){
	
	//Soft follow based on angle to target.
	var angle = Math.atan2(target.y - ball.body.y, target.x - ball.body.x);

	//Edit velocity based on angle to follow target.
	ball.body.velocity.x = Math.cos(angle) * speed;
	ball.body.velocity.y = Math.sin(angle) * speed;

}



/*	Block

	A square sprite with static collider physics placed at a position and may be moved.
	When moved it can also behave as a powerup with dynamic physics and tween storage.

*/

var Block = (
	
	function(){

		//Constructor, Specify starting color.
		function Block(color){

			//Position parameters.
			this.x = 0;
			this.y = 0;

			//Store the width of the block.
			this.width = 0;
			this.height = 0;

			//Color of the block (used to choose sprite).
			this.color = color.toLowerCase();

			//Choose the sprite for this block.
			this.sprite = game.add.sprite(this.x, this.y, this.color.concat("block"));
			//All blocks start invisible until called onto screen from level.
			this.sprite.visible = false;

			//Adjust sprite width to default size.
			this.sprite.width = game.blockSize;
			this.sprite.height = game.blockSize;

			//Set width of block to sprite width.
			this.width = this.sprite.width;
			this.height = this.sprite.height;

			//Whether the block has an absolute position or not.
			this.absolute = false;

			//Whether block is alive and whether it is a powerup.
			this.blockAlive = true;

			//If block is a ball powerup, it has an animation as well as being a powerup.
			if(this.color === "ball"){
				
				//This block has an animation.
				this.animation = this.sprite.animations.add('glisten');
				this.animation.onLoop.add(this.stopAnimation, this);

				//Schedule a glisten event in future.
				game.time.events.add(Phaser.Timer.SECOND * game.rnd.integerInRange(5, 10), this.playAnimation, this);

			}

			//Powerup "Colors".
			if(color === "life" || color === "paddle" || color === "ball"){
				
				//Block is a powerup.
				this.powerup = true;

			}
			else{

				//Normal block.
				this.powerup = false;

			}

			//Initialise block physics and assign a body.
			initBlockPhysics(this.sprite);

		}


		//Private function to define block static physics.
		var initBlockPhysics = function(sprite){

			//Enable physics on block sprite.
			game.physics.p2.enable(sprite);

			//Allow sleeping body.
			sprite.body.allowSleep = true;
				
			//Setup body to correcr size, blocks are static.
			sprite.body.setRectangle(sprite.width, sprite.height, 0, 0, 0);
			sprite.body.x = this.x;
			sprite.body.y = this.y;
			sprite.body.static = true;

			//Set body type to P2.
			sprite.physicsBodyType = Phaser.Physics.P2JS;

			//Add body to block collision group and allow collisions with appropriate groups.
			sprite.body.setCollisionGroup(game.collisionGroups.blockCollisionGroup);
			sprite.body.collides(game.collisionGroups.ballCollisionGroup);
			sprite.body.collides(game.collisionGroups.paddleCollisionGroup, collectPowerup, this);



		};

		Block.prototype.playAnimation = function(){

			this.animation.play(24, true, false);

		}

		Block.prototype.stopAnimation = function(){

			this.animation.stop();
			
			//Schedule a glisten event in future.
			game.time.events.add(Phaser.Timer.SECOND * game.rnd.integerInRange(5, 10), this.playAnimation, this);


		}


		//Set the block at a position.
		Block.prototype.setPos = function(x, y){

		//Adjust block absolute position.
		this.x = x;
		this.y = y;

		//Change body position accordingly.
		this.sprite.body.x = x;
		this.sprite.body.y = y;
		
		};

		//Make the block sleep without destroying it.
		Block.prototype.setDormant = function(){

			//Block is not alive whilst dormant and body is sleeping.
			this.blockAlive = false;
			this.sprite.body.sleepMode = p2.World.BODY_SLEEPING;

		}

		//Returns this blocks position. 
		Block.prototype.getPos = function(){

			return {x: this.x, y: this.y};

		};

		//Return the body of this block.
		Block.prototype.getBody = function(){

			//Return this block's body.
			return this.sprite.body;

		};

		//Make this block dissapear.
		Block.prototype.destroy = function(){

			//Block has been destroyed, set as invisible and not alive.
			this.sprite.visible = false;
			this.blockAlive = false;

			//Remove body to avoid physical interactions.
			this.sprite.body.removeFromWorld();
			this.sprite.body.sleepMode = p2.World.BODY_SLEEPING;

		};

		Block.prototype.explode = function(){

			this.emitter = game.add.emitter(this.x, this.y, 100);
			this.emitter.makeParticles('spark');
			this.emitter.gravity = 0;

			this.emitter.start(true, 4000, null, 10);

			game.add.tween(this.emitter).to({ alpha:0 }, 3000, "Linear", true);
		
		}



		Block.prototype.hide = function(){

			//Block is hidden, stop physical interaction temporarily.
			this.sprite.visible = false;
			this.sprite.body.removeFromWorld();

		}

		//Make this block appear.
		Block.prototype.show = function(){

			//Set sprite to visible and alive.
			this.sprite.visible = true;
			this.sprite.alpha = 0.1;
			

			this.sprite.alive = true;
			game.add.tween(this.sprite).to({ alpha: 1 }, 1000, "Linear", true);

			//Block is also alive and add body back to world.
			this.blockAlive = true;
			this.sprite.body.addToWorld();

		};


		Block.prototype.makeAbsolute = function(abs){

			//Change absolute state.
			this.absolute = abs;

		};

		Block.prototype.isAbsolute = function(){

			//Return whether the block is absolute.
			return this.absolute;

		}

		Block.prototype.isAlive = function(){

			//Return whether the block is alive.
			return this.blockAlive;

		}

		Block.prototype.storeTween = function(tween){

			//Store a single tween for this block.
			this.tween = tween;

		}

		Block.prototype.getTween = function(){

			//Return this block's current tween.
			return this.tween;

		}

		Block.prototype.getColor = function(){

			return this.color;

		}

		Block.prototype.markPowerup = function(type){

			//Mark this block with a powerup type and as a powerup.
			this.powerupType = type;
			this.powerup = true;

		}

		Block.prototype.getPowerup = function(){

			//Return the type of powerup this block is.
			return this.powerupType;

		}

		Block.prototype.isPowerup = function(){

			//Return whether this block is a powerup or not.
			return this.powerup;

		}

		return Block;


	}()

);


/*	Blockline

	Defines a container object able to encompass many Blocks, 
	makes for easier defining of many Blocks.

*/

function BlockLine(startPos, direction, numOfBlocks, color){

	this.numOfBlocks = numOfBlocks;
	this.startPos=  startPos;

	//Offset start position by block size as this is a cartesian coordinate.
	this.startPos.x *= game.blockSize;
	this.startPos.y *= game.blockSize;

	var differX = false;
	

	if(direction.toLowerCase().indexOf("x") >= 0){

		differX = true;

	}

	//Negative direction specified, correct.
	if(this.numOfBlocks < 0){

		console.log("BlockLine error: Negative number of blocks specified.");

	}

	this.blocks = [];

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


/*	Level

	An object containing many Blocks, this also contains a co-ordinate system, 
	keeps blocks alligned to a grid accoring to their size it also removes blocks 
	outside of the applicable Level space.

*/

var Level = (

	function(){

		function Level(name){

			//Array to store blocks.
			this.blocks = [];
			
			//Array to store block's positions.
			this.blockPositions = [];

			//Level name.
			this.name = name;

			//Top left corner of level for local coordinate system.
			this.zeroPos = {x: 0, y: 0};

			//SIze of the level in pixels.
			this.size = 0;

			//Track how many blocks are left in this level.
			this.blocksLeft = 0;

			//Whether this level is alive or not.
			this.alive = true;

		}

		Level.prototype.getName = function(){

			//Return the name of this level.
			return this.name;

		}

		Level.prototype.getSize = function(){

			return this.size;

		}

		//Updates the origin co-ordinate of the Level space.
		Level.prototype.updatePosition = function(center, radius, buffer, checkOutOfBounds){

			//Work out length of the side of the level (square so same in x & y).
			var sideLength = (Math.sin(Math.PI / 4) * (radius * 2)) - buffer;

			console.log(sideLength);

			//Work out zero position from centre of screen so level is centered.
			this.zeroPos.x = center.x - (sideLength / 2);
			this.zeroPos.y = center.y - (sideLength / 2);

			//Store level size.
			this.size = sideLength;

			//Adjust blocks positions to local coordinates if there are blocks left.
			if(this.blocks.length > 0){

				blocksToBounds(this.blocks, this.blockPositions, this.zeroPos, this.size, checkOutOfBounds);

			}

		};

		//Add blocks to the Level container. Also is able to dissassemble BlockLines into Blocks.
		Level.prototype.addBlocks = function(blockObj){

			//Import a block.
			if(blockObj instanceof Block){

				//Add block to array.
				this.blocks.push(blockObj);

				//Check if the block is absolute.
				if(!blockObj.isAbsolute()){

					//Push block onto coordinate system.
					this.blockPositions.push({ x: blockObj.getPos().x * game.blockSize, y: blockObj.getPos().y * game.blockSize });

				}
				else{

					//Push block with absolute offset.
					this.blockPositions.push({x: blockObj.getPos().x, y: blockObj.getPos().y});

				}

				//Add one to num of blocks left.
				this.blocksLeft++;

			}
			else if(blockObj instanceof BlockLine){		//Import a blockline.

				//Iterate individual blockline blocks.
				for(var i = 0; i < blockObj.getLength(); i++){

					//Create a block.
					var block = blockObj.getBlock(i);

					//Add block to array.
					this.blocks.push(block);

					//Push absolute position as blockline is always non absolute.
					this.blockPositions.push({x: block.getPos().x, y: block.getPos().y});

					//Add to blocks left to track.
					this.blocksLeft++;

				}


			}



		};

		Level.prototype.numBlocksLeft = function(){

			var numBlocksLeft = 0;

			for(var i = 0; i < this.blocks.length; i++){

				if(this.blocks[i].isAlive()){

					numBlocksLeft++;

				}

			}

			//Return the number of blocks left in the level.
			return numBlocksLeft;

		};

		Level.prototype.blockHit = function(){

			//Reduce number of blocks left as a block has been hit.
			this.blocksLeft--;

		}

		Level.prototype.getBlock = function(id){

			//Get a specific block via it's body id.
			for(var i = 0; i < this.blocks.length; i++){

				//Check id matches a block body.
				if(this.blocks[i].getBody().id === id){

					//Return the matched block and stop iterating.
					return this.blocks[i];

				}

			}

		}

		Level.prototype.deactivateBlock = function(id){

			//Variable to deactivate all blocks.
			var allBlocks = false;

			//Check if id says all blocks.
			if(id === "all"){

				//If so, set all blocks to true.
				id = null;
				allBlocks = true;

			}

			//Iterate blocks array.
			for(var i = 0; i < this.blocks.length; i++){

				//Check if all blocks are to be hidden or a specific id matches.
				if(allBlocks === true || this.blocks[i].getBody().id === id){

					//Set matching block(s) to dormant state.
					this.blocks[i].setDormant();

				}

			}

		}

		Level.prototype.setVisibility = function(visibility, force){

			//Iterate through all blocks.
			for(var i = 0; i < this.blocks.length; i++){

				//If level is visible and this block is alive or blocks are forced to be visible.
				if(visibility && (this.blocks[i].isAlive() || force)){

					//Show matching block.
					this.blocks[i].show();

				}
				else{

					//Otherwise block should be hidden.
					this.blocks[i].hide();

				}

			}

		}

		Level.prototype.checkBlocksInWorld = function(){

			//Iterate throught blocks array.
			for(var i = 0; i < this.blocks.length; i++){

				//Check if block is outside of level.
				if(
					this.blocks[i].getPos().x < 0 ||
					this.blocks[i].getPos().x > game.world.width ||
					this.blocks[i].getPos().y < 0 ||
					this.blocks[i].getPos().y > game.world.height
					)

					//Set to dormant state if so.
					this.blocks[i].setDormant();

			}

		}

		//Brings all blocks to the Level bounds space.
		var blocksToBounds = function(blocks, blockPositions, zeroPos, size, checkOutOfBounds){

			//Iterate through all blocks.
			for(var i = 0; i < blocks.length; i++){

				//Check if a block is alive.
				if(blocks[i].isAlive()){

					//If so, move to appropriate block position in local coord system.
					blocks[i].setPos(zeroPos.x + blockPositions[i].x, zeroPos.y + blockPositions[i].y);

				}

			}

			//If checking out of bounds blocks.
			if(checkOutOfBounds){

				checkBlocks(blocks, zeroPos, size);

			}

		};

		//Check if the Block at the passed index is out of bounds (Level Space).
		var outOfBounds = function(index, blocks, zeroPos, size){

			//Check if block position is outside of local bounds.
			if(

				(blocks[index].getPos().x > (zeroPos.x + size + game.blockSize)) || 
				(blocks[index].getPos().y > (zeroPos.y + size + game.blockSize))

				){

				//If so, return true.
				return true;

			}

			//If not, return false.
			return false;


		};

		//Check for all out of bounds blocks.
		var checkBlocks = function(blocks, zeroPos, size){

			//Iterate through all blocks.
			for(var i = 0; (i < blocks.length); i++){

				//Check if this block id out of bounds and alive.
				if(outOfBounds(i, blocks, zeroPos, size) && blocks[i].isAlive()){

					//If so, destroy the block.
					blocks[i].destroy();

				}
				else if(blocks[i].isAlive()){

					//If not and block is alive, show the block.
					blocks[i].show();


				}

			}

		};


		return Level;


	}()

);

/*	
	
	Defines a container for a single button and a single 
	text string. Automatically confines the text to the button 
	and changes the sprite if the button is deactivated.

*/

function Button(x, y, xSize, ySize, name){

	//Set position of this button.
	this.x = x;
	this.y = y;
	
	//Add a button object.
	this.button = game.add.button(x, y, 'button', buttonSelect, this, 2, 1, 0);
	this.button.anchor.setTo(0.5, 0.5);
	this.button.scale.setTo(2, 2);

	//Set the name of this button.
	this.button.name = name;

	//button should be visible.
	this.isVisible = true;

}

//Add text to the button so user knows it's function.
Button.prototype.addText = function(text){

	this.text = game.add.text(this.x, this.y, text, { font: "30px Bauhaus 93", fill: "#4fa" } );
	this.text.anchor.setTo(0.5, 0.5);

}

//Remove button temporarily.
Button.prototype.remove = function(){

	this.button.visible = false;
	this.text.visible = false;

}

Button.prototype.getName = function(){

	//Return the name of this button.
	return this.button.name;

}

Button.prototype.setVisibility = function(visibility){

	//Make the button and the associated text invisible.
	this.button.visible = visibility;
	this.text.visible 	= visibility;

}

Button.prototype.deactivate = function(){

	//Disable button for input and load a new sprite so the user knows the button is inactive.
	this.button.inputEnabled = false;
	this.button.loadTexture('disabledbutton', 0, false);	

}

Button.prototype.setPos = function(x, y){

	//Set the position of the button accounting for the offset.
	this.button.x = x - 100;
	this.button.y = y;

	this.text.x = x - 100;
	this.text.y = y;

}

Button.prototype.setText = function(newText){

	//Set the text of the button using a new string (the button sets the text to a default format).
	this.text.setText(newText);
}

Button.prototype.getText = function(){

	//Return the text that is associated with this button.
	return this.text;

}




/*	Menu

	Defines a container for a title and an unlimited number
 	of buttons and text. Also adds text to buttons via the Button Class.

*/

function Menu(title){

	//Set the title string to appear at the top of the menu screen, anchor the title in its relative centre.
	this.title = game.add.text(game.width / 2, 	game.height / 3, title, { font: "50px Bauhaus 93", fill: "#4fc" } );
	this.title.anchor.setTo(0.5, 0.5);

	//Arrays for storing buttons and text strings.
	this.buttons = [];
	this.texts = [];

}

Menu.prototype.moveTitle = function(x, y){

	this.title.x = x;
	this.title.y = y;

}

Menu.prototype.moveButton = function(x, y, buttonNum){

	buttonNum = buttonNum || 0;

	this.buttons[buttonNum].setPos(x, y);

}

Menu.prototype.addButton = function(x, y, text, id){

	//Create a new button based on the parameters passed, also add text to the button.
	var newButton = new Button(x, y, 200, 64, id);
	newButton.addText(text);

	//Add this button onto the array.
	this.buttons.push(newButton);

}

Menu.prototype.disableButton = function(name){

	//Iterate through all buttons.
	for(var i = 0; i < this.buttons.length; i++){

		//Match the button using its name.
		if(this.buttons[i].button.name === name){

			//Deactivate any matched buttons.
			this.buttons[i].deactivate();

		}

	}

}

Menu.prototype.setVisibility = function(visibility){

	//Set the titles visibililty.
	this.title.visible = visibility;

	//Set all buttons to the passed visibility.
	for(var i = 0; i < this.buttons.length; i++){


		this.buttons[i].setVisibility(visibility);

	}

	//Set text strings visibility also.
	for(var i = 0; i < this.texts.length; i++){

		this.texts[i].visible = visibility;

	}

}

Menu.prototype.addText = function(text, x, y, dx, dy){

	//Create a new text string and set its bounds according to parameters.
	var newText = game.add.text(0, 0, text, { font: "16px Courier New", fill: "#fff", align: "center", boundsAlignH: "center", boundsAlignV: "center"});
	newText.setTextBounds(x, y, dx, dy);

	//Add this text to the array.
	this.texts.push(newText);

}

Menu.prototype.changeText = function(buttonName, newText){

	//Iterate through all buttons.
	for(var i = 0; i < this.buttons.length; i++){

		//Match the button via its name.
		if(this.buttons[i].getName() === buttonName){

			//Replace the text string on the button with a new text string.
			this.buttons[i].setText(newText);

		}

	}

}

