
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
const WALK_SPEED_X = 96;     // Caminhada horizontal
const WALK_SPEED_Y = 64;     // Caminhada em profundidade (~66% da horizontal para perspectiva 2.5D)
const RUN_SPEED_X = 180;     // Corrida horizontal (Shift)
const RUN_SPEED_Y = 118;     // Corrida em profundidade (Shift)

const ACCEL_RATE = 0.16;     // Inércia de aceleração
const DRAG_RATE = 0.20;      // Desaceleração suave ao soltar

// Escala visual do Arthur em relação à imagem original de 96 x 128 px.
// A arte fica maior ao chegar à frente da sala e menor perto da parede,
// preservando a proporção típica de uma vista 2.5D.
const ARTHUR_SCALE_BACK = 0.66;
const ARTHUR_SCALE_FRONT = 0.82;
const ARTHUR_INITIAL_SCALE = 0.72;

// Hitbox em coordenadas locais da textura original. Ela é pequena apenas
// na região dos pés, onde o personagem deve colidir com móveis e limites.
const ARTHUR_HITBOX_WIDTH = 44;
const ARTHUR_HITBOX_HEIGHT = 16;
const ARTHUR_HITBOX_OFFSET_X = 26;
const ARTHUR_HITBOX_OFFSET_Y = 112;


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

        // 1. Texturas procedurais
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
       TEXTURES & ANIMAÇÕES (PROCEDURAL 2.5D)
       Paleta fiel ao Arthur_OlhoAberto.png
       Os frames originais de Arthur estão voltados para a ESQUERDA.
       flipX=true aponta o personagem para a DIREITA.
       Personalidade: postura curvada, mão no bolso, cabelo espetado
    ===================================== */

    createTextures() {
        // Paleta extraída de Arthur_OlhoAberto.png
        const C = {
            hair:      0xb27343,
            hairD:     0x7d4722,
            hairL:     0xca8b59,
            hairOut:   0x1e0e06,
            skin:      0xd8ad8e,
            skinD:     0xb08365,
            brow:      0x1e0f07,
            eyeW:      0xe8ddd6,
            eyeI:      0x583216,
            eyeP:      0x180c05,
            nose:      0x5e361d,
            mouth:     0x341b0d,
            coat:      0x210b4d,
            coatD:     0x120530,
            coatH:     0x35186e,
            coatC:     0x43208a,
            shirt:     0x766666,
            shirtD:    0x5a4d4d,
            btn:       0x1a1218,
            jeans:     0x224487,
            jeansD:    0x142954,
            jeansL:    0x2e56a3,
            boot:      0x2a0001,
            bootD:     0x120001
        };

        // ================================================================
        // drawFrame: 36x68 px, voltado para a DIREITA por padrão.
        // Personalidade: postura curvada, mão no bolso, cabelo espetado.
        // ================================================================
        const drawFrame = (key, cfg) => {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const by = cfg.by || 0;

            const r = (x, y, w, h, col) => { g.fillStyle(col); g.fillRect(x, y, w, h); };
            const p = (x, y, col)       => { g.fillStyle(col); g.fillRect(x, y, 1, 1); };

            // 1. CAPUZ TRASEIRO (atrás e à esquerda)
            r(1, by+22, 11, 12, C.coatH);
            r(0, by+24,  4,  9, C.coatD);

            // 2. CABELO TRASEIRO
            r(3, by+ 9,  5, 5, C.hairD);
            r(1, by+ 7,  5, 4, C.hair);
            r(0, by+ 5,  4, 3, C.hairD);

            // 3. TOPO ESPETADO (tufos pontiagudos indo para a direita)
            r(6,  by+2,  3, 3, C.hair);  p(7,  by+1, C.hairL); p(7,  by+0, C.hairL);
            r(10, by+1,  4, 4, C.hair);  p(11, by+0, C.hairL); p(12, by+0, C.hairL);
            r(14, by+0,  4, 5, C.hair);  r(15, by+0, 2, 1, C.hairL);
            r(18, by+1,  5, 5, C.hair);  p(20, by+1, C.hairL);
            r(22, by+3,  4, 4, C.hair);  p(23, by+3, C.hairL);

            // 4. MASSA PRINCIPAL DO CABELO
            r(5,  by+4, 22, 9, C.hair);
            r(5,  by+5,  4, 8, C.hairD);
            r(23, by+5,  5, 7, C.hairD);

            // 5. FRANJA CAINDO (mecha longa sobre o nariz, marca registrada)
            r(16, by+ 7,  5, 6, C.hair);
            r(21, by+ 7,  5, 5, C.hairD);
            r(17, by+11,  3, 7, C.hair);
            r(18, by+13,  2, 5, C.hairD);
            p(18, by+18, C.hairD);

            // 6. ROSTO (voltado para a DIREITA)
            r(10, by+ 9, 18, 14, C.skin);
            // orelha (à esquerda do rosto)
            r(8,  by+13,  3,  5, C.skin);
            r(7,  by+14,  2,  4, C.skinD);
            // queixo
            r(13, by+21, 10,  3, C.skin);
            r(14, by+22,  8,  2, C.skinD);

            // 7. OLHOS EXPRESSIVOS / CAÍDOS
            // Sobrancelhas pesadas
            r(14, by+13,  5, 2, C.brow);
            r(21, by+12,  6, 2, C.brow);
            p(14, by+15, C.brow); p(21, by+14, C.brow);

            // Olho esquerdo (parcialmente encoberto pela franja)
            r(15, by+15,  3, 3, C.eyeW);
            r(16, by+15,  2, 3, C.eyeI);
            p(16, by+16, C.eyeP);

            // Olho direito (maior, expressivo, brilho)
            r(22, by+14,  5, 3, C.eyeW);
            r(23, by+14,  3, 3, C.eyeI);
            r(24, by+15,  2, 2, C.eyeP);
            p(22, by+14, 0xffffff);

            // Nariz e boca melancólica
            r(22, by+17,  1, 4, C.nose);
            p(21, by+20, C.nose);
            r(19, by+22,  4, 1, C.mouth);
            p(18, by+22, C.mouth);

            // 8. GOLA CAPUZ E CORDÕES
            r(10, by+23, 18, 4, C.coatH);
            r(10, by+25, 18, 3, C.coat);
            r(17, by+26,  1, 7, C.coatD);
            r(20, by+26,  1, 7, C.coatD);

            // 9. TORSO DO CASACO (postura curvada)
            r(8,  by+27, 22, 21, C.coat);
            r(6,  by+29,  3, 17, C.coatD);
            r(7,  by+28,  2, 18, C.coat);

            // Camisa interna com botões
            r(17, by+27,  7, 20, C.shirt);
            r(16, by+27,  1, 20, C.shirtD);
            r(24, by+27,  1, 20, C.shirtD);
            r(20, by+29,  2,  2, C.btn);
            r(20, by+33,  2,  2, C.btn);
            r(20, by+37,  2,  2, C.btn);
            r(20, by+41,  2,  2, C.btn);

            // Dobras de tecido (personalidade)
            r(9,  by+36,  7, 2, C.coatD);
            r(10, by+43,  6, 2, C.coatD);

            // 10. BRAÇO ESQUERDO (traseiro)
            r(7,  by+29,  4, 15, C.coatD);
            r(7,  by+43,  4,  3, C.coatC);
            r(7,  by+46,  4,  4, C.skinD);

            // 11. BRAÇO DIREITO (da frente, MÃO NO BOLSO)
            const arx = cfg.arm_r_x || 26;
            r(arx,   by+29, 6, 15, C.coat);
            r(arx+4, by+31, 2, 12, C.coatD);
            r(arx,   by+43, 6,  3, C.coatC);
            p(arx+4, by+45, C.btn);
            r(arx+1, by+46, 4,  3, C.skin);
            r(arx+2, by+48, 2,  1, C.skinD);

            // 12. CÓS + CALÇA JEANS
            r(10, 46, 18, 5, C.jeans);
            r(10, 47,  3, 4, C.jeansD);

            // Perna esquerda
            const lx=cfg.lx||10, ly=cfg.ly||49, lw=cfg.lw||8, lh=cfg.lh||19;
            r(lx, ly, lw, lh, C.jeans);
            r(lx, ly+3, 2, lh-4, C.jeansD);
            r(lx+2, ly+2, Math.max(1,lw-4), lh-4, C.jeansL);
            r(lx, ly+lh-3, lw, 3, C.jeansD);

            // Perna direita
            const rx=cfg.rx||19, ry=cfg.ry||49, rw=cfg.rw||9, rh=cfg.rh||19;
            r(rx, ry, rw, rh, C.jeans);
            r(rx+1, ry+2, Math.max(1,rw-4), rh-4, C.jeansL);
            r(rx+Math.max(1,rw-2), ry+3, 2, rh-4, C.jeansD);
            r(rx, ry+rh-3, rw, 3, C.jeansD);

            r(18, 50, 2, 15, C.jeansD); // divisão central

            // 13. BOTAS BORDÔ
            const slx=cfg.slx||7, sly=cfg.sly||60, slw=cfg.slw||10;
            r(slx,   sly,   slw, 5, C.boot);
            r(slx-1, sly+2,  3,  4, C.boot);
            r(slx-1, sly+5, slw+2, 2, C.bootD);

            const srx=cfg.srx||19, sry=cfg.sry||60, srw=cfg.srw||12;
            r(srx,   sry,   srw, 5, C.boot);
            r(srx+srw-1, sry+1, 3, 4, C.boot);
            r(srx, sry+5, srw+3, 2, C.bootD);

            g.generateTexture(key, 36, 68);
            g.destroy();
        };

        // Frame 0: Idle Neutro
        drawFrame("arthur_idle_0", {
            by:0, arm_r_x:26,
            lx:10,ly:49,lw:8,lh:18, rx:19,ry:49,rw:9,rh:18,
            slx:7,sly:60,slw:10,    srx:20,sry:60,srw:12
        });

        // Frame 1: Idle Respiração (tronco sobe 1px)
        drawFrame("arthur_idle_1", {
            by:-1, arm_r_x:26,
            lx:10,ly:49,lw:8,lh:18, rx:19,ry:49,rw:9,rh:18,
            slx:7,sly:60,slw:10,    srx:20,sry:60,srw:12
        });

        // Frame 2: Walk Passo 1 (perna direita avança)
        drawFrame("arthur_walk_0", {
            by:0, arm_r_x:27,
            lx:8, ly:50,lw:8,lh:16, rx:20,ry:48,rw:10,rh:19,
            slx:5,sly:59,slw:10,    srx:22,sry:60,srw:12
        });

        // Frame 3: Walk Passagem 1
        drawFrame("arthur_walk_1", {
            by:-1, arm_r_x:26,
            lx:12,ly:49,lw:7,lh:18, rx:18,ry:49,rw:8,rh:18,
            slx:10,sly:60,slw:9,    srx:19,sry:60,srw:11
        });

        // Frame 4: Walk Passo 2 (perna esquerda avança)
        drawFrame("arthur_walk_2", {
            by:0, arm_r_x:25,
            lx:14,ly:48,lw:10,lh:19, rx:18,ry:50,rw:8,rh:16,
            slx:14,sly:60,slw:12,    srx:20,sry:59,srw:10
        });

        // Frame 5: Walk Passagem 2
        drawFrame("arthur_walk_3", {
            by:-1, arm_r_x:26,
            lx:13,ly:49,lw:7,lh:18, rx:18,ry:49,rw:8,rh:18,
            slx:11,sly:60,slw:10,   srx:19,sry:60,srw:11
        });

        // Sombra elíptica sob os pés
        const shadowG = this.make.graphics({ x: 0, y: 0, add: false });
        shadowG.fillStyle(0x0e0c10, 0.45);
        shadowG.fillEllipse(13, 5, 13, 5);
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
            frameRate: 1.5,
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
            frameRate: 8,
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
         * A escala inicial de 0.72 transforma a textura de 128 px em cerca de
         * 92 px visuais, deixando o Arthur compatível com a estante, janela
         * e demais elementos do cenário.
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

        // A sombra acompanha exatamente os pés e também recebe uma pequena
        // ampliação para parecer mais larga que o personagem em perspectiva.
        this.shadow.setPosition(this.arthur.x, this.arthur.y);
        this.shadow.setScale(
            this.arthur.scaleX * 1.5,
            this.arthur.scaleY * 1.5
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
