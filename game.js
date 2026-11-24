
/* =========================================
   APÓCRIFO
   Protótipo 01 - 2.5D Depth Movement (Little Misfortune / Sally Face Style)
   Phaser 3 + JavaScript
========================================= */

const WIDTH = 640;
const HEIGHT = 360;
const WORLD_WIDTH = 1100;

// Limites de profundidade transitável no chão (2.5D)
const MIN_Y = 248;           // Fundo da sala (junto à parede/rodapé)
const MAX_Y = 342;           // Frente da sala (próximo à borda inferior)

// Velocidades de movimentação
const WALK_SPEED_X = 125;     // Caminhada horizontal
const WALK_SPEED_Y = 120;     // Caminhada em profundidade (~66% da horizontal para perspectiva 2.5D)
const RUN_SPEED_X = 200;     // Corrida horizontal (Shift)
const RUN_SPEED_Y = 170;     // Corrida em profundidade (Shift)

const ACCEL_RATE = 1;     // Inércia de aceleração
const DRAG_RATE = 1;      // Desaceleração suave ao soltar

// Escala visual do Arthur em relação à imagem original de 96 x 128 px.
// A arte fica maior ao chegar à frente da sala e menor perto da parede,
// preservando a proporção típica de uma vista 2.5D.
const ARTHUR_SCALE_BACK = 1;
const ARTHUR_SCALE_FRONT = 1.2;
const ARTHUR_INITIAL_SCALE = 1;

// Hitbox em coordenadas locais da textura original. Ela é pequena apenas
// na região dos pés, onde o personagem deve colidir com móveis e limites.
const ARTHUR_HITBOX_WIDTH = 40;
const ARTHUR_HITBOX_HEIGHT = 14;
const ARTHUR_HITBOX_OFFSET_X = 28;
const ARTHUR_HITBOX_OFFSET_Y = 114;

// Proporção da sombra em relação ao sprite. No eixo Y ela permanece fina,
// simulando uma sombra no chão em vez de um círculo preso ao personagem.
const ARTHUR_SHADOW_SCALE_X = 1.8;
const ARTHUR_SHADOW_SCALE_Y = 1.0;


/* =========================================
   CENA PRINCIPAL
========================================= */

class HouseScene extends Phaser.Scene {

    constructor() {
        super("HouseScene");
    }

    preload() {
        this.load.image(
            "arthur_idle_open",
            "./assets/characters/FramesArthur/processed/arthur_idle_open.png"
        );
        this.load.image(
            "arthur_idle_closed",
            "./assets/characters/FramesArthur/processed/arthur_idle_closed.png"
        );
        this.load.image(
            "arthur_walk_1",
            "./assets/characters/FramesArthur/processed/arthur_walk1.png"
        );
        this.load.image(
            "arthur_walk_2",
            "./assets/characters/FramesArthur/processed/arthur_walk2.png"
        );
    }

    create() {
        this.physics.world.setBounds(
            0, 0,
            WORLD_WIDTH,
            HEIGHT
        );

        // 1. Texturas auxiliares e animações
        this.createTextures();

        // 2. Criação do Arthur primeiro para garantir que existe para os colisores
        this.createArthur();

        // 3. Cenário e mobílias
        this.createEnvironment();

        // 4. Configuração segura de colisões 2.5D
        this.setupColliders();

        // 5. Interações e Interface
        this.createInteractions();
        this.createInterface();

        // Câmera estilo cinematográfico / adventure
        this.cameras.main.setBounds(
            0, 0,
            WORLD_WIDTH,
            HEIGHT
        );

        this.cameras.main.startFollow(
            this.arthur,
            true,
            0.08,
            0.08
        );

        this.cameras.main.setDeadzone(100, 120);
        this.cameraLookAheadX = 0;

        // Foco automático do teclado ao clicar no canvas
        this.input.on("pointerdown", () => {
            window.focus();
        });
    }


    /* =====================================
       TEXTURAS AUXILIARES E ANIMAÇÕES
    ===================================== */

    createTextures() {
        // Sombra elíptica sob os pés
        const shadowG = this.make.graphics({ x: 0, y: 0, add: false });
        shadowG.fillStyle(0x0e0c10, 0.45);
        shadowG.fillEllipse(13, 5, 26, 10);
        shadowG.generateTexture("arthur_shadow", 26, 10);
        shadowG.destroy();

        // Partícula sutil de poeira nos passos
        const dustG = this.make.graphics({ x: 0, y: 0, add: false });
        dustG.fillStyle(0x7c6961, 0.7);
        dustG.fillCircle(2, 2, 2);
        dustG.generateTexture("dust_particle", 4, 4);
        dustG.destroy();

        // Animações
        this.anims.create({
            key: "arthur_idle",
            frames: [
                { key: "arthur_idle_open" },
                { key: "arthur_idle_closed" }
            ],
            frameRate: 1.8,
            repeat: -1
        });

        this.anims.create({
            key: "arthur_walk",
            frames: [
                { key: "arthur_walk_1" },
                { key: "arthur_idle_open" },
                { key: "arthur_walk_2" },
                { key: "arthur_idle_closed" }
            ],
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: "arthur_run",
            frames: [
                { key: "arthur_walk_1" },
                { key: "arthur_idle_open" },
                { key: "arthur_walk_2" },
                { key: "arthur_idle_closed" }
            ],
            frameRate: 14,
            repeat: -1
        });
    }


    /* =====================================
       ARTHUR (FÍSICA 2.5D E CONTROLES)
    ===================================== */

    createArthur() {
        /*
         * SOMBRA DO PERSONAGEM
         * --------------------
         * A sombra é um objeto separado do sprite. Isso permite que ela fique
         * sempre ancorada aos pés, mesmo enquanto o corpo é escalado pela
         * profundidade da sala. A origem fica no centro da elipse.
         */
        this.shadow = this.add.image(85, 290, "arthur_shadow");
        this.shadow.setOrigin(0.5, 0.5);

        /*
         * SPRITE PRINCIPAL
         * ----------------
         * A origem (0.5, 1) representa exatamente o ponto central dos pés.
         * Assim, mudar a posição Y não faz o personagem flutuar: o deslocamento
         * sempre acontece a partir da base da imagem.
         *
         * A arte original foi desenhada olhando para a ESQUERDA. Por isso,
         * flipX=false é o estado natural e flipX=true espelha para a DIREITA.
         *
         * A escala inicial usa o tamanho real da textura (96 x 128 px) e varia
         * com a profundidade para preservar a proporção da cena.
         */
        this.arthur = this.physics.add.sprite(85, 290, "arthur_idle_open");
        this.arthur.setOrigin(0.5, 1);
        this.arthur.setScale(ARTHUR_INITIAL_SCALE);
        this.arthur.setFlipX(false);
        this.arthur.setCollideWorldBounds(true);

        /*
         * HITBOX DE COLISÃO
         * -----------------
         * O retângulo vermelho da hitbox não precisa cobrir cabelo, braços ou
         * tronco: em jogos 2.5D, colisões úteis geralmente usam uma área curta
         * e larga próxima aos pés.
         *
         * - width/height usam coordenadas da imagem original de 96 x 128.
         * - offsetX deixa a caixa centralizada no eixo horizontal.
         * - offsetY começa próximo às botas, no fim da textura.
         */
        this.arthur.body.setSize(
            ARTHUR_HITBOX_WIDTH,
            ARTHUR_HITBOX_HEIGHT
        );
        this.arthur.body.setOffset(
            ARTHUR_HITBOX_OFFSET_X,
            ARTHUR_HITBOX_OFFSET_Y
        );

        this.arthur.play("arthur_idle");

        this.isDialogueActive = false;
        this.dialogueTimer = null;
        this.stepAccumulator = 0;

        // 1. Controles via Phaser Keyboard Plugin
        const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
        this.keys = {
            w: this.input.keyboard.addKey(KeyCodes.W),
            a: this.input.keyboard.addKey(KeyCodes.A),
            s: this.input.keyboard.addKey(KeyCodes.S),
            d: this.input.keyboard.addKey(KeyCodes.D),
            up: this.input.keyboard.addKey(KeyCodes.UP),
            down: this.input.keyboard.addKey(KeyCodes.DOWN),
            left: this.input.keyboard.addKey(KeyCodes.LEFT),
            right: this.input.keyboard.addKey(KeyCodes.RIGHT),
            shift: this.input.keyboard.addKey(KeyCodes.SHIFT),
            interact: this.input.keyboard.addKey(KeyCodes.E)
        };

        // 2. Backup nativo do navegador para garantir resposta imediata independente de layout/foco
        this.rawKeys = {
            w: false, a: false, s: false, d: false,
            up: false, down: false, left: false, right: false,
            shift: false
        };

        window.addEventListener("keydown", (e) => {
            const k = e.key.toLowerCase();
            if (k === "w" || e.code === "KeyW") this.rawKeys.w = true;
            if (k === "a" || e.code === "KeyA") this.rawKeys.a = true;
            if (k === "s" || e.code === "KeyS") this.rawKeys.s = true;
            if (k === "d" || e.code === "KeyD") this.rawKeys.d = true;
            if (e.key === "ArrowUp") this.rawKeys.up = true;
            if (e.key === "ArrowDown") this.rawKeys.down = true;
            if (e.key === "ArrowLeft") this.rawKeys.left = true;
            if (e.key === "ArrowRight") this.rawKeys.right = true;
            if (e.key === "Shift") this.rawKeys.shift = true;
        });

        window.addEventListener("keyup", (e) => {
            const k = e.key.toLowerCase();
            if (k === "w" || e.code === "KeyW") this.rawKeys.w = false;
            if (k === "a" || e.code === "KeyA") this.rawKeys.a = false;
            if (k === "s" || e.code === "KeyS") this.rawKeys.s = false;
            if (k === "d" || e.code === "KeyD") this.rawKeys.d = false;
            if (e.key === "ArrowUp") this.rawKeys.up = false;
            if (e.key === "ArrowDown") this.rawKeys.down = false;
            if (e.key === "ArrowLeft") this.rawKeys.left = false;
            if (e.key === "ArrowRight") this.rawKeys.right = false;
            if (e.key === "Shift") this.rawKeys.shift = false;
        });

        // Configuração inicial de profundidade e escala
        this.updateDepthAndScale();
    }


    /* =====================================
       AMBIENTE COM PROFUNDIDADE 2.5D
    ===================================== */

    createEnvironment() {
        // Parede de fundo
        this.add.rectangle(
            WORLD_WIDTH / 2, 180,
            WORLD_WIDTH, 360,
            0x30282b
        ).setDepth(0);

        // Textura do papel de parede
        const wallpaper = this.add.graphics();
        wallpaper.lineStyle(1, 0x493b3d, 0.65);
        for (let x = 0; x < WORLD_WIDTH; x += 32) {
            wallpaper.lineBetween(x, 12, x, 235);
        }
        wallpaper.setDepth(1);

        // Rodapé
        this.add.rectangle(
            WORLD_WIDTH / 2, 238,
            WORLD_WIDTH, 5,
            0x796052
        ).setDepth(2);

        // Chão de tábuas
        this.add.rectangle(
            WORLD_WIDTH / 2, 300,
            WORLD_WIDTH, 120,
            0x59453d
        ).setDepth(2);

        // Linhas de perspectiva no piso de madeira
        const floorLines = this.add.graphics();
        floorLines.lineStyle(1, 0x4b3932, 0.45);
        for (let y = 265; y < 360; y += 22) {
            floorLines.lineBetween(0, y, WORLD_WIDTH, y);
        }
        floorLines.setDepth(3);

        // Janela
        this.add.rectangle(205, 115, 100, 112, 0x1c2532).setDepth(4);
        this.add.rectangle(205, 115, 88, 100, 0x293747).setDepth(5);

        // Moldura da janela
        const frame = this.add.graphics();
        frame.lineStyle(4, 0x765e50);
        frame.strokeRect(155, 59, 100, 112);
        frame.lineBetween(205, 59, 205, 171);
        frame.lineBetween(155, 115, 255, 115);
        frame.setDepth(6);

        // Sofá (posicionado para permitir passagem atrás e na frente)
        // Encosto
        const sofaBack = this.add.rectangle(365, 240, 118, 22, 0x795862);
        sofaBack.setDepth(270);
        // Assento
        const sofaSeat = this.add.rectangle(365, 268, 118, 36, 0x624650);
        sofaSeat.setDepth(272);

        // Colisor físico do assento do sofá
        this.sofaCollider = this.add.rectangle(
            365, 272,
            114, 26,
            0xffffff,
            0
        );
        this.physics.add.existing(this.sofaCollider, true);

        this.createBookshelf();

        // Objeto em primeiro plano
        this.add.rectangle(
            605, 332,
            170, 36,
            0x292126
        ).setDepth(335);

        this.fgCollider = this.add.rectangle(
            605, 344,
            170, 18,
            0xffffff,
            0
        );
        this.physics.add.existing(this.fgCollider, true);
    }


    /* =====================================
       ESTANTE
    ===================================== */

    createBookshelf() {
        const shelfBase = this.add.rectangle(505, 190, 100, 142, 0x4b352d);
        shelfBase.setDepth(246);

        const shelf = this.add.graphics();
        shelf.fillStyle(0x806044);
        shelf.fillRect(455, 145, 100, 5);
        shelf.fillRect(455, 190, 100, 5);
        shelf.fillRect(455, 235, 100, 5);

        const colors = [
            0x843e3d, 0x3d5962, 0x907448,
            0x4e6047, 0x65496a, 0x9b8060
        ];

        colors.forEach((color, i) => {
            shelf.fillStyle(color);
            shelf.fillRect(462 + i * 14, 151, 10, 37);
            shelf.fillRect(462 + i * 14, 196, 10, 37);
        });

        shelf.setDepth(247);

        // Caderno artesanal
        this.add.rectangle(530, 216, 18, 30, 0x9c8060).setDepth(248);
        this.add.rectangle(530, 216, 14, 26, 0x47342e).setDepth(249);

        // Colisor da estante junto à parede
        this.shelfCollider = this.add.rectangle(
            505, 245,
            98, 14,
            0xffffff,
            0
        );
        this.physics.add.existing(this.shelfCollider, true);
    }


    /* =====================================
       COLISORES SEGUROS
    ===================================== */

    setupColliders() {
        if (!this.arthur) return;
        if (this.sofaCollider) this.physics.add.collider(this.arthur, this.sofaCollider);
        if (this.shelfCollider) this.physics.add.collider(this.arthur, this.shelfCollider);
        if (this.fgCollider) this.physics.add.collider(this.arthur, this.fgCollider);
    }


    /* =====================================
       INTERAÇÕES
    ===================================== */

    createInteractions() {
        this.objects = [
            {
                x: 205,
                y: 252,
                promptY: 215,
                name: "Examinar a janela",
                description:
                    "A janela está trancada. Do lado de fora, só há escuridão."
            },
            {
                x: 365,
                y: 298,
                promptY: 235,
                name: "Examinar o sofá",
                description:
                    "Uma manta foi dobrada cuidadosamente. Parece que alguém esperava que você se acomodasse."
            },
            {
                x: 505,
                y: 256,
                promptY: 200,
                name: "Examinar o caderno",
                description:
                    "Entre livros de mitologias diferentes, há um caderno artesanal. A capa parece ter sido manuseada muitas vezes."
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
                fontSize: "11px",
                color: "#f1e5d5",
                backgroundColor: "#211a20",
                padding: { x: 7, y: 4 }
            }
        );
        this.prompt.setOrigin(0.5, 1).setDepth(1000).setVisible(false);

        this.dialogue = this.add.text(
            20, 296,
            "",
            {
                fontFamily: "monospace",
                fontSize: "12px",
                lineSpacing: 4,
                color: "#f1e5d5",
                backgroundColor: "#131015",
                padding: { x: 12, y: 10 },
                wordWrap: { width: 600 }
            }
        );
        this.dialogue.setScrollFactor(0).setDepth(2000).setVisible(false);

        this.input.keyboard.on("keydown-E", () => this.interact());
    }


    /* =====================================
       LOOP DE ATUALIZAÇÃO
    ===================================== */

    update() {
        this.updateMovement();
        this.updateDepthAndScale();
        this.updateInteractions();
    }


    /* =====================================
       MOVIMENTAÇÃO 2.5D (ESTILO LITTLE MISFORTUNE)
    ===================================== */

    updateMovement() {
        /*
         * PAUSA DURANTE DIÁLOGO
         * ---------------------
         * Quando uma interação está aberta, o Arthur reduz a velocidade com
         * atrito suave, para não parar abruptamente, e volta ao idle.
         */
        if (this.isDialogueActive) {
            this.arthur.setVelocity(
                Phaser.Math.Linear(this.arthur.body.velocity.x, 0, DRAG_RATE),
                Phaser.Math.Linear(this.arthur.body.velocity.y, 0, DRAG_RATE)
            );
            this.arthur.setAngle(
                Phaser.Math.Linear(this.arthur.angle, 0, 0.15)
            );
            if (this.arthur.anims.currentAnim?.key !== "arthur_idle") {
                this.arthur.play("arthur_idle", true);
            }
            return;
        }

        /*
         * ENTRADAS DE MOVIMENTO
         * ---------------------
         * Existem duas fontes de controle:
         * 1. teclas conhecidas pelo sistema Phaser;
         * 2. fallback nativo do navegador, usado enquanto o canvas mantém foco.
         *
         * Os dois grupos são combinados com OR, evitando que o movimento pare
         * caso uma das APIs não capture o evento em determinado navegador.
         */
        const left = (this.keys.left && this.keys.left.isDown) ||
                     (this.keys.a && this.keys.a.isDown) ||
                     this.rawKeys.left || this.rawKeys.a;

        const right = (this.keys.right && this.keys.right.isDown) ||
                      (this.keys.d && this.keys.d.isDown) ||
                      this.rawKeys.right || this.rawKeys.d;

        const up = (this.keys.up && this.keys.up.isDown) ||
                   (this.keys.w && this.keys.w.isDown) ||
                   this.rawKeys.up || this.rawKeys.w;

        const down = (this.keys.down && this.keys.down.isDown) ||
                     (this.keys.s && this.keys.s.isDown) ||
                     this.rawKeys.down || this.rawKeys.s;

        const isRunning = (this.keys.shift && this.keys.shift.isDown) || this.rawKeys.shift;

        let dirX = 0;
        let dirY = 0;

        if (left && !right) dirX = -1;
        else if (right && !left) dirX = 1;

        if (up && !down) dirY = -1;
        else if (down && !up) dirY = 1;

        /*
         * NORMALIZAÇÃO DIAGONAL
         * ---------------------
         * Em movimento diagonal, cada eixo recebe 70,71% da velocidade. Sem
         * isso, andar na diagonal seria aproximadamente 41% mais rápido.
         */
        if (dirX !== 0 && dirY !== 0) {
            dirX *= 0.7071;
            dirY *= 0.7071;
        }

        const maxSpeedX = isRunning ? RUN_SPEED_X : WALK_SPEED_X;
        const maxSpeedY = isRunning ? RUN_SPEED_Y : WALK_SPEED_Y;

        const targetVx = dirX * maxSpeedX;
        const targetVy = dirY * maxSpeedY;

        // Inércia suave em ambos os eixos
        const currentVx = this.arthur.body.velocity.x;
        const currentVy = this.arthur.body.velocity.y;

        const rateX = targetVx !== 0 ? ACCEL_RATE : DRAG_RATE;
        const rateY = targetVy !== 0 ? ACCEL_RATE : DRAG_RATE;

        const newVx = Phaser.Math.Linear(currentVx, targetVx, rateX);
        const newVy = Phaser.Math.Linear(currentVy, targetVy, rateY);

        this.arthur.setVelocityX(Math.abs(newVx) < 1.5 && targetVx === 0 ? 0 : newVx);
        this.arthur.setVelocityY(Math.abs(newVy) < 1.5 && targetVy === 0 ? 0 : newVy);

        // Clamping aos limites do piso
        if (this.arthur.y < MIN_Y) {
            this.arthur.setY(MIN_Y);
            if (this.arthur.body.velocity.y < 0) {
                this.arthur.setVelocityY(0);
            }
        } else if (this.arthur.y > MAX_Y) {
            this.arthur.setY(MAX_Y);
            if (this.arthur.body.velocity.y > 0) {
                this.arthur.setVelocityY(0);
            }
        }

        /*
         * DIREÇÃO HORIZONTAL DA ARTE
         * --------------------------
         * Os PNGs originais já foram desenhados olhando para a ESQUERDA.
         * Portanto, andar pela esquerda mantém flipX=false. Ao andar para
         * a direita, flipX=true espelha toda a imagem no eixo horizontal.
         *
         * Todos os elementos associados ao personagem usam esse mesmo sinal:
         * inclinação corporal, look-ahead da câmera e partículas dos passos.
         */
        if (dirX < 0) {
            this.arthur.setFlipX(false);
        } else if (dirX > 0) {
            this.arthur.setFlipX(true);
        }

        const totalSpeed = Math.hypot(this.arthur.body.velocity.x, this.arthur.body.velocity.y);
        let targetAngle = 0;

        // Animação e inclinação corporal
        if (totalSpeed > 10) {
            if (isRunning && totalSpeed > WALK_SPEED_X * 0.85) {
                if (this.arthur.anims.currentAnim?.key !== "arthur_run") {
                    this.arthur.play("arthur_run", true);
                }
                targetAngle = this.arthur.flipX ? 3.5 : -3.5;
            } else {
                if (this.arthur.anims.currentAnim?.key !== "arthur_walk") {
                    this.arthur.play("arthur_walk", true);
                }
                targetAngle = this.arthur.flipX ? 1.2 : -1.2;
            }

            // Partículas de poeira nos passos
            this.stepAccumulator += totalSpeed;
            const stepThreshold = isRunning ? 55 : 85;
            if (this.stepAccumulator >= stepThreshold) {
                this.emitStepDust();
                this.stepAccumulator = 0;
            }
        } else {
            if (this.arthur.anims.currentAnim?.key !== "arthur_idle") {
                this.arthur.play("arthur_idle", true);
            }
            targetAngle = 0;
            this.stepAccumulator = 0;
        }

        this.arthur.setAngle(
            Phaser.Math.Linear(this.arthur.angle, targetAngle, 0.15)
        );

        // Look-ahead dinâmico da câmera
        const lookAheadTarget = this.arthur.flipX ? -45 : 45;
        this.cameraLookAheadX = Phaser.Math.Linear(
            this.cameraLookAheadX,
            lookAheadTarget,
            0.04
        );
        this.cameras.main.setFollowOffset(this.cameraLookAheadX, 0);
    }


    /* =====================================
       PROFUNDIDADE (Y-SORT) E ESCALA PERSPECTIVA
    ===================================== */

    updateDepthAndScale() {
        /*
         * Y-SORT E ESCALA PERSPECTIVA
         * ---------------------------
         * Quanto maior a coordenada Y, mais próximo o Arthur está da câmera.
         * O depth usa essa posição para garantir que objetos e personagens com
         * Y menor sejam desenhados atrás; já a escala cresce suavemente para
         * que o personagem pareça se aproximar ao descer pela sala.
         */
        const dynamicDepth = Math.round(this.arthur.y);
        this.arthur.setDepth(dynamicDepth);

        const depthT = Phaser.Math.Clamp((this.arthur.y - MIN_Y) / (MAX_Y - MIN_Y), 0, 1);
        const targetScale = Phaser.Math.Linear(
            ARTHUR_SCALE_BACK,
            ARTHUR_SCALE_FRONT,
            depthT
        );

        // Preservar o flipX ao atualizar a escala. setScale altera apenas o
        // tamanho visual; flipX continua responsável pela direção da imagem.
        if (Math.abs(Math.abs(this.arthur.scaleX) - targetScale) > 0.005 ||
            Math.abs(this.arthur.scaleY - targetScale) > 0.005) {
            this.arthur.setScale(targetScale, targetScale);
        }

        // O sprite mede 96 px de largura e os pés ocupam quase toda essa largura.
        // A sombra usa uma escala maior que a elipse antiga, mantendo-se no
        // mesmo eixo dos pés mesmo quando o personagem vira ou muda de tamanho.
        this.shadow.setPosition(this.arthur.x, this.arthur.y - 6);
        this.shadow.setScale(
            targetScale * ARTHUR_SHADOW_SCALE_X,
            targetScale * ARTHUR_SHADOW_SCALE_Y
        );
        this.shadow.setDepth(dynamicDepth - 1);
    }


    /* =====================================
       PARTÍCULAS DE PASSO
    ===================================== */

    emitStepDust() {
        const dustOffsetX = this.arthur.flipX ? -5 : 5;
        const dust = this.add.image(
            this.arthur.x + dustOffsetX,
            this.arthur.y - 1,
            "dust_particle"
        );
        dust.setDepth(this.arthur.depth - 1);
        dust.setAlpha(0.65);

        this.tweens.add({
            targets: dust,
            y: dust.y - 3,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 260,
            ease: "Quad.easeOut",
            onComplete: () => dust.destroy()
        });
    }


    /* =====================================
       INTERAÇÕES DE OBJETOS
    ===================================== */

    updateInteractions() {
        if (this.isDialogueActive) {
            this.prompt.setVisible(false);
            return;
        }

        this.nearbyObject = null;
        let closest = 62;

        for (const object of this.objects) {
            const distance = Phaser.Math.Distance.Between(
                this.arthur.x,
                this.arthur.y,
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
                .setText(`[E] ${this.nearbyObject.name}`)
                .setPosition(
                    this.nearbyObject.x,
                    this.nearbyObject.promptY || this.nearbyObject.y - 45
                )
                .setVisible(true);
        } else {
            this.prompt.setVisible(false);
        }
    }


    /* =====================================
       SISTEMA DE DIÁLOGO
    ===================================== */

    interact() {
        if (this.isDialogueActive) {
            this.closeDialogue();
            return;
        }

        if (!this.nearbyObject) return;

        this.isDialogueActive = true;
        this.prompt.setVisible(false);

        this.dialogue
            .setText(`${this.nearbyObject.description}\n\n[E] Continuar`)
            .setVisible(true);

        if (this.dialogueTimer) {
            this.dialogueTimer.remove();
        }

        this.dialogueTimer = this.time.delayedCall(5000, () => {
            this.closeDialogue();
        });
    }

    closeDialogue() {
        this.isDialogueActive = false;
        this.dialogue.setVisible(false);

        if (this.dialogueTimer) {
            this.dialogueTimer.remove();
            this.dialogueTimer = null;
        }
    }

}


/* =========================================
   CONFIGURAÇÃO DO JOGO
======================================== */

const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#171319",
    pixelArt: false,
    roundPixels:true,
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
