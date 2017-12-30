
var loadingText;

playState = {



	fileComplete: function(){

		loadingText.text = game.load.progress + "%...";

	},

	//Function for Preloading all asset files.
	preload: function(){

		loadingText = game.add.text(game.width / 2, game.height * 0.75, "0%...", { font: "30px Bauhaus 93", fill: "#fff"}),

		
		preloadBar = game.add.sprite(game.world.centerX, game.world.centerY, 'loadingbar');
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
		game.load.audio('lost', 'assets/sound/lost.mp3');

		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.pageAlignHorizontally = true;
		game.scale.pageAlignVertically = true;

	}, 

	//Function encapsulating all creation of game objects, physics and initialisation.
	create: function(){

		leapTouch = new Phaser.Signal();

		//play ambient music, adjust volumes accordingly.
		ambience.play();
		bgMusic.volume = 0.1;
		lostSound.volume = 0.25;

		//Paddle circle radius is a quarter of the screen, block size is proportional.
		if($(window).width > $(window).height){

			paddleRunRadius = $(window).width() / 3;

		}
		else{

			paddleRunRadius = $(window).height() / 3;

		}
		//blockSize = ((Math.sin(Math.PI / 4) * (paddleRunRadius * 2)) - levelBuffer) / 12;



		//Create all specialized in game objects.
		createObj();

		//Start up P2 Physics/
		initPhysics();

		//Add extra pointer for mobile users to use double touch.
		if(controlMethod.mobile){

			game.input.addPointer();

		}

		game.input.useCrosshair = true;

		//Add mouse events to game on mouse up.
		game.input.onUp.add(function(pointer){ mouseUpEvents(pointer, null); }, this);

		
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

		//Allow multiple powerup sounds in case multiple collected in quick succession.
		sounds.power.allowMultiple = true;


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

		//Reset ball so it starts in correct position.
		resetBall();

		ball.wandering = true;

		//Update HUD to new blocks remaining number.
		//hud.blocksLeft.text = levels[currentLevel].numBlocksLeft();
		

	},

	update: function(){

		ballTrail.x = ball.x;
		ballTrail.y = ball.y;

		//Change function of update based on games current stage.
		if(menuStages.main || menuStages.options || menuStages.tutorial){

			bgMusic.pause();
			
			ballWander();

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
		else if(menuStages.credits){

			//Show credits screen.
			creditsScreen.setVisibility(true);
			creditsScreen.addText(creditText, 10, game.height * 0.2, game.width * 0.7, game.height * 0.9);

		}
		else if(menuStages.levelFinish){


			if(!ball.wondering){

				//Make ball wander around screen.
				ballFollow({x: game.width / 2, y: game.height * 0.2}, 200);

			}
			if(ball.body.y < game.height * 0.25){

				ball.wandering = false;
				ballWander(50);

			}

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
			if(ball.wandering){

				var target = new Phaser.Point(game.width / 2, game.height * 0.2);

				//Make ball reset slowly to starting position.
				ballFollow(target, 200);
				
				//Check if ball is in position.
				if(ball.position.distance(target) < 5){
				
					ball.wandering = false;
					resetBall();
					levels[currentLevel].setVisibility(true, true);
				
				}

				//Make paddle move around manually for effect.

				lineAngle = Math.sin(2 * Math.PI * (game.time.now / 5000)) + (Math.PI / 2);

			}
			else{
				
				//Ensure ball travels at correct speed and slowly speeds up in the beginning.
				updateBallVelocity();

				//Update necessary references in space for game function (e.g. center point).
				setReferenceParameters();

				//Check for the current levels completion.
				checkLevelCompletion();
				
				//Check if the ball goes out of bounds for failure condition.
				checkBallOutOfBounds();

			}

			//Update HUD on every frame.
			hud.levelName.text = levels[currentLevel].getName();
			hud.level.text = currentLevel;

			

			

			//Ensure game is not paused!
			game.paused = false;
			
			//Choose control function based on running OS type.
			if(controlMethod.mobile){

				touchControls(lineAngle);

			}
			else{

				pcControls(lineAngle);

			}

			

			

		}

	}


};