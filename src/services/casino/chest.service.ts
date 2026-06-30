import { container } from '@sapphire/framework';
import { ActiveMineGame, MineTurnResult, Tile } from '../../models/casino/MineGame.interface';
import { MessageFlags } from 'discord.js';
import { ChestMessageBuilder } from '../../builders/casino/ChestMessage.builder';

export class ChestService {
	private activeGames: Map<string, ActiveMineGame> = new Map();

	public generateGrid(): Tile[] {
		const grid: Tile[] = [];
		const BOMB_COUNT = 5;

		for (let i = 0; i < BOMB_COUNT; i++) grid.push({ type: 'BOMB' });

		const lootPools = [
			[1.2, 1.5, 1.5, 2.0],
			[1.5, 2.0, 2.0, 3.0],
			[2.0, 3.0, 4.0, 5.0],
			[1.5, 1.5, 2.0, 3.0, 5.0, 10.0]
		];

		const selectedPool = lootPools[Math.floor(Math.random() * lootPools.length)];
		for (const multiValue of selectedPool) grid.push({ type: 'MULTI', value: multiValue });

		const remainingTiles = 25 - grid.length;
		for (let i = 0; i < remainingTiles; i++) grid.push({ type: 'EMPTY' });

		return this.shuffleArray(grid);
	}

	public registerGame(messageId: string, channelId: string, userId: string, bet: number, grid: Tile[]): ActiveMineGame {
		const newGame: ActiveMineGame = {
			messageId,
			channelId,
			userId,
			bet,
			currentMultiplier: 1.0,
			grid,
			revealed: [],
			status: 'PLAYING',
			timer: this.startTimer(messageId) // Démarrage du timer
		};

		this.activeGames.set(messageId, newGame);
		return newGame;
	}

	public getGame(messageId: string): ActiveMineGame | undefined {
		return this.activeGames.get(messageId);
	}

	/**
	 * Gère un tour : clic sur une case ou encaisser
	 */
	public async playTurn(messageId: string, userId: string, action: number | 'cashout'): Promise<MineTurnResult> {
		const game = this.getGame(messageId);

		if (!game) return { status: 'error', message: 'Partie expirée.' };
		if (game.userId !== userId) return { status: 'error', message: "Ce n'est pas votre partie !" };

		clearTimeout(game.timer); // Reset du timer

		// 1. Le joueur décide d'encaisser
		if (action === 'cashout') {
			return this.processEndGame(game, 'cashout');
		}

		const tileIndex = action as number;
		const tile = game.grid[tileIndex];

		game.revealed.push(tileIndex);

		// 2. Le joueur touche une bombe -> Perdu
		if (tile.type === 'BOMB') {
			return this.processEndGame(game, 'lose');
		}

		// 3. Le joueur trouve un multiplicateur -> On met à jour
		if (tile.type === 'MULTI' && tile.value) {
			game.currentMultiplier *= tile.value;
		}

		// 4. On vérifie s'il a trouvé TOUS les multiplicateurs
		const totalMultis = game.grid.filter((t) => t.type === 'MULTI').length;
		const revealedMultis = game.revealed.filter((index) => game.grid[index].type === 'MULTI').length;

		if (revealedMultis === totalMultis) {
			return this.processEndGame(game, 'win'); // Victoire totale !
		}

		// 5. La partie continue, on relance le timer de 60s
		game.timer = this.startTimer(messageId);
		this.activeGames.set(messageId, game);

		return { status: 'continue', game };
	}

	private async processEndGame(game: ActiveMineGame, reason: 'win' | 'lose' | 'cashout' | 'timeout'): Promise<MineTurnResult> {
		this.activeGames.delete(game.messageId);

		let payout = 0;

		if (reason === 'win' || reason === 'cashout') {
			game.status = 'WON';
			payout = Math.floor(game.bet * game.currentMultiplier);
			await container.casinoService.transaction(game.userId, payout, 'add');
		} else if (reason === 'timeout') {
			game.status = 'TIMEOUT';
			// Choix de game design : Tu peux choisir de rembourser ou de faire perdre la mise en cas de timeout.
			// Ici on rembourse la mise initiale.
			await container.casinoService.transaction(game.userId, game.bet, 'add');
		} else {
			game.status = 'LOST';
		}

		if (reason !== 'timeout') {
			container.casinoService.logGame(game.userId, 'mine', game.bet, payout, { reason, multiplier: game.currentMultiplier });
		}

		return { status: reason, game, payout };
	}

	private startTimer(messageId: string): NodeJS.Timeout {
		return setTimeout(() => {
			this.handleTimeout(messageId);
		}, 60_000); // 60 secondes
	}

	private async handleTimeout(messageId: string) {
		const game = this.activeGames.get(messageId);
		if (!game) return;

		// On termine la partie avec la raison 'timeout'
		const result = await this.processEndGame(game, 'timeout');

		try {
			const channel = await container.client.channels.fetch(game.channelId);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch(messageId);

				// On met à jour l'affichage avec le statut TIMEOUT
				const payload = ChestMessageBuilder.build(result.game!);
				if (message) {
					await message.edit({
						components: payload.components,
						flags: MessageFlags.IsComponentsV2
					});
				}
			}
		} catch (e) {
			console.error('Erreur Timeout MineGame:', e);
		}
	}

	private shuffleArray<T>(array: T[]): T[] {
		const newArray = [...array];
		for (let i = newArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[newArray[i], newArray[j]] = [newArray[j], newArray[i]];
		}
		return newArray;
	}
}
