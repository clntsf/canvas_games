const TILE_SZ = 20;
const MARGIN_SZ = 10;
const TOPMARGIN_SZ = 20;

const FPS = 5;
const MAX_BUFFER_LEN = 2
const INITIAL_SIZE = 3

class Position {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    add(other) {
        if ( other instanceof Position ) {
            return new Position(this.x+other.x, this.y+other.y);
        } throw 'Parameter "other" must be of type Position';
    }
    eq(other) {
        if ( other instanceof Position ) {
            return (this.x == other.x && this.y == other.y);
        } throw 'Parameter "other" must be of type Position';
    }
    neq(other) {
        return !this.eq(other);
    }
}

class Direction {
    static RIGHT = new Position(1,0);
    static LEFT = new Position(-1,0);
    static UP = new Position(0,-1);
    static DOWN = new Position(0,1);
    static STILL = new Position(0,0);
}

class SnakeGame {
    constructor(ctx, width, height) {
        this.width = width;
        this.height = height;
        this.ctx = ctx;

        this.canvas = this.ctx.canvas;
        this.canvas.width = this.width*TILE_SZ + 2*MARGIN_SZ;
        this.canvas.height = this.height*TILE_SZ + 2*MARGIN_SZ + TOPMARGIN_SZ;

        this.hs = 0;

        this.restart();
    }

    die(){
        this.hs = Math.max(this.hs, this.body.length - 2);
        this.is_alive = false;
        this.draw();
    }

    restart() {
        this.is_alive = true;

        let mid_w = Math.floor(this.width / 2);
        let mid_h = Math.floor(this.height / 2);

        this.head_pos = new Position(mid_w - 1, mid_h);
        this.food_pos = new Position(mid_w + 2, mid_h);

        this.body = new Array();
        for (var i=2; i<=INITIAL_SIZE; i++) {
            this.body.push(new Position(mid_w-i, mid_h));
        }
        this.direction = Direction.RIGHT;
        this.input_buffer = new Array();
    }

    draw_px(px) {
        this.ctx.fillRect(
            MARGIN_SZ + (px.x * TILE_SZ),
            TOPMARGIN_SZ + MARGIN_SZ + (px.y * TILE_SZ),
            TILE_SZ, TILE_SZ
            );
    }
    draw() {

        this.ctx.fillStyle = "#DDDDDD";                                     // canvas outline
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(MARGIN_SZ, MARGIN_SZ+TOPMARGIN_SZ, this.width*TILE_SZ, this.height*TILE_SZ);

        this.ctx.font = "20px Arial";
        this.ctx.fillText(`Score: ${this.body.length - 2}`, MARGIN_SZ, 23);

        let hs_text = `High: ${this.hs}`;
        let hs_text_offset = this.canvas.width - this.ctx.measureText(hs_text).width - MARGIN_SZ;
        this.ctx.fillText(hs_text, hs_text_offset, 23);

        this.ctx.fillStyle = "#CF0000";                                     // body
        this.body.forEach((pt) => {this.draw_px(pt);});

        this.ctx.fillStyle = "#FF0000";                                     // head
        this.draw_px(this.head_pos);

        this.ctx.fillStyle = "lime";                                        // food
        this.draw_px( this.food_pos );

    }

    spawn_food(newhead) {
        let food_pos = new Position(
            Math.floor ( this.width * Math.random() ),
            Math.floor ( this.height * Math.random() )
        );
        if ( newhead.eq(food_pos) ) { this.spawn_food() }
        this.body.forEach((cell) => {
            if (cell.eq(food_pos)) { this.spawn_food() }
        });
        this.food_pos = food_pos;
    }

    keypress(e){                        // handle keypresses
        if ( this.input_buffer.length == MAX_BUFFER_LEN ) { return; }
        let buffer_last = (this.input_buffer.length ? this.input_buffer.at(-1) : this.direction);

        switch (e.key.toLowerCase()) {  // fall-through to achieve the effect of '|' in a switch (https://stackoverflow.com/questions/6513585/test-for-multiple-cases-in-a-switch-like-an-or)             
            case 'w': case'arrowup':
                if (buffer_last.neq(Direction.DOWN) && buffer_last.neq(Direction.UP)){
                    this.input_buffer.unshift(Direction.UP);
                } break;
            case 'a': case 'arrowleft':
                if (buffer_last.neq(Direction.RIGHT) && buffer_last.neq(Direction.LEFT)){
                    this.input_buffer.unshift(Direction.LEFT);
                } break;
            case 's': case 'arrowdown':
                if (buffer_last.neq(Direction.DOWN) && buffer_last.neq(Direction.UP)){
                    this.input_buffer.unshift(Direction.DOWN);
                } break;
            case 'd': case 'arrowright':
                if (buffer_last.neq(Direction.RIGHT) && buffer_last.neq(Direction.LEFT)){
                    this.input_buffer.unshift(Direction.RIGHT);
                } break;
            case 'x':
                this.die();
                break;
            case 'r':
                if (!this.is_alive) { this.restart(); break; }
            
        }
    }

    update(){

        if ( this.is_alive == false ) { return; }

        let last_buffered = this.input_buffer.pop();
        this.direction = ( last_buffered ? last_buffered : this.direction );
        let newhead = this.head_pos.add(this.direction);    

        if (  (newhead.x<0) || (newhead.x==this.width) || (newhead.y<0) || (newhead.y==this.height) ) { // check collision with walls
            this.die(); return; 
        }

        for (const idx in this.body) if ( this.body[idx].eq(newhead) ) {        // check collision with body
            this.die(); return; 
        }

        this.body.unshift(this.head_pos);
        if ( newhead.eq(this.food_pos) ) { this.spawn_food(newhead); }
        else {this.body.pop();}

        this.head_pos = newhead;
        this.draw();

    }

}

window.onload = () => {
    let canvas = document.getElementById("gamescr");        // get the canvas elem
    let ctx = canvas.getContext("2d");                      // get 2d context for drawing

    let snake = new SnakeGame(ctx, 17, 15);
    document.addEventListener( "keydown", (k)=>{snake.keypress(k);} );         // get keyboard events

    snake.draw();
    setInterval(() => {snake.update();}, 1000/FPS);                    // set refresh (in ms)
}
