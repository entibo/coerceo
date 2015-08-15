// JavaScript Document

var hexGrid = [ [0, 0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 1, 1, 2, 1, 1, 1, 2, 1, 1, 0, 0, 0],
				[1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1],
				[2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
				[1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
				[1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1],
				[2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
				[1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1],
				[0, 0, 0, 1, 1, 2, 1, 1, 1, 2, 1, 1, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 0, 0, 0, 0] ];
		    		    		    
var ctx, cW, cH;
var gameBoard;
var player1, player2;
var players = [player1, player2];
var whosTurn;

var sinsixty = Math.sqrt(3)/2;
var triangleUp = [ 0,1 , 0.5,0, 1,1 ];
var triangleDown = [ 0,0, 0.5,1, 1,0 ];
var adjacentMoves;
var adjacentOpponents;
var adjacentAll;

var WIDTH = window.innerHeight;
var HEIGHT = window.innerHeight;

var scene, camera, renderer;
var centerPiece;
var boardTexture;

function Player(color) {
	this.color = color;
	this.nbPieces;
	this.nbHexagons;
	this.selectedPiece;
	this.type;
	this.index;
}

function Board() {

	this.nTilesX;
	this.nTilesY;

	this.width;
	this.tileW;
	this.tileH;
	this.height;
	
	this.xOffset;
	this.yOffset;
	
	this.tileGrid;
	this.hexagonGrid;
	
	this.aiPlay = function(player) {
	
		var otherPlayer = players[1-player.index];
		var potentialPieces = [];
		var randomMoves = [];

		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				var curTile = this.tileGrid[i][j];
				if(curTile && curTile.hasPiece && curTile.color == player.color) { // fixed
					potentialPieces.push(new Pos(curTile.x, curTile.y));
				}
			}
		}
		
		potentialPieces = shuffle(potentialPieces);
		
		for(i=0; i < adjacentMoves.length; i++) randomMoves[i] = adjacentMoves[i];
		randomMoves = shuffle(randomMoves);
		
		var breakLoop = false;
		for(i=0; i < potentialPieces.length; i++) {
			for(j=0; j < randomMoves.length; j++) {
				var curTile = this.tileGrid[potentialPieces[i].y+randomMoves[j].y][potentialPieces[i].x+randomMoves[j].x];
				if(curTile && !curTile.hasPiece) {
					var selectedTile = this.tileGrid[potentialPieces[i].y][ potentialPieces[i].x];
					this.movePiece(player, selectedTile, curTile);
					
					breakLoop = true;
					break;
				}
				if(breakLoop) break;
			}
			if(breakLoop) break;
		}

		turnOver();
	}
		
	this.tileClick = function(player, pos) {
		var curTile = this.tileGrid[pos.y][pos.x];
		var otherPlayer = players[1-player.index];
		if(curTile && whosTurn == player) {
			if(curTile.hasPiece) { // the clicked tile has a piece on it
				if(player.selectedPiece && curTile.x == player.selectedPiece.x && curTile.y == player.selectedPiece.y) {
					player.selectedPiece = null;
				}
				else if(curTile.color == player.color) {
					player.selectedPiece = pos;
				}
				else if(!player.selectedPiece){ // click on the other player's piece
					if(player.nbHexagons >= 2) {
						this.removePiece(curTile);
						player.nbHexagons -= 2;
						player.selectedPiece = null;
						
						turnOver();
					}
				}			
			}
			else { // empty tile
				if(!curTile.hasPiece && player.selectedPiece 
					&& (Math.abs(curTile.x - player.selectedPiece.x) + Math.abs(curTile.y - player.selectedPiece.y)) == 2) {
					
					var selectedTile = this.tileGrid[player.selectedPiece.y][player.selectedPiece.x];
					this.movePiece(player, selectedTile, curTile);
					
					turnOver();
				}
			}
		}
	}
	
	this.movePiece = function(player, source, dest) {
		source.hasPiece = false;
		source.mesh.visible = false;
		
		dest.hasPiece = true;
		dest.mesh.visible = true;
		
		curAnimations.push(createMeshAnimation(source, dest));
		
		player.selectedPiece = null;
		
		if(dest.hexagonIndex != source.hexagonIndex) {
			this.hexagonGrid[source.hexagonIndex].count--;
			this.hexagonGrid[dest.hexagonIndex].count++;
			if(this.hexagonGrid[source.hexagonIndex].count == 0 && this.hexagonGrid[source.hexagonIndex].canBeRemoved()) {
				this.removeHexagon(source.hexagonIndex);
				player.nbHexagons++;
			}
		}
		
		var adj = dest.getAdjacentOpponents();
		for(var i=0; i < adj.length; i++) {
			var curTile = this.tileGrid[adj[i].y][adj[i].x];
			if(curTile && curTile.isSurrounded()) {
				this.removePiece(curTile);
			}
		}		
	}
	
	this.handleClick = function(x, y) {
		
		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				if(this.tileGrid[i][j]) {
					if(x >= j*this.tileW/2 && x < j*this.tileW/2 + this.tileW && y >= i*this.tileH && y < i*this.tileH + this.tileH) {

						var isDown= 1;
						if(j%2==0) isDown = 1 - isDown;
						if(i%2==1) isDown = 1 - isDown;
						
						var xa = j*this.tileW/2 + this.tileW/2;
						var ya = i*this.tileH + isDown*this.tileH;
						var alpha = Math.abs(Math.atan2(ya-y, x-xa))*180/Math.PI;

						if(alpha >= 120) j--;
						else if(alpha <= 60) j++;
						
						this.tileClick(player1, new Pos(j, i));
						
						this.render();
						
						break;
						
					}
				}
			}
		}
	};

	this.Hexagon = function(tiles, count) {
		this.tiles = tiles;
		this.count = count;
		this.canBeRemoved = function() {
			var sum = 0;
			for(i=0; i < tiles.length; i++) {
				for(j=0; j < adjacentAll.length; j++) {
					var x = tiles[i].x+adjacentAll[j].x;
					var y = tiles[i].y+adjacentAll[j].y;
					if(x >= 0 && y >= 0 && gameBoard.tileGrid[y][x]) {
						if(++sum > 35) return false;
					}
				}
			}
			
			return true;
		}
	}
	
	this.tile = function() {
		this.x;
		this.y;
		this.color;
		this.triangle;
		this.hexagonIndex;
		this.inHexagon = false;
		this.hasPiece = false;
		this.pieceColor = "";
		this.mesh;
		this.getAdjacentAll = function() {
			var arr = [];
			for(j=0; j < adjacentAll.length; j++) {
				var x = this.x+adjacentAll[j].x;
				var y = this.y+adjacentAll[j].y;
				if(x >= 0 && y >= 0 && gameBoard.tileGrid[y][x]) {
					arr.push(new Pos(x, y));
				}
			}	
			return arr;
		}
		this.getAdjacentOpponents = function() {
			var arr = [];
			var up = this.triangle==triangleUp?1:-1;
			for(i=0; i < 3; i++) {
				var curTile = gameBoard.tileGrid[this.y+adjacentOpponents[i].y*up][this.x+adjacentOpponents[i].x];
				if((curTile && curTile.hasPiece) || !curTile) arr.push(new Pos(this.x+adjacentOpponents[i].x, this.y+adjacentOpponents[i].y*up));
			}			
			return arr;
		}
		this.isSurrounded = function() {
			return this.getAdjacentOpponents().length==3?true:false;
		}
	}
	
	this.removePiece = function(tile) {
		tile.hasPiece = false;
		tile.mesh.visible = false;
		var player = (tile.color == player1.color)?player1:player2;
		player.nbPieces--;
		if(--this.hexagonGrid[tile.hexagonIndex].count == 0 && this.hexagonGrid[tile.hexagonIndex].canBeRemoved()) {
			this.removeHexagon(tile.hexagonIndex);
		}
	}
	
	this.removeHexagon = function(i) {
		for(var j=0; j < 6; j++) {
			x = this.hexagonGrid[i].tiles[j].x;
			y = this.hexagonGrid[i].tiles[j].y;
			this.tileGrid[y][x] = null;
		}
		var adjToHex = [ new Pos(this.hexagonGrid[i].tiles[0].x-1, this.hexagonGrid[i].tiles[0].y),
						 new Pos(this.hexagonGrid[i].tiles[1].x, this.hexagonGrid[i].tiles[1].y-1),
						 new Pos(this.hexagonGrid[i].tiles[2].x+1, this.hexagonGrid[i].tiles[2].y),
						 new Pos(this.hexagonGrid[i].tiles[3].x-1, this.hexagonGrid[i].tiles[3].y),
						 new Pos(this.hexagonGrid[i].tiles[4].x, this.hexagonGrid[i].tiles[4].y+1),
						 new Pos(this.hexagonGrid[i].tiles[5].x+1, this.hexagonGrid[i].tiles[5].y) ];
		for(var i=0; i < 6; i++) {
			if(adjToHex[i].y >= 0 && adjToHex[i].x >= 0) {
				curTile = this.tileGrid[adjToHex[i].y][adjToHex[i].x];
				if(curTile && curTile.hasPiece && curTile.isSurrounded()) {
					this.removePiece(curTile);
				}
				if(curTile && this.hexagonGrid[curTile.hexagonIndex].count == 0 && this.hexagonGrid[curTile.hexagonIndex].canBeRemoved()) {
					this.removeHexagon(curTile.hexagonIndex);
				}	
			}
		}
		
		this.render();
	}

	this.init = function() {
		
		player1 = new Player("#dddade"); // white
		player1.nbPieces = 18;
		player1.nbHexagons = 0;
		player1.type = "human";
		player1.index = 0;

		player2 = new Player("#bbbabc"); // black
		player2.nbPieces = 18;
		player2.nbHexagons = 0;
		player2.type = "ai";
		player2.index = 1;
		
		whosTurn = player1;
		
		cW = WIDTH;
		cH = HEIGHT;

		this.nTilesX = hexGrid[0].length;
		this.nTilesY = hexGrid.length;

		this.width = cW*0.8;
		this.tileW = this.width*2/(this.nTilesX+1);
		this.tileH = this.tileW*sinsixty;
		this.height = this.tileH*this.nTilesY;
		
		this.xOffset = cW/2-this.width/2;
		this.yOffset = cH/2-this.height/2;
	
		this.tileGrid = new Array(this.nTilesX);
		for(i=0; i < this.nTilesX; i++) this.tileGrid[i] = new Array(this.nTilesY);
		
		var color = 1;
		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				color = 1 - color;
				if(hexGrid[i][j] > 0) {
					var newTile = new this.tile();

					newTile.x = j;
					newTile.y = i;
					if(color == 0) {
						newTile.color = player1.color; // white tiles
						newTile.triangle = triangleUp;
						newTile.pieceColor = 0xF1E2D1;//0xFFFFFF;
					} else {
						newTile.color = player2.color; // black tiles
						newTile.triangle = triangleDown;
						newTile.pieceColor = 0xA89BB3;
					}
					newTile.mesh = new createPiece(i, j, newTile.triangle==triangleUp?true:false, newTile.pieceColor);
					newTile.mesh.visible = false;					
					if(hexGrid[i][j] == 2) {
						newTile.hasPiece = true;
						newTile.mesh.visible = true;
					}
					
					this.tileGrid[i][j] = newTile;
				}
			}
		}
		
		this.hexagonGrid = [];
		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				if(this.tileGrid[i][j] && this.tileGrid[i][j].inHexagon == false) {
					var tiles = [];
					var count = 0;
					for(k=0; k < 3; k++) {
						for(l=0; l < 2; l++) {
							var curTile = this.tileGrid[i+l][j+k];
							tiles[k+l*3] = new Pos(curTile.x, curTile.y);
							curTile.inHexagon = true;
							curTile.hexagonIndex = this.hexagonGrid.length;
							if(curTile.hasPiece) count++;
						}
					}
					this.hexagonGrid.push(new this.Hexagon(tiles, count));
				}
			}		
		}
		
		this.render();
	}
	
	this.render = function() {
		ctx.clearRect(this.xOffset-10, this.yOffset-10, this.width+20, this.height+20);
		
		var color = 1;
		var poly;
		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				color = 1 - color;
				if(curTile = this.tileGrid[i][j]) {
				
					var tileOffsetX = this.xOffset+j*this.tileW/2;
					var tileOffsetY = this.yOffset+i*this.tileH;
				
					ctx.fillStyle = curTile.color;
					loadPath(curTile.triangle, tileOffsetX, tileOffsetY, this.tileW, this.tileH);
					ctx.fill();

					if(curTile.color == player2.color) {
						var w = 3;
						ctx.strokeStyle = "#b2b2b3";
						ctx.lineCap = "round";
						ctx.lineWidth = w;
						loadPath(curTile.triangle, tileOffsetX+w/2, tileOffsetY+w/2, this.tileW-w-1, this.tileH-w-1);
						ctx.stroke();					
					}
					
					if(curTile.hasPiece) {
						ctx.fillStyle = curTile.pieceColor;
						loadPath(curTile.triangle, tileOffsetX+0.1*this.tileW, tileOffsetY+0.1*this.tileW, 0.8*this.tileW, 0.8*this.tileH);
						ctx.fill();
						
						if(player1.selectedPiece && curTile.x == player1.selectedPiece.x && curTile.y == player1.selectedPiece.y) {
							// todo piece selection
						}
						
						
					}
				}			
			}
		}			
	}
	
	this.countTiles = function() {
		var count = 0;
		for(i=0; i < this.nTilesY; i++) {
			for(j=0; j < this.nTilesX; j++) {
				if(this.tileGrid[i][j]) count++;
			}
		}	
		return count;
	}
}

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function turnOver() {
	whosTurn = whosTurn==player1?player2:player1;
	if(whosTurn.type == "ai") gameBoard.aiPlay(whosTurn);
	
	gameBoard.render();
}

Pos = function(x, y) {
	this.x = x;
	this.y = y;
}

$(document).ready(function() {

	scene = new THREE.Scene();
	
    var canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    ctx = canvas.getContext("2d");

	gameBoard = new Board();
	adjacentMoves = [new Pos(-2,0), new Pos(-1,1), new Pos(-1,-1), new Pos(1,1), new Pos(1,-1), new Pos(2,0)];
	adjacentOpponents = [new Pos(-1,0), new Pos(0,1), new Pos(1,0)];
	adjacentAll = [new Pos(-1,-1),new Pos(-1,0),new Pos(-1,1),new Pos(0,-1),new Pos(0,1),new Pos(1,-1),new Pos(1,0),new Pos(1,1)];
	gameBoard.init();
	
	// create a WebGL/canvas renderer, camera
	// and a scene
	renderer = Detector.webgl? new THREE.WebGLRenderer({ alpha: true, antialias: true }): new THREE.CanvasRenderer();
	renderer.setClearColor( 0xffffff, 0);

	camera = new THREE.OrthographicCamera( WIDTH / - 2, WIDTH / 2, HEIGHT / 2, HEIGHT / - 2, 1, 1000 );
	
	camera.position.z = 100;

	// start the renderer
	renderer.setSize(WIDTH, HEIGHT);

	// attach the render-supplied DOM element
	$('#container').append(renderer.domElement);

	renderer.domElement.addEventListener('click', function(event) {
		var x = event.pageX - renderer.domElement.offsetLeft, y = event.pageY - renderer.domElement.offsetTop;
		if(x >= gameBoard.xOffset && x <= gameBoard.xOffset + gameBoard.width && y >= gameBoard.yOffset && y <= gameBoard.yOffset + gameBoard.height) {
			gameBoard.handleClick(x-gameBoard.xOffset, y-gameBoard.yOffset);
		}
	}, false);		
	
	// add the sphere to the scene
	//centerPiece = new createPiece(0,0);

	scene.add(camera);

	// create lighting
	var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light	
	var directionalLight = new THREE.DirectionalLight( 0xffffff , 1);
	directionalLight.position.set(0,0,35);
	var directionalLight2 = new THREE.DirectionalLight( 0xffffff , 0.5);
	directionalLight2.position.set(60,5,25);	
	scene.add( ambientLight );
	scene.add( directionalLight );
	scene.add( directionalLight2 );	
	
	boardTexture = new THREE.Texture( canvas );
	boardTexture.minFilter = THREE.NearestFilter;
    boardTexture.needsUpdate = true;
	boardTexture.onUpdate = function() {
		//console.log('test')
	}

    var boardMaterial = new THREE.MeshBasicMaterial( {map: boardTexture, side:THREE.DoubleSide } );
    boardMaterial.transparent = true;

    var boardMesh = new THREE.Mesh( new THREE.PlaneGeometry(WIDTH, HEIGHT), boardMaterial );
    boardMesh.position.set(0,0,0);
    scene.add( boardMesh );
	
	animate();
	//rotationTest();

});

var curAnimations = [];

function three(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

function createMeshAnimation(source, dest) {
	var dx = dest.x - source.x;
	var dy = dest.y - source.y;
	var piece = dest.mesh;
	
	var rotation, movement, mStep, secondStep;
	var rotation2, movement2, mStep2, secondStep, finalPos;
	
	finalPos = new three(dest.mesh.position.x,dest.mesh.position.y,dest.mesh.position.z);
	
	piece.position.x = source.mesh.position.x;
	piece.position.y = source.mesh.position.y;
	piece.position.z = source.mesh.position.z;
	
	mStep = 1.5;
	mStep2 = 1.5;
	var altitude = 0;
	if(dest.triangle == triangleUp) {
		// first step
		if(dx > 0 && dy >= 0) {
			rotation = new three(Math.sqrt(2)/2,Math.sqrt(2)/2,Math.sqrt(2)/2);
			movement = new three(gameBoard.tileW/2,-gameBoard.tileH/2,altitude);	
		} else if(dx < 0 && dy >= 0) {
			rotation = new three(Math.sqrt(2)/2,-Math.sqrt(2)/2,-Math.sqrt(2)/2);
			movement = new three(-gameBoard.tileW/2,-gameBoard.tileH/2,altitude);			
		} else {
			rotation = new three(-Math.PI/3,0,0);
			movement = new three(0,gameBoard.tileH/2,altitude);	
		}
		// second step
		if(dx > 0 && dy <= 0) {
				rotation2 = new three(-Math.sqrt(2)/2,-Math.sqrt(2)/2,Math.sqrt(2)/2);
				movement2 = new three(gameBoard.tileW/2,gameBoard.tileH/2,-altitude);	
		} else if(dx < 0 && dy <= 0) {
				rotation2 = new three(-Math.sqrt(2)/2,Math.sqrt(2)/2,-Math.sqrt(2)/2);
				movement2 = new three(-gameBoard.tileW/2,gameBoard.tileH/2,-altitude);	
		} else {
				rotation2 = new three(Math.PI/3,0,0);
				movement2 = new three(0,-gameBoard.tileH/2,-altitude);		
		}
	} else { // triangle down
		if(dx > 0 && dy <= 0) {
			rotation = new three(-Math.sqrt(2)/2,Math.sqrt(2)/2,-Math.sqrt(2)/2);
			movement = new three(gameBoard.tileW/2,gameBoard.tileH/2,altitude);	
		}
		else if(dx < 0 && dy <= 0) {
			rotation = new three(-Math.sqrt(2)/2,-Math.sqrt(2)/2,Math.sqrt(2)/2);
			movement = new three(-gameBoard.tileW/2,gameBoard.tileH/2,altitude);		
		}
		else {
			rotation = new three(Math.PI/3,0,0);
			movement = new three(0,-gameBoard.tileH/2,altitude);
		}
		if(dx > 0 && dy >= 0) {
				rotation2 = new three(Math.sqrt(2)/2,-Math.sqrt(2)/2,-Math.sqrt(2)/2);
				movement2 = new three(gameBoard.tileW/2,-gameBoard.tileH/2,-altitude);									
		} else if(dx < 0 && dy >= 0) {
				rotation2 = new three(Math.sqrt(2)/2,Math.sqrt(2)/2,Math.sqrt(2)/2);
				movement2 = new three(-gameBoard.tileW/2,-gameBoard.tileH/2,-altitude);
		} else {
				rotation2 = new three(-Math.PI/3,0,0);
				movement2 = new three(0,gameBoard.tileH/2,-altitude);			
		}		
	}
	secondStep = new meshAnimation(piece, rotation2, movement2, mStep2, null, finalPos);
	return new meshAnimation(piece, rotation, movement, mStep, secondStep);
}

function meshAnimation(mesh, rotation, movement, mStep, secondStep, finalPos) {
	this.mesh = mesh;
	this.curRotation = new three(0,0,0);
	this.rotation = rotation?rotation:new three(0,0,0);
	this.curMovement = new three(0,0,0);
	this.movement = movement?movement:new three(0,0,0);
	this.mStep = mStep?mStep:1;
	this.secondStep = secondStep;
	this.finalPos = finalPos;
}

function resetRotation(mesh, spike) {
	if(mesh.userData.up) mesh.rotation.set(-Math.PI/3-spike*Math.PI/3,0,Math.PI/4);
	else mesh.rotation.set(1+spike*Math.PI/3,0,Math.PI/4);
}

function animate() {
	window.requestAnimationFrame(animate);
	

	if(curAnimations.length > 0) {
		var i;
		var anim, piece;	
		for(i=0; i < curAnimations.length; i++) {
			anim = curAnimations[i];
		
			piece = anim.mesh;
			
			var rX = anim.curRotation.x;
			var rY = anim.curRotation.y;
			var rZ = anim.curRotation.z;			
			var rXmax = anim.rotation.x;
			var rYmax = anim.rotation.y;
			var rZmax = anim.rotation.z;
			
			var X = anim.curMovement.x;
			var Y = anim.curMovement.y;
			var Z = anim.curMovement.z;
			var Xmax = anim.movement.x;
			var Ymax = anim.movement.y;
			var Zmax = anim.movement.z;			
			var mStep = anim.mStep;
			
			var Xm = Xmax<0?-1:1;
			var Ym = Ymax<0?-1:1;
			var Zm = Zmax<0?-1:1;
			
			var a, b, c, d, e, f;
			if(a = Math.abs(anim.curRotation.x) < Math.abs(rXmax)) piece.rotation.x += rXmax/20; anim.curRotation.x += rXmax/20;
			if(b = Math.abs(anim.curRotation.y) < Math.abs(rYmax)) piece.rotation.y += rYmax/20; anim.curRotation.y += rYmax/20;
			if(c = Math.abs(anim.curRotation.z) < Math.abs(rZmax)) piece.rotation.z += rZmax/20; anim.curRotation.z += rZmax/20;
			if(d = Math.abs(anim.curMovement.x) < Math.abs(Xmax)) {
				if(Math.abs(anim.curMovement.x + mStep) > Math.abs(Xmax)) anim.curMovement.x = Xmax;
				else {
					piece.position.x += Xm*mStep; 
					anim.curMovement.x += Xm*mStep;
				}
			}
			if(e = Math.abs(anim.curMovement.y) < Math.abs(Ymax)) {
				if(Math.abs(anim.curMovement.y + mStep) > Math.abs(Ymax)) anim.curMovement.y = Ymax;
				else {
					piece.position.y += Ym*mStep; 
					anim.curMovement.y += Ym*mStep;
				}
			}
			if(f = Math.abs(anim.curMovement.z) < Math.abs(Zmax)) {
				if(Math.abs(anim.curMovement.z + mStep) > Math.abs(Zmax)) anim.curMovement.z = Zmax;
				else {
					piece.position.z += Zm*mStep; 
					anim.curMovement.z += Zm*mStep;
				}
			}
			
			if(!a && !b && !c && !d && !e && !f) {
				if(anim.secondStep) {
					resetRotation(anim.mesh, 1);
					curAnimations.push(anim.secondStep);
				}
				else {
					resetRotation(anim.mesh, 0);
					if(anim.finalPos) anim.mesh.position.set(anim.finalPos.x,anim.finalPos.y,anim.finalPos.z);
				}
				curAnimations.splice(i, 1);
			}
		}
	}
	
	boardTexture.needsUpdate = true;
	renderer.render(scene, camera);	
}
	
function createPiece(i, j, up, color) {
	var pieceMaterial = new THREE.MeshLambertMaterial(
	{
	    color: color,
	    shading: THREE.FlatShading
	});
	var radius = (gameBoard.tileW+gameBoard.tileH)/3+1;
	var geometry = new THREE.TetrahedronGeometry(radius);
	var piece = new THREE.Mesh(geometry,pieceMaterial);
	piece.userData = {};
	var yCoeff;
	if(up) {
		piece.userData.up = true;
		piece.rotation.set(-Math.PI/3,0,Math.PI/4);
		yCoeff = 1.42;
	}
	else {
		piece.userData.up = false;
		piece.rotation.set(1,0,Math.PI/4);
		yCoeff = 1.12;
	}
	
	var x = -cW/2 + gameBoard.tileW*1.5 + j*gameBoard.tileW/2;
	var y = cH/2 - gameBoard.tileH*yCoeff - i*gameBoard.tileH; 
	piece.position.set(x, y, 20);
	scene.add(piece);
	return piece;
}

function loadPath(poly, x, y, w, h) {
	ctx.beginPath();
	ctx.moveTo(x+poly[0]*w, y+poly[1]*h);
	for( item=2 ; item < poly.length-1 ; item+=2 ){
	    ctx.lineTo( x+poly[item]*w , y+poly[item+1]*h );
	}
	ctx.closePath();
}

function parseHexGrid() {
						var m = "[ ";
						for(i=0; i < gameBoard.nTilesY; i++) {
							m += "[";
							for(j=0; j < gameBoard.nTilesX; j++) {
								m += hexGrid[i][j];
								if(j != gameBoard.nTilesX-1) {
									m += ", ";
								}
							}
							m += "]";
							if(i != gameBoard.nTilesY-1) {
								m += ",\n";
							}
						}
						m += " ]";
						console.log(m);
}