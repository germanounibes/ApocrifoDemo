
/* =========================================
   APÓCRIFO
   Protótipo 01
   Phaser 3 + JavaScript
========================================= */

const WIDTH = 640;
const HEIGHT = 360;
const WORLD_WIDTH = 1100;


/* =========================================
   CENA PRINCIPAL
========================================= */

class HouseScene extends Phaser.Scene {

    constructor() {
        super("HouseScene");
    }


    create() {

        this.physics.world.setBounds(
            0, 0,
            WORLD_WIDTH,
            HEIGHT
        );

        this.createArthur();
        this.createEnvironment();
        this.createInteractions();

        this.createInterface();

        this.cameras.main.setBounds(
            0, 0,
            WORLD_WIDTH,
            HEIGHT
        );

        this.cameras.main.startFollow(
            this.arthur,
            true,
            0.1,
            0
        );

        this.cameras.main.setDeadzone(210, HEIGHT);
    }


    /* =====================================
       ARTHUR
    ===================================== */

    createArthur() {

        const graphics = this.make.graphics({
            x: 0,
            y: 0,
            add: false
        });

        // Cabelo
        graphics.fillStyle(0x27212a);
        graphics.fillRect(7, 0, 14, 12);

        // Rosto
        graphics.fillStyle(0xd0a080);
        graphics.fillRect(8, 12, 12, 12);

        // Camisa
        graphics.fillStyle(0x3e5360);
        graphics.fillRect(5, 24, 18, 21);

        // Pernas
        graphics.fillStyle(0x28232a);
        graphics.fillRect(6, 44, 7, 12);
        graphics.fillRect(16, 44, 7, 12);

        graphics.generateTexture("arthur", 28, 56);

        graphics.destroy();


        this.arthur = this.physics.add.sprite(
            85, 285,
            "arthur"
        );

        this.arthur.setOrigin(0.5, 1);

        this.arthur.setCollideWorldBounds(true);

        this.arthur.body.setSize(13, 27);
        this.arthur.body.setOffset(5, 5);

        this.arthur.speed = 112;


        this.keys = this.input.keyboard.addKeys({
            left: "LEFT",
            right: "RIGHT",
            a: "A",
            d: "D",
            interact: "E"
        });
    }


    /* =====================================
       AMBIENTE
    ===================================== */

    createEnvironment() {

        // Parede
        this.add.rectangle(
            WORLD_WIDTH / 2,
            180,
            WORLD_WIDTH,
            360,
            0x30282b
        ).setDepth(0);


        // Textura da parede
        const wallpaper = this.add.graphics();

        wallpaper.lineStyle(
            1,
            0x493b3d,
            0.65
        );

        for (let x = 0; x < WORLD_WIDTH; x += 32) {
            wallpaper.lineBetween(
                x, 12,
                x, 235
            );
        }

        wallpaper.setDepth(1);


        // Rodapé
        this.add.rectangle(
            WORLD_WIDTH / 2,
            238,
            WORLD_WIDTH,
            5,
            0x796052
        ).setDepth(2);


        // Chão
        this.add.rectangle(
            WORLD_WIDTH / 2,
            300,
            WORLD_WIDTH,
            120,
            0x59453d
        ).setDepth(2);


        // Janela
        this.add.rectangle(
            205, 115,
            100, 112,
            0x1c2532
        ).setDepth(3);

        this.add.rectangle(
            205, 115,
            88, 100,
            0x293747
        ).setDepth(4);


        // Moldura da janela
        const frame = this.add.graphics();

        frame.lineStyle(4, 0x765e50);

        frame.strokeRect(
            155, 59,
            100, 112
        );

        frame.lineBetween(205, 59, 205, 171);
        frame.lineBetween(155, 115, 255, 115);

        frame.setDepth(5);


        // Sofá
        this.add.rectangle(
            365, 260,
            118, 48,
            0x624650
        ).setDepth(8);

        this.add.rectangle(
            365, 229,
            118, 19,
            0x795862
        ).setDepth(8);


        // Colisor do sofá
        const sofaCollider = this.add.rectangle(
            365, 264,
            112, 24,
            0xffffff,
            0
        );

        this.physics.add.existing(
            sofaCollider,
            true
        );

        this.physics.add.collider(
            this.arthur,
            sofaCollider
        );


        this.createBookshelf();


        // Objeto em primeiro plano
        this.add.rectangle(
            605, 330,
            170, 35,
            0x292126
        ).setDepth(80);
    }


    /* =====================================
       ESTANTE
    ===================================== */

    createBookshelf() {

        this.add.rectangle(
            505, 190,
            100, 142,
            0x4b352d
        ).setDepth(10);


        const shelf = this.add.graphics();

        shelf.fillStyle(0x806044);

        shelf.fillRect(455, 145, 100, 5);
        shelf.fillRect(455, 190, 100, 5);
        shelf.fillRect(455, 235, 100, 5);


        const colors = [
            0x843e3d,
            0x3d5962,
            0x907448,
            0x4e6047,
            0x65496a,
            0x9b8060
        ];

        colors.forEach((color, i) => {

            shelf.fillStyle(color);

            shelf.fillRect(
                462 + i * 14,
                151,
                10,
                37
            );

            shelf.fillRect(
                462 + i * 14,
                196,
                10,
                37
            );

        });

        shelf.setDepth(11);


        // Caderno artesanal
        this.add.rectangle(
            530, 216,
            18, 30,
            0x9c8060
        ).setDepth(12);

        this.add.rectangle(
            530, 216,
            14, 26,
            0x47342e
        ).setDepth(13);
    }


    /* =====================================
       INTERAÇÕES
    ===================================== */

    createInteractions() {

        this.objects = [

            {
                x: 205,
                y: 276,
                name: "Examinar a janela",
                description:
                    "A janela está trancada. Do lado de fora, só há escuridão."
            },

            {
                x: 505,
                y: 280,
                name: "Examinar o caderno",
                description:
                    "Entre livros de mitologias diferentes, há um caderno artesanal. A capa parece ter sido manuseada muitas vezes."
            },

            {
                x: 365,
                y: 280,
                name: "Examinar o sofá",
                description:
                    "Uma manta foi dobrada cuidadosamente. Parece que alguém esperava que você se acomodasse."
            }

        ];


        this.nearbyObject = null;
    }


    /* =====================================
       INTERFACE
    ===================================== */

    createInterface() {

        this.prompt = this.add.text(
            0, 0,
            "",
            {
                fontFamily: "monospace",
                fontSize: "10px",
                color: "#f1e5d5",
                backgroundColor: "#211a20",
                padding: {
                    x: 5,
                    y: 4
                }
            }
        );

        this.prompt
            .setOrigin(0.5, 1)
            .setDepth(100)
            .setVisible(false);


        this.dialogue = this.add.text(
            12, 303,
            "",
            {
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#f1e5d5",
                backgroundColor: "#171319",
                padding: {
                    x: 9,
                    y: 7
                },
                wordWrap: {
                    width: 590
                }
            }
        );

        this.dialogue
            .setScrollFactor(0)
            .setDepth(200)
            .setVisible(false);


        this.input.keyboard.on(
            "keydown-E",
            () => this.interact()
        );
    }


    /* =====================================
       ATUALIZAÇÃO
    ===================================== */

    update() {

        this.updateMovement();

        this.updateInteractions();
    }


    updateMovement() {

        const left =
            this.keys.left.isDown ||
            this.keys.a.isDown;

        const right =
            this.keys.right.isDown ||
            this.keys.d.isDown;


        if (left === right) {

            this.arthur.setVelocityX(0);

        } else if (left) {

            this.arthur.setVelocityX(
                -this.arthur.speed
            );

            this.arthur.setFlipX(true);

        } else {

            this.arthur.setVelocityX(
                this.arthur.speed
            );

            this.arthur.setFlipX(false);

        }
    }


    updateInteractions() {

        this.nearbyObject = null;

        let closest = 54;


        for (const object of this.objects) {

            const distance = Phaser.Math.Distance.Between(
                this.arthur.x,
                this.arthur.y - 15,
                object.x,
                object.y
            );


            if (distance < closest) {

                closest = distance;
                this.nearbyObject = object;

            }
        }


        if (this.nearbyObject) {

            this.prompt
                .setText(
                    "[E] " + this.nearbyObject.name
                )
                .setPosition(
                    this.nearbyObject.x,
                    this.nearbyObject.y - 18
                )
                .setVisible(true);

        } else {

            this.prompt.setVisible(false);

        }
    }


    interact() {

        if (!this.nearbyObject) return;


        this.dialogue
            .setText(this.nearbyObject.description)
            .setVisible(true);


        this.time.delayedCall(
            2800,
            () => this.dialogue.setVisible(false)
        );
    }

}


/* =========================================
   CONFIGURAÇÃO DO JOGO
========================================= */

const config = {

    type: Phaser.AUTO,

    parent: "game-container",

    width: WIDTH,
    height: HEIGHT,

    backgroundColor: "#171319",

    pixelArt: true,
    roundPixels: true,

    physics: {

        default: "arcade",

        arcade: {
            debug: false
        }

    },

    scale: {

        mode: Phaser.Scale.FIT,

        autoCenter: Phaser.Scale.CENTER_BOTH

    },

    scene: [HouseScene]

};


/* =========================================
   INICIALIZAÇÃO
========================================= */

new Phaser.Game(config);
