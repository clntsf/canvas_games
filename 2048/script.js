const TILE_SZ = 60;
const TILE_MARG = 10;
const SCR_MARG = 40;

const SCR_SZ = (4*TILE_SZ) + (5*TILE_MARG) + (2*SCR_MARG)
const GAMEWIN_SZ = SCR_SZ-2*SCR_MARG

const KEY_DELAY = 0.2

const Colors = {
    BG: "#8f7a65",
    GAME_BG: "#bbac9f",
    TILE_BG: "rgba(238,228,218,0.35)",
    2: "#eee4da",
    4: "#eee1c9",
    8: "#f3b27a",
    16: "#f69664",
    32: "#f77c5f",
    64: "#f75f3b",
    128: "#edd073",
    256: "#edcc62",
    512: "#edc950",
    1024: "#edc53f",
    2048: "#edc22e"
};

const TextColors = {
    LOW: "#77656a",
    HIGH: "#f9f6f2"
};

const Directions = {
    "w": [0,-1],
    "arrowup": [0,-1],

    "s": [0,1],
    "arrowdown": [0,1],

    "a": [-1,0],
    "arrowleft": [-1,0],

    "d": [1,0],
    "arrowright": [1,0]
}

// maps onto (and returns) the first row of the array
// goes through each item x and index i, and turns that item into an array of the ith item of each row (col i)
let transpose = arr => arr[0].map( (x,i) => arr.map(x => x[i]) );

class GameGrid {
    constructor(canv) {
        this.canv = canv;
        this.canv.width = SCR_SZ;
        this.canv.height = SCR_SZ;

        this.ctx = canv.getContext("2d");
        this.accept_input = true;
        document.addEventListener("keydown", (k) => {this.keypress(k)});

        this.game_inprog = true;
        this.score = 0
        this.tiles = [
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0]
        ];
        for (var i=0; i<2; i++){
            this.spawn_tile();
        }
        this.draw();
    }

    tile_pos(idx) {
        if ( idx<0 || idx>15 ) { throw "invalid tile index (must be 0-15)" }
        return [idx%4, Math.floor(idx/4)];
    }

    spawn_tile(){
        let pos = Math.floor( 16 * Math.random() );
        let [tx, ty] = this.tile_pos(pos)

        if ( this.tiles[ty][tx] != 0 ) {
            return this.spawn_tile();
        }

        let tile_val = (Math.random() < 0.1) ? 4 : 2;
        this.tiles[ty][tx] = tile_val;
        console.log("Spawned:",tx, ty);
    }

    check_legal_moves() {                               // check if any legal moves exist
        for ( var pos=0; pos<16; pos+=2 ) {             // search in checkerboard pattern (simple optimisation)

            let [tx, ty] = this.tile_pos(pos);
            let cell = this.tiles[ty][tx];
            if (cell == 0) { return true; }

            for ( dir of Directions ) {
                let [dx, dy] = Directions[dir];

                let neighbor_cell = self.tiles[ty+dy][tx+dx];  // if neighbor cell is out of bounds this will be undefined, so no need to catch an error
                if ( cell == neighbor_cell ) { return true; } 
            }
        } return false; // no cells are empty, and no neighboring cells have equal values (i.e. none mergeable)
    }

    to_loc(idx) {
        if ( idx<0 || idx>3 ) {throw "invalid idx (must be 0-3 incl.)";}
        return SCR_MARG + TILE_MARG + idx*(TILE_SZ+TILE_MARG);
    }

    draw() {
        this.ctx.textBaseline = "middle";

        this.ctx.fillStyle = Colors.BG;
        this.ctx.fillRect(0,0,SCR_SZ,SCR_SZ);

        this.ctx.fillStyle = Colors.GAME_BG;
        this.ctx.fillRect(SCR_MARG, SCR_MARG, GAMEWIN_SZ, GAMEWIN_SZ);

        // draw cells/text
        for (var pos=0; pos<16; pos++) {
            // drawing cells
            let [tx, ty] = this.tile_pos(pos);
            let tile = this.tiles[ty][tx];
            this.ctx.fillStyle = ( (tile==0) ? Colors.TILE_BG : Colors[tile] );

            var tx_sp = this.to_loc(tx);
            var ty_sp = this.to_loc(ty);
            this.ctx.fillRect(tx_sp, ty_sp, TILE_SZ, TILE_SZ);
            if (tile == 0) { continue; }

            // drawing text
            this.ctx.fillStyle = ( (tile<8) ? TextColors.LOW : TextColors.HIGH );
            var tilestr = tile.toString();
            var fontsize = 45 - 10 * Math.min( Math.max(0, tilestr.length - 2), 3 );
            this.ctx.font = `${fontsize}px Helvetica Neue`;

            var text_w = this.ctx.measureText(tilestr).width;
            this.ctx.fillText(tilestr, tx_sp+0.5*(TILE_SZ-text_w), ty_sp + 0.55*TILE_SZ );        // this is sorta magic, fuck spacing
        }
    }

    // 'shifts' the tiles (the main portion of the game logic)
    shift(x,y){
        console.log(x, y);
        var moved = false;
        if (x!=0 && y!= 0) {throw "one parameter must be 0";}

        // standardizing the array for the shift...
        if (y != 0) { this.tiles = transpose(this.tiles); }
        if (x==1 || y == 1) { this.tiles = this.tiles.map(x => x.reverse())}

        // shift logic (monkaW)
        for (var r=0; r<4; r++) {
            var row = this.tiles[r];
            var row_merged = 0;

            for ( var i=0; i<=3; ++i ) {
                if (row[i] == 0) continue;

                var cell_val = row[i];
                row[i] = 0
                var idx = 1;
                while (true) {
                    var next_cell = row[i-idx];

                    if ( next_cell == 0) { idx += 1; continue; }
                    if ( next_cell == undefined || next_cell != cell_val || row_merged == 2 ) {
                        row[i-idx+1] = cell_val; break; // cell can no longer move/merge, 
                    }
                    row[i] == 0; row_merged++;
                    cell_val = -2*next_cell;        // 'merge' the two cells (ok maybe it's messy)
                    this.score += -cell_val;        // increment score by value of new cell
                    idx += 1;
                } if (idx != 1) {moved = true}
            } this.tiles[r] = row.map(x => Math.abs(x));
        }

        // ...and returning it to its original orientation
        if (x==1 || y == 1) { this.tiles = this.tiles.map(x => x.reverse())}
        if (y!=0) { this.tiles = transpose(this.tiles); }

        // also, spawn a tile if any were moved (i.e. if the move did anything)
        if (moved) {this.spawn_tile()}  
    }

    // processes user keypresses
    keypress(e) {
        if (!this.accept_input) { console.log("nope!"); return; }
        let key = e.key.toLowerCase();
        switch (key) {
            case "w": case "arrowup":
                this.shift(0, -1); break;
            case "d": case "arrowright":
                this.shift(1, 0); break;
            case "s": case "arrowdown":
                this.shift(0, 1); break;
            case "a": case "arrowleft":
                this.shift(-1, 0); break;
            default: return;
        } 
        this.accept_input = false;
        this.draw();
        setTimeout(() => {this.accept_input = true}, 1000*KEY_DELAY);
    }
}

document.body.style.backgroundColor = "#faf8ef";
let canv = document.querySelector("canvas#gamescr");
let game = new GameGrid(canv);