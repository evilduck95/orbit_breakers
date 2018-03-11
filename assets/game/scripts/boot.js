

bootState = {

	preload: function(){
		
		game.load.image('loadingbar', 'assets/visual/loading_bar.png');

	},


	create: function(){

		game.state.start('play');


	}

};