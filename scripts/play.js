
var loadingText;

playState = {



	fileComplete: function(){

		loadingText.text = game.load.progress + "%...";

	},

	//Function for Preloading all asset files.
	preload: function(){

		loadingText = game.add.text(game.width / 2, game.height * 0.75, "0%...", { font: "30px Bauhaus 93", fill: "#fff"}),

		
		preloadBar = game.add.sprite(game.width / 2, game.height / 2, 'loadingbar');
		preloadBar.anchor.setTo(0.5, 0.5);

		game.load.setPreloadSprite(preloadBar);

		game.load.onFileComplete.add(this.fileComplete, this);

		controllerSetup();

		/*
			Load in all visual assets.
		*/


		//Player paddle and ball.
		

		
		//Background.
		game.load.image('background', 'assets/visual/background.png');

		//Player paddle and ball.
		game.load.image('paddle', 'assets/visual/paddle(sprite).png');
		game.load.image('ball', 'assets/visual/ball.png');

		//Blocks for targets and power ups.
		game.load.image('orangeblock', 'assets/visual/block(orange).png');
		game.load.image('redblock', 'assets/visual/block(red).png');
		game.load.image('greenblock', 'assets/visual/block(green).png');
		game.load.image('blueblock', 'assets/visual/block(blue).png');
		game.load.image('yellowblock', 'assets/visual/block(yellow).png');

		//Powerup block sprites.
		game.load.image('lifeblock', 'assets/visual/block(life).png');
		game.load.image('paddleblock', 'assets/visual/block(paddle).png');
		//This powerup has a spritesheet.
		game.load.spritesheet('ballblock', 'assets/visual/block(ball).png', 30, 30, 16);

		//Spite used for exploding blocks.
		game.load.image('spark', 'assets/visual/spark.png');

		//Buttons.
		game.load.image('button', 'assets/visual/button.png');
		game.load.image('disabledbutton', 'assets/visual/button(inactive).png');

		//Muted speaker icon indicating whether game is muted.
		game.load.image('mutedSpeaker', 'assets/visual/speakeroff.png');

		
		//Audio for physics.
		game.load.audio('pop', 'assets/sound/pop.mp3');
		game.load.audio('beep', 'assets/sound/beep.mp3');
		game.load.audio('powerup', 'assets/sound/pwrup.mp3');
		game.load.audio('powerdown', 'assets/sound/pwrdn.mp3');
		game.load.audio('lost', 'assets/sound/lost.mp3');

		game.load.text('credit', 'data/credits.txt');


		
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.pageAlignHorizontally = true;
		game.scale.pageAlignVertically = true;

		game.scale.setGameSize(1280, 720);

	},

	//Function encapsulating all creation of game objects, physics and initialisation.
	create: function(){

		console.log("Begin, ", game.cache.getText('credit'));

		leapTouch = new Phaser.Signal();

		//play ambient music, adjust volumes accordingly.
		ambience.play();
		bgMusic.volume = 0.1;
		lostSound.volume = 0.25;

		
		//Create all specialized in game objects.
		createObj();

		//Start up P2 Physics/
		initPhysics();

		//Add extra pointer for mobile users to use double touch.
		if(player.controlMethod.mobile){

			game.input.addPointer();

		}

		game.input.useCrosshair = true;

		//Add mouse events to game on mouse up.
		game.input.onUp.add(function(pointer){ mouseUpEvents(pointer, null); }, this);

		
		//Initial Resize.
		resizeGame($(window).width, $(window).width, game.centerPoint, game.currentLevel);

		//Create all menus and add to game.
		createMenus();

		
		//Group game.sounds under a single object.
		game.sounds = {

			pop: game.add.audio('pop'),
			beep: game.add.audio('beep'), 
			power: game.add.audio('powerup'),
			antiPower: game.add.audio('powerdown'),
			lost: game.add.audio('lost')

		};

		//Allow multiple powerup game.sounds in case multiple collected in quick succession.
		game.sounds.power.allowMultiple = true;


		//Add muted speaker to game but don't show yet.
		mutedSpeaker = game.add.sprite(100, 100, 'mutedSpeaker');
		mutedSpeaker.visible = false;

		//Read in Xml values and build game.levels.
		initXMLLevels(0);

		//Create all needed text that isn't inside buttons.
		createText();


		//Make everything dissapear until the game starts.
		paddle.visible = false;
		ball.visible = false;

		game.sound.mute = false;

		loadGame();

		//If the loaded level is not a number, that indicates there is no save, revert to defaults.
		if(isNaN(game.currentLevel)){

			game.currentLevel = 0;

		}

		if(isNaN(player.lives)){

			player.lives = 3;

		}

		//Reset ball so it starts in correct position.
		resetBall();

		ball.wandering = true;

		if(loadVolume() === 0){

			game.sound.mute = true;
			muteAll();

		}

		paddle.lineAngle = 0;

		//Make some small modifications to the credits and end game screens.
		menus.creditsScreen.addText(game.cache.getText('credit'), (game.width * 0.1) + 0.5, (game.height * 0.1) + 0.5, game.width, game.height);
		//Move the title to the left side.
		menus.creditsScreen.moveTitle(game.width * 0.2, game.height * 0.2);
		//Move the button up and to the left.
		menus.creditsScreen.moveButton(game.width * 0.2, game.height / 2);
		//Set invisible until needed.
		menus.creditsScreen.setVisibility(false);
		
		//Make the same modifications to the end game screen.
		menus.endGameScreen.addText(game.cache.getText('credit'), (game.width * 0.1) + 0.5, (game.height * 0.1) + 0.5, game.width, game.height);
		//Move the title to the left.
		menus.endGameScreen.moveTitle(game.width * 0.2, game.height * 0.2);
		//Move the button up and to the left.
		menus.endGameScreen.moveButton(game.width * 0.2, game.height / 2);
		//Set invisible until game ends.
		menus.endGameScreen.setVisibility(false);

	},

	update: function(){

		ball.ballTrail.x = ball.x;
		ball.ballTrail.y = ball.y;

		//Change function of update based on games current stage.
		if(menus.stages.main || menus.stages.options || menus.stages.tutorial){

			bgMusic.pause();
			
			ballWander();

			//Have game.levels ready but not visible as soon as they have been loaded from their file.
			if(typeof game.levels[game.currentLevel] !== "undefined"){

				game.levels[game.currentLevel].setVisibility(false);
				

			}

		}
		else if(menus.stages.endGame){

			//Show end screen and add credits to menu.
			menus.endGameScreen.setVisibility(true);
			console.log("text", creditText);
			menus.endGameScreen.addText(game.cache.getText('credit'), (game.width * 0.2) + 0.5, (game.height * 0.4) + 0.5, game.width * 0.7, game.height * 0.9);

		}
		else if(menus.stages.credits){

			//Show credits screen.
			menus.creditsScreen.setVisibility(true);

		}
		else if(menus.stages.levelFinish){

			ballWander((Math.sin(game.time.now / 200) * 50) + 20);

		}
		else if(menus.stages.fail){

			//Game failed, disable current level and pause game.
			game.paused = true;
			game.levels[game.currentLevel].setVisibility(false);


			//If no player.lives are left, player may not retry.
			if(player.lives === 0){

				menus.failScreen.title.text += "\nAnd You're Out of lives!";
				menus.failScreen.disableButton("retry");

				
			}

		}
		else if(menus.stages.game){

			if(!game.sound.mute){
				
				bgMusic.play();

			}
			if(ball.wandering){

				let target = new Phaser.Point(game.width / 2, game.height / 2 - (getPaddleRunRadius() * 2 / 3));

				//Make ball reset slowly to starting position.
				ballFollow(target, 200);
				
				//Check if ball is in position.
				if(ball.position.distance(target) < 5){
				
					ball.wandering = false;
					resetBall();
					game.levels[game.currentLevel].setVisibility(true, true);
				
				}

				let x = game.time.now / 5000;

				//Make paddle move with exponential decay on velocity.
				paddle.lineAngle = Math.sin(1 / Math.pow(x, 2)) * Math.PI * 2;

			}
			else{
				
				//Ensure ball travels at correct speed and slowly speeds up in the beginning.
				updateBallVelocity();

				//Update necessary references in space for game function (e.g. center point).
				setReferenceParameters();

				//Check for the current game.levels completion.
				checkLevelCompletion();
				
				//Check if the ball goes out of bounds for failure condition.
				checkBallOutOfBounds();

				game.input.mousePointer.timer = 0;

				if(game.input.mousePointer.msSinceLastClick > (20000 + game.input.mousePointer.timer)){

					game.input.mousePointer.timer += game.input.mousePointer.msSinceLastClick;

					flashText("Click to Rotate Paddle");

				}

			}

			//Update HUD on every frame.
			hud.levelName.text = game.levels[game.currentLevel].getName();
			hud.level.text = "Level: " + game.currentLevel;

			//Ensure game is not paused!
			game.paused = false;
			
			//Choose control function based on running OS type.
			if(player.controlMethod.mobile){

				touchControls(paddle.lineAngle);

			}
			else{

				pcControls(paddle.lineAngle);

			}
		}
	}
};